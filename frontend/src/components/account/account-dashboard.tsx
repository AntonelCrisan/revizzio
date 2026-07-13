"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type DragEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { GeneratedContentDisclaimer } from "@/components/legal/generated-content-disclaimer";
import {
  archiveStudyProject,
  completeQuiz,
  createManualStudyProjectFlashcard,
  createQuizMistakeFlashcard,
  createSummaryHighlight,
  createSummaryNote,
  deleteStudyProject,
  deleteSummaryHighlight,
  deleteSummaryNote,
  importStudyProjectJson,
  listStudyProjects,
  prepareStudyProject,
  renameStudyProject,
  setFlashcardReview,
  updateSummaryHighlightColor,
  updateSummaryNote,
  type StudyProject as ApiStudyProject,
  type StudyProjectPrepareResponse,
  type SummaryHighlightColor as ApiSummaryHighlightColor,
} from "@/lib/projects-api";

type ViewId = "home" | "project" | "new";
export type TabId =
  | "rezumat"
  | "flashcards"
  | "quiz"
  | "strategii"
  | "progres"
  | "chat";
export type FlashcardPanelMode = "packages" | "create";
type GenerationState = "form" | "generating" | "done";
type SidebarGroupId = "settings" | "billing";
type StudyFlashcardTone = "success" | "warning" | "info" | "danger";

type StudyFlashcardCard = {
  id: string;
  flashcardId: string;
  topic: string;
  question: string;
  answer: string;
  tone: StudyFlashcardTone;
  sourceQuestionId?: string;
  questionImage?: string;
  category?: string;
  difficulty?: string;
  review: boolean;
};

type StudyProject = {
  id: string;
  name: string;
  subjectName: string;
  institutionName: string;
  isArchived: boolean;
  archivedAt: string | null;
  meta: string;
  flashcardsDue: number;
  flashcardsTotal: number;
  progress: number;
  summary: ApiStudyProject["summary"];
  keywords: ApiStudyProject["keywords"];
  flashcards: ApiStudyProject["flashcards"];
  quizzes: ApiStudyProject["quizzes"];
  quizMistakeFlashcards: StudyFlashcardCard[];
  manualFlashcards: StudyFlashcardCard[];
  summaryHighlights: UserSummaryHighlight[];
  summaryNotes: UserSummaryNote[];
  strategies: Array<{
    title: string;
    description: string;
  }>;
};

type UploadedFile = {
  name: string;
  size: number;
  file: File;
};

const initialProjects: StudyProject[] = [];
const SIDEBAR_COLLAPSED_STORAGE_KEY = "revizzio-sidebar-collapsed";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "rezumat", label: "Rezumat" },
  { id: "flashcards", label: "Flashcard-uri" },
  { id: "quiz", label: "Quiz-uri" },
  { id: "strategii", label: "Strategii" },
  { id: "progres", label: "Progres" },
  { id: "chat", label: "Chat AI" },
];

const tabRoutes: Record<TabId, string> = {
  rezumat: "/myaccount/rezumat",
  flashcards: "/myaccount/flashcarduri",
  quiz: "/myaccount/quizuri",
  strategii: "/myaccount/strategii",
  progres: "/myaccount/progres",
  chat: "/myaccount/chat-ai",
};

const sidebarSettingsItems = [
  { href: "/settings#account", label: "Cont" },
  { href: "/settings#study", label: "Studiu" },
  { href: "/settings#appearance", label: "Aspect" },
  { href: "/settings#colors", label: "Culori" },
  { href: "/settings#notifications", label: "Notificări" },
  { href: "/settings#security", label: "Securitate" },
  { href: "/settings#privacy", label: "Date" },
];

const sidebarBillingItems = [
  { href: "/upgrade", label: "Planuri" },
  { href: "/upgrade/facturi", label: "Facturi" },
];

const generationSteps = [
  "Încărcare materiale",
  "Conversie Markdown",
  "Fișier prompt",
  "Pregătit pentru ChatGPT",
];

function Icon({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      {children}
    </svg>
  );
}

function Logo() {
  return (
    <BrandLogo
      href="/"
      className="text-content transition hover:text-action"
      logoClassName="h-7 w-28"
    />
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return slug || `proiect-${Date.now()}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join("") || "EQ";
}

function getProjectById(projects: StudyProject[], projectId?: string) {
  return projects.find((project) => project.id === projectId) ?? projects[0];
}

function apiProjectStatusLabel(status: ApiStudyProject["status"]) {
  if (status === "ready") return "gata";
  if (status === "awaiting_ai_json") return "așteaptă JSON";
  if (status === "processing") return "în procesare";
  if (status === "failed") return "eroare";
  return status;
}

function mapQuizMistakeFlashcards(
  flashcards: ApiStudyProject["flashcards"],
): StudyFlashcardCard[] {
  return flashcards
    .filter((flashcard) => flashcard.source_type === "quiz_mistake")
    .map((flashcard, index) => ({
      id: `quiz-${flashcard.id || flashcard.source_quiz_question_id || index}`,
      flashcardId: flashcard.id,
      topic: flashcard.category || "Quiz",
      question: flashcard.front,
      answer: flashcard.back,
      tone: "danger",
      sourceQuestionId: flashcard.source_quiz_question_id ?? undefined,
      category: flashcard.category ?? undefined,
      difficulty: flashcard.difficulty ?? undefined,
      review: flashcard.review,
    }));
}

function getGeneratedFlashcards(flashcards: ApiStudyProject["flashcards"]) {
  return flashcards.filter((flashcard) => flashcard.source_type === "generated");
}

function mapManualFlashcards(
  projectId: string,
  flashcards: ApiStudyProject["flashcards"],
): StudyFlashcardCard[] {
  return flashcards
    .filter((flashcard) => flashcard.source_type === "manually")
    .map((flashcard, index) => ({
      id: `manual-${flashcard.id || index}`,
      flashcardId: flashcard.id,
      topic: flashcard.category || "Creat de tine",
      question: flashcard.front,
      answer: flashcard.back,
      tone: "info",
      category: flashcard.category ?? undefined,
      difficulty: flashcard.difficulty ?? undefined,
      questionImage: flashcard.front_image
        ? `/api/projects/${projectId}/flashcards/${flashcard.id}/front-image`
        : undefined,
      review: flashcard.review,
    }));
}

function mapSummaryHighlights(
  highlights: ApiStudyProject["summary_highlights"],
): UserSummaryHighlight[] {
  return highlights.map((highlight) => ({
    id: highlight.id,
    text: highlight.text,
    paragraphIndex: highlight.paragraph_index,
    color: highlight.color,
  }));
}

function mapSummaryNotes(
  notes: ApiStudyProject["summary_notes"],
): UserSummaryNote[] {
  return notes.map((note) => ({
    id: note.id,
    text: note.text,
    paragraphIndex: note.paragraph_index,
    note: note.note,
  }));
}

function computeProjectQuizProgress(project: ApiStudyProject): number {
  const totalQuizzes = project.quizzes.length;
  if (!totalQuizzes) {
    return project.status === "ready" ? 100 : 15;
  }

  const completedQuizzes = project.quizzes.filter(
    (quiz) => quiz.completed_at,
  ).length;
  return Math.round((completedQuizzes / totalQuizzes) * 100);
}

function mapApiProject(project: ApiStudyProject): StudyProject {
  const generatedFlashcardCount = getGeneratedFlashcards(
    project.flashcards,
  ).length;

  return {
    id: project.id,
    name: project.name,
    subjectName: project.subject_name,
    institutionName: project.institution_name,
    isArchived: project.is_archived,
    archivedAt: project.archived_at,
    meta: `${project.subject_name} · ${project.file_count} materiale · ${apiProjectStatusLabel(project.status)}`,
    flashcardsDue: generatedFlashcardCount,
    flashcardsTotal: generatedFlashcardCount,
    progress: computeProjectQuizProgress(project),
    summary: project.summary,
    keywords: project.keywords,
    flashcards: project.flashcards,
    quizzes: project.quizzes,
    quizMistakeFlashcards: mapQuizMistakeFlashcards(project.flashcards),
    manualFlashcards: mapManualFlashcards(project.id, project.flashcards),
    summaryHighlights: mapSummaryHighlights(project.summary_highlights),
    summaryNotes: mapSummaryNotes(project.summary_notes),
    strategies: project.strategies.length
      ? project.strategies.map((strategy) => ({
          title: strategy.title,
          description: strategy.description,
        }))
      : [
          {
            title:
              project.status === "ready"
                ? "Continuă cu rezumatul generat"
                : "Încarcă JSON-ul generat de ChatGPT",
            description:
              project.status === "ready"
                ? "Pachetul proiectului este importat și poate fi folosit pentru studiu."
                : "Descarcă markdown-ul și promptul, cere JSON-ul în ChatGPT, apoi revino cu fișierul generat.",
          },
        ],
  };
}

function isChatBackTab(tab: TabId | undefined): tab is Exclude<TabId, "chat"> {
  return tab !== undefined && tab !== "chat";
}

function getTabHref(
  tabId: TabId,
  projectId: string,
  options: { from?: TabId } = {},
) {
  const params = new URLSearchParams({ project: projectId });

  if (tabId === "chat" && isChatBackTab(options.from)) {
    params.set("from", options.from);
  }

  return `${tabRoutes[tabId]}?${params.toString()}`;
}

type AccountDashboardProps = {
  initialProjectId?: string;
  initialTab?: TabId;
  initialChatBackTab?: TabId;
  initialFlashcardMode?: FlashcardPanelMode;
  initialView?: ViewId;
  useTabPages?: boolean;
};

export function AccountDashboard({
  initialProjectId,
  initialTab = "rezumat",
  initialChatBackTab,
  initialFlashcardMode = "packages",
  initialView = "home",
  useTabPages = false,
}: AccountDashboardProps = {}) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const generationTimers = useRef<number[]>([]);

  const [projects, setProjects] = useState(initialProjects);
  const [view, setView] = useState<ViewId>(initialView);
  const [activeProjectId, setActiveProjectId] = useState(
    initialProjectId ?? "",
  );
  const [openProjectId, setOpenProjectId] = useState<string | null>(
    initialProjectId ?? null,
  );
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [chatBackTab, setChatBackTab] = useState<TabId>(
    isChatBackTab(initialChatBackTab)
      ? initialChatBackTab
      : isChatBackTab(initialTab)
        ? initialTab
        : "rezumat",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true",
  );
  const [openSidebarGroup, setOpenSidebarGroup] =
    useState<SidebarGroupId | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [hasMaterialRights, setHasMaterialRights] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [generationState, setGenerationState] =
    useState<GenerationState>("form");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [preparedProject, setPreparedProject] =
    useState<StudyProjectPrepareResponse | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [jsonImportMessage, setJsonImportMessage] = useState<string | null>(null);
  const activeProject = useMemo(
    () => getProjectById(projects, activeProjectId),
    [activeProjectId, projects],
  );

  const firstName = user?.full_name.split(" ")[0] ?? "student";
  const canGenerate =
    projectName.trim().length > 0 &&
    subjectName.trim().length > 0 &&
    institutionName.trim().length > 0 &&
    uploadedFiles.length > 0 &&
    hasMaterialRights;
  const generationProgress = Math.round(
    (completedSteps.length / generationSteps.length) * 100,
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (isLoading || !user) return;
    let isMounted = true;

    listStudyProjects()
      .then((apiProjects) => {
        if (!isMounted) return;

        const mappedProjects = apiProjects.map(mapApiProject);
        setProjects(mappedProjects);

        if (mappedProjects.length === 0) {
          setActiveProjectId("");
          setOpenProjectId(null);
          setView("home");
          return;
        }

        setActiveProjectId((currentProjectId) =>
          initialProjectId &&
          mappedProjects.some((project) => project.id === initialProjectId)
            ? initialProjectId
            : mappedProjects.some((project) => project.id === currentProjectId)
              ? currentProjectId
              : mappedProjects[0].id,
        );
      })
      .catch(() => {
        setProjects([]);
      });

    return () => {
      isMounted = false;
    };
  }, [initialProjectId, isLoading, user]);

  useEffect(() => {
    return () => {
      generationTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  function toggleSidebarCollapsed() {
    setIsSidebarCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(next),
      );
      return next;
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  }

  function showHome() {
    setView("home");
    setSidebarOpen(false);

    if (useTabPages) {
      router.push("/myaccount");
      return;
    }
  }

  function openProject(projectId: string, tab: TabId = "rezumat") {
    setActiveProjectId(projectId);
    setOpenProjectId(projectId);
    setActiveTab(tab);
    if (isChatBackTab(tab)) {
      setChatBackTab(tab);
    }
    setView("project");
    setSidebarOpen(false);

    if (useTabPages) {
      router.push(getTabHref(tab, projectId));
      return;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function renameProject(projectId: string, name: string) {
    const apiProject = await renameStudyProject({ projectId, name });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function archiveProject(projectId: string) {
    await archiveStudyProject(projectId);
    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectId),
    );

    if (activeProjectId === projectId || openProjectId === projectId) {
      setActiveProjectId("");
      setOpenProjectId(null);
      setView("home");
      if (useTabPages) {
        router.push("/myaccount");
      }
    }
  }

  async function removeProject(projectId: string) {
    await deleteStudyProject(projectId);
    setProjects((currentProjects) =>
      currentProjects.filter((project) => project.id !== projectId),
    );

    if (activeProjectId === projectId || openProjectId === projectId) {
      setActiveProjectId("");
      setOpenProjectId(null);
      setView("home");
      if (useTabPages) {
        router.push("/myaccount");
      }
    }
  }

  function addQuizMistakeFlashcard(
    projectId: string,
    flashcard: StudyFlashcardCard,
  ) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => {
        if (project.id !== projectId) {
          return project;
        }

        const alreadySaved = project.quizMistakeFlashcards.some(
          (existingFlashcard) =>
            (flashcard.sourceQuestionId &&
              existingFlashcard.sourceQuestionId ===
                flashcard.sourceQuestionId) ||
            existingFlashcard.question === flashcard.question,
        );

        if (alreadySaved) {
          return project;
        }

        return {
          ...project,
          quizMistakeFlashcards: [
            flashcard,
            ...project.quizMistakeFlashcards,
          ],
        };
      }),
    );
  }

  async function addManualFlashcard(
    projectId: string,
    flashcard: ManualFlashcardPayload,
  ) {
    const apiProject = await createManualStudyProjectFlashcard({
      projectId,
      front: flashcard.question,
      back: flashcard.answer,
      category: flashcard.category,
      difficulty: flashcard.difficulty,
      frontImage: flashcard.questionImageFile,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function addSummaryHighlight(
    projectId: string,
    highlight: {
      paragraphIndex: number;
      text: string;
      color: ApiSummaryHighlightColor;
    },
  ) {
    const apiProject = await createSummaryHighlight({
      projectId,
      paragraphIndex: highlight.paragraphIndex,
      text: highlight.text,
      color: highlight.color,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function changeSummaryHighlightColor(
    projectId: string,
    highlightId: string,
    color: ApiSummaryHighlightColor,
  ) {
    const apiProject = await updateSummaryHighlightColor({
      projectId,
      highlightId,
      color,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function removeSummaryHighlight(projectId: string, highlightId: string) {
    const apiProject = await deleteSummaryHighlight({ projectId, highlightId });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function addSummaryNote(
    projectId: string,
    note: { paragraphIndex: number; text: string; note: string },
  ) {
    const apiProject = await createSummaryNote({
      projectId,
      paragraphIndex: note.paragraphIndex,
      text: note.text,
      note: note.note,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function changeSummaryNote(
    projectId: string,
    noteId: string,
    note: string,
  ) {
    const apiProject = await updateSummaryNote({ projectId, noteId, note });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function removeSummaryNote(projectId: string, noteId: string) {
    const apiProject = await deleteSummaryNote({ projectId, noteId });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function completeQuizAttempt(
    projectId: string,
    quizId: string,
    result: { correctCount: number; answeredCount: number },
  ) {
    const apiProject = await completeQuiz({
      projectId,
      quizId,
      correctCount: result.correctCount,
      answeredCount: result.answeredCount,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function toggleFlashcardReview(
    projectId: string,
    flashcardId: string,
    review: boolean,
  ) {
    const apiProject = await setFlashcardReview({
      projectId,
      flashcardId,
      review,
    });
    const mappedProject = mapApiProject(apiProject);
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === mappedProject.id ? mappedProject : project,
      ),
    );
  }

  async function saveQuizMistakeFlashcard(
    projectId: string,
    questionId: string | null,
    fallbackFlashcard: StudyFlashcardCard,
  ) {
    addQuizMistakeFlashcard(projectId, fallbackFlashcard);

    if (!questionId) {
      return;
    }

    try {
      const apiProject = await createQuizMistakeFlashcard({
        projectId,
        questionId,
      });
      const mappedProject = mapApiProject(apiProject);
      setProjects((currentProjects) =>
        currentProjects.map((project) => {
          if (project.id !== mappedProject.id) {
            return project;
          }

          return mappedProject;
        }),
      );
    } catch {
      // The optimistic flashcard stays visible; backend sync can be retried later.
    }
  }

  function changeProjectTab(tab: TabId) {
    const nextChatBackTab = isChatBackTab(tab)
      ? tab
      : isChatBackTab(activeTab)
        ? activeTab
        : chatBackTab;

    setChatBackTab(nextChatBackTab);
    setActiveTab(tab);

    if (useTabPages) {
      router.push(
        getTabHref(tab, activeProjectId, {
          from: tab === "chat" ? nextChatBackTab : undefined,
        }),
      );
      return;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openNewProject() {
    resetNewProject();
    setView("new");
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function resetNewProject() {
    generationTimers.current.forEach((timer) => window.clearTimeout(timer));
    generationTimers.current = [];
    setProjectName("");
    setSubjectName("");
    setInstitutionName("");
    setUploadedFiles([]);
    setHasMaterialRights(false);
    setCompletedSteps([]);
    setGenerationState("form");
    setPreparedProject(null);
    setGenerationError(null);
    setJsonImportMessage(null);
    setIsImportingJson(false);
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadedFiles((currentFiles) => [
      ...currentFiles,
      ...Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
        file,
      })),
    ]);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  async function startGeneration() {
    if (!canGenerate) return;

    generationTimers.current.forEach((timer) => window.clearTimeout(timer));
    generationTimers.current = [];
    setGenerationState("generating");
    setCompletedSteps([]);
    setPreparedProject(null);
    setGenerationError(null);
    setJsonImportMessage(null);

    try {
      setCompletedSteps(["Încărcare materiale"]);
      const response = await prepareStudyProject({
        name: projectName,
        subjectName,
        institutionName,
        files: uploadedFiles.map((file) => file.file),
        materialRightsConfirmed: hasMaterialRights,
      });
      const apiProject = mapApiProject(response.project);
      setProjects((currentProjects) => [
        apiProject,
        ...currentProjects.filter((project) => project.id !== apiProject.id),
      ]);
      setActiveProjectId(apiProject.id);
      setOpenProjectId(apiProject.id);
      setPreparedProject(response);
      setCompletedSteps(generationSteps);
      setGenerationState("done");
    } catch (error) {
      setGenerationState("form");
      setCompletedSteps([]);
      setGenerationError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi pregătit momentan.",
      );
    }
  }

  function createGeneratedProject() {
    if (preparedProject) {
      const apiProject = mapApiProject(preparedProject.project);
      setProjects((currentProjects) => [
        apiProject,
        ...currentProjects.filter((project) => project.id !== apiProject.id),
      ]);
      setActiveProjectId(apiProject.id);
      setOpenProjectId(apiProject.id);
      setActiveTab("rezumat");
      setView("project");
      resetNewProject();
      return;
    }

    const name = projectName.trim();
    if (!name) return;

    const id = `${slugify(name)}-${Math.floor(Math.random() * 1000)}`;
    const newProject: StudyProject = {
      id,
      name,
      subjectName: subjectName.trim() || "Materie",
      institutionName: institutionName.trim() || "Instituție",
      isArchived: false,
      archivedAt: null,
      meta: `${subjectName.trim() || "Materie"} · ${uploadedFiles.length} materiale · generat azi`,
      flashcardsDue: 24,
      flashcardsTotal: 24,
      progress: 0,
      summary: null,
      keywords: [],
      flashcards: [],
      quizzes: [],
      quizMistakeFlashcards: [],
      manualFlashcards: [],
      summaryHighlights: [],
      summaryNotes: [],
      strategies: [
        {
          title: "Citește mai întâi rezumatul",
          description:
            "Ai context dinainte, iar informația nouă se leagă mai ușor de ceva ce ai văzut deja.",
        },
        {
          title: "Testează-te cu flashcard-urile înainte de quiz",
          description:
            "Recall-ul activ îți arată exact ce mai trebuie revizuit.",
        },
        {
          title: "Notează 3 întrebări la care nu ai răspuns sigur",
          description:
            "Golurile specifice se închid mai repede decât recitind tot materialul.",
        },
      ],
    };

    setProjects((currentProjects) => [newProject, ...currentProjects]);
    setActiveProjectId(id);
    setOpenProjectId(id);
    setActiveTab("rezumat");
    setView("project");
    resetNewProject();
  }

  async function importGeneratedJson(file: File) {
    if (!preparedProject) return;

    setIsImportingJson(true);
    setJsonImportMessage(null);
    setGenerationError(null);

    try {
      const response = await importStudyProjectJson({
        projectId: preparedProject.project.id,
        file,
      });
      const nextPreparedProject = {
        ...preparedProject,
        project: response.project,
      };
      const apiProject = mapApiProject(response.project);
      setPreparedProject(nextPreparedProject);
      setProjects((currentProjects) => [
        apiProject,
        ...currentProjects.filter((project) => project.id !== apiProject.id),
      ]);
      setJsonImportMessage(response.message);
    } catch (error) {
      setGenerationError(
        error instanceof Error
          ? error.message
          : "JSON-ul nu a putut fi importat momentan.",
      );
    } finally {
      setIsImportingJson(false);
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-app text-content">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-subtle border-t-action" />
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-app text-content lg:flex">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Închide meniul"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col overflow-hidden border-r border-subtle bg-surface transition-all duration-300 lg:sticky lg:top-0 lg:h-svh ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isSidebarCollapsed
            ? "lg:w-0 lg:translate-x-0 lg:border-r-0 lg:pointer-events-none lg:opacity-0"
            : "lg:w-[min(84vw,300px)] lg:translate-x-0 lg:opacity-100"
        }`}
        aria-hidden={isSidebarCollapsed}
        aria-label="Meniu principal"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-content transition hover:bg-surface-hover lg:hidden"
            aria-label="Închide meniul"
          >
            <Icon className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="hidden h-10 w-10 items-center justify-center rounded-xl text-content transition hover:bg-surface-hover lg:flex"
            aria-label="Ascunde meniul"
          >
            <Icon className="h-5 w-5">
              <path d="M11 19l-7-7 7-7M4 12h16" />
            </Icon>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <button
            type="button"
            onClick={openNewProject}
            className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-content px-4 py-3 text-sm font-semibold text-app transition hover:opacity-90"
          >
            <Icon>
              <path d="M12 5v14M5 12h14" />
            </Icon>
            Proiect nou
          </button>

          <nav className="space-y-1 px-2">
            <button
              type="button"
              onClick={showHome}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                view === "home"
                  ? "bg-success-soft text-success"
                  : "text-content hover:bg-surface-hover"
              }`}
            >
              <Icon className="h-[18px] w-[18px]">
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10h14V10" />
              </Icon>
              Acasă
            </button>
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setOpenSidebarGroup((currentGroup) =>
                    currentGroup === "settings" ? null : "settings",
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-content transition hover:bg-surface-hover"
                aria-expanded={openSidebarGroup === "settings"}
              >
                <Icon className="h-[18px] w-[18px]">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.08.08a2 2 0 1 1-2.83-2.83l.08-.08A1.7 1.7 0 0 0 10.6 15a1.7 1.7 0 0 0-1.88-.34l-.1.04a2 2 0 1 1-1.53-3.7l.1-.04A1.7 1.7 0 0 0 7.8 9a1.7 1.7 0 0 0-.6-1l-.08-.08a2 2 0 1 1 2.83-2.83l.08.08A1.7 1.7 0 0 0 12 4.6a1.7 1.7 0 0 0 1-.6l.08-.08a2 2 0 1 1 2.83 2.83l-.08.08A1.7 1.7 0 0 0 16.4 9a1.7 1.7 0 0 0 1.88.34l.1-.04a2 2 0 1 1 1.53 3.7l-.1.04A1.7 1.7 0 0 0 19.4 15z" />
                </Icon>
                <span className="min-w-0 flex-1">Setări</span>
                <Icon
                  className={`h-4 w-4 transition ${
                    openSidebarGroup === "settings" ? "rotate-90" : ""
                  }`}
                >
                  <path d="M9 18l6-6-6-6" />
                </Icon>
              </button>
              <div
                className={`ml-8 overflow-hidden transition-[max-height] duration-300 ${
                  openSidebarGroup === "settings" ? "max-h-80" : "max-h-0"
                }`}
              >
                <div className="mt-1 space-y-1">
                  {sidebarSettingsItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            {user.role === "admin" ? (
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-content transition hover:bg-surface-hover"
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 3 20 6v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6l8-3z" />
                  <path d="M9 12l2 2 4-4" />
                </Icon>
                Setări admin
              </Link>
            ) : null}
            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setOpenSidebarGroup((currentGroup) =>
                    currentGroup === "billing" ? null : "billing",
                  )
                }
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-content transition hover:bg-surface-hover"
                aria-expanded={openSidebarGroup === "billing"}
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 3l3.2 6.5 7.1 1-5.1 5 1.2 7-6.4-3.4-6.4 3.4 1.2-7-5.1-5 7.1-1L12 3z" />
                </Icon>
                <span className="min-w-0 flex-1">Abonament</span>
                <Icon
                  className={`h-4 w-4 transition ${
                    openSidebarGroup === "billing" ? "rotate-90" : ""
                  }`}
                >
                  <path d="M9 18l6-6-6-6" />
                </Icon>
              </button>
              <div
                className={`ml-8 overflow-hidden transition-[max-height] duration-300 ${
                  openSidebarGroup === "billing" ? "max-h-32" : "max-h-0"
                }`}
              >
                <div className="mt-1 space-y-1">
                  {sidebarBillingItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center rounded-xl px-3 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          <p className="px-5 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            Proiectele tale
          </p>

          <div className="mt-2 space-y-1 px-2">
            {projects.length ? (
              projects.map((project) => {
              const isOpen = openProjectId === project.id;
              return (
                <div key={project.id} className="overflow-hidden rounded-2xl">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenProjectId((currentId) =>
                        currentId === project.id ? null : project.id,
                      )
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-hover"
                  >
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {project.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {project.subjectName}
                      </span>
                    </span>
                    <Icon
                      className={`h-4 w-4 text-muted transition ${
                        isOpen ? "rotate-90" : ""
                      }`}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </Icon>
                  </button>

                  <div
                    className={`overflow-hidden transition-[max-height] duration-300 ${
                      isOpen ? "max-h-64" : "max-h-0"
                    }`}
                  >
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => openProject(project.id, tab.id)}
                        className={`ml-5 flex w-[calc(100%-1.25rem)] items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition hover:bg-surface-hover ${
                          activeProjectId === project.id &&
                          view === "project" &&
                          activeTab === tab.id
                            ? "font-semibold text-success"
                            : "text-muted"
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-subtle px-3 py-4 text-xs leading-5 text-muted">
                Nu ai proiecte încă.
              </p>
            )}
          </div>

        </div>

        <div className="border-t border-subtle p-3">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-subtle bg-success-soft text-xs font-bold text-success">
              {initials(user.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user.full_name}
              </span>
              <span className="block truncate text-xs text-muted">
                {user.email}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-wait disabled:opacity-60"
              aria-label="Ieși din cont"
            >
              <Icon>
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 19V5" />
              </Icon>
            </button>
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface/95 text-content shadow-lg shadow-black/10 backdrop-blur-xl transition hover:bg-surface-hover lg:hidden"
          aria-label="Deschide meniul"
        >
          <Icon className="h-5 w-5">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </Icon>
        </button>

        {isSidebarCollapsed ? (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="fixed left-4 top-4 z-30 hidden h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface/95 text-content shadow-lg shadow-black/10 backdrop-blur-xl transition hover:bg-surface-hover lg:flex"
            aria-label="Afișează meniul"
          >
            <Icon className="h-5 w-5">
              <path d="M13 5l7 7-7 7M20 12H4" />
            </Icon>
          </button>
        ) : null}

        <main className="mx-auto w-full max-w-7xl px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:py-6">
          {view === "home" ? (
            <HomeView
              firstName={firstName}
              projects={projects}
              onOpenProject={openProject}
              onOpenNewProject={openNewProject}
              onRenameProject={renameProject}
              onArchiveProject={archiveProject}
              onDeleteProject={removeProject}
            />
          ) : null}

          {view === "project" && activeProject ? (
            <ProjectView
              project={activeProject}
              activeTab={activeTab}
              chatBackTab={chatBackTab}
              flashcardMode={initialFlashcardMode}
              onBack={showHome}
              onTabChange={changeProjectTab}
              onQuizMistake={saveQuizMistakeFlashcard}
              onQuizComplete={completeQuizAttempt}
              onManualFlashcardCreate={addManualFlashcard}
              onToggleFlashcardReview={toggleFlashcardReview}
              onHighlightCreate={addSummaryHighlight}
              onHighlightColorChange={changeSummaryHighlightColor}
              onHighlightRemove={removeSummaryHighlight}
              onNoteCreate={addSummaryNote}
              onNoteUpdate={changeSummaryNote}
              onNoteRemove={removeSummaryNote}
            />
          ) : null}

          {view === "new" ? (
            <NewProjectView
              projectName={projectName}
              subjectName={subjectName}
              institutionName={institutionName}
              files={uploadedFiles}
              canGenerate={canGenerate}
              hasMaterialRights={hasMaterialRights}
              generationState={generationState}
              generationProgress={generationProgress}
              completedSteps={completedSteps}
              preparedProject={preparedProject}
              generationError={generationError}
              isImportingJson={isImportingJson}
              jsonImportMessage={jsonImportMessage}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              onBack={showHome}
              onProjectNameChange={setProjectName}
              onSubjectNameChange={setSubjectName}
              onInstitutionNameChange={setInstitutionName}
              onMaterialRightsChange={setHasMaterialRights}
              onAddFiles={addFiles}
              onRemoveFile={(index) =>
                setUploadedFiles((currentFiles) =>
                  currentFiles.filter((_, fileIndex) => fileIndex !== index),
                )
              }
              onDrop={handleDrop}
              onDragStateChange={setIsDragging}
              onStartGeneration={startGeneration}
              onImportJson={importGeneratedJson}
              onOpenGeneratedProject={createGeneratedProject}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 px-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
      {children}
    </p>
  );
}

function HomeView({
  firstName,
  projects,
  onOpenProject,
  onOpenNewProject,
  onRenameProject,
  onArchiveProject,
  onDeleteProject,
}: {
  firstName: string;
  projects: StudyProject[];
  onOpenProject: (projectId: string, tab?: TabId) => void;
  onOpenNewProject: () => void;
  onRenameProject: (projectId: string, name: string) => Promise<void> | void;
  onArchiveProject: (projectId: string) => Promise<void> | void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
}) {
  const [openMenuProjectId, setOpenMenuProjectId] = useState<string | null>(
    null,
  );
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(
    null,
  );
  const [renameDraft, setRenameDraft] = useState("");
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [deleteCandidateProject, setDeleteCandidateProject] =
    useState<StudyProject | null>(null);
  const deletingProjectIdsRef = useRef(new Set<string>());
  const projectCountLabel =
    projects.length === 0
      ? "Nu ai încă proiecte. Încarcă primul curs și începem."
      : projects.length === 1
        ? "Ai 1 proiect pregătit pentru studiu."
        : `Ai ${projects.length} proiecte pregătite pentru studiu.`;

  function startRename(project: StudyProject) {
    setProjectError(null);
    setOpenMenuProjectId(null);
    setRenamingProjectId(project.id);
    setRenameDraft(project.name);
  }

  async function submitRename(projectId: string) {
    const nextName = renameDraft.trim();
    if (nextName.length < 2) {
      setProjectError("Numele proiectului trebuie să aibă cel puțin 2 caractere.");
      return;
    }

    setBusyProjectId(projectId);
    setProjectError(null);
    try {
      await onRenameProject(projectId, nextName);
      setRenamingProjectId(null);
      setRenameDraft("");
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi redenumit.",
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function archiveProject(projectId: string) {
    setBusyProjectId(projectId);
    setProjectError(null);
    setOpenMenuProjectId(null);
    try {
      await onArchiveProject(projectId);
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi arhivat.",
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function confirmDeleteProject(projectId: string) {
    if (deletingProjectIdsRef.current.has(projectId)) return;

    deletingProjectIdsRef.current.add(projectId);
    setBusyProjectId(projectId);
    setProjectError(null);
    try {
      await onDeleteProject(projectId);
      setDeleteCandidateProject(null);
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi șters.",
      );
    } finally {
      deletingProjectIdsRef.current.delete(projectId);
      setBusyProjectId(null);
    }
  }

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            Bună, <em className="text-success">{firstName}</em>
          </h1>
          <p className="mt-1 text-sm text-muted">{projectCountLabel}</p>
        </div>
        <button
          type="button"
          onClick={onOpenNewProject}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-bold text-app shadow-sm transition hover:opacity-90"
        >
          <Icon>
            <path d="M12 5v14M5 12h14" />
          </Icon>
          Proiect nou
        </button>
      </div>

      <SectionLabel>Proiectele tale</SectionLabel>
      {projectError ? (
        <div className="mt-3 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {projectError}
        </div>
      ) : null}

      <div className="mt-3">
        {projects.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="group relative min-h-[210px] rounded-[2rem] border border-subtle bg-surface p-5 shadow-[0_18px_45px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:border-content/25 hover:shadow-[0_24px_60px_rgba(0,0,0,0.07)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenuProjectId((currentProjectId) =>
                      currentProjectId === project.id ? null : project.id,
                    )
                  }
                  className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-subtle bg-surface/90 text-content backdrop-blur transition hover:bg-surface-hover"
                  aria-label={`Deschide meniul pentru ${project.name}`}
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>

                {openMenuProjectId === project.id ? (
                  <div className="absolute right-4 top-16 z-30 w-52 rounded-2xl border border-subtle bg-surface p-2 shadow-2xl shadow-black/10">
                    <button
                      type="button"
                      onClick={() => startRename(project)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-surface-hover"
                    >
                      <Icon>
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </Icon>
                      Redenumire
                    </button>
                    <button
                      type="button"
                      disabled={busyProjectId === project.id}
                      onClick={() => void archiveProject(project.id)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
                    >
                      <Icon>
                        <path d="M21 8v13H3V8" />
                        <path d="M1 3h22v5H1z" />
                        <path d="M10 12h4" />
                      </Icon>
                      Arhivare
                    </button>
                    <button
                      type="button"
                      disabled={busyProjectId === project.id}
                      onClick={() => {
                        setOpenMenuProjectId(null);
                        setDeleteCandidateProject(project);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-wait disabled:opacity-60"
                    >
                      <Icon>
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </Icon>
                      Ștergere
                    </button>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="flex h-full w-full flex-col items-start text-left"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[11px] font-black text-success"
                    style={{
                      background: `conic-gradient(var(--theme-success-text) ${project.progress}%, var(--theme-border) 0)`,
                    }}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                      {project.progress}%
                    </span>
                  </span>

                  <span className="mt-8 block pr-10 font-serif text-2xl font-semibold leading-tight">
                    {project.name}
                  </span>
                  <span className="mt-3 block text-sm leading-6 text-muted">
                    {project.meta}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-2 pt-6 text-xs font-black uppercase tracking-[0.12em] text-muted transition group-hover:text-content">
                    Deschide proiectul
                    <Icon className="h-3.5 w-3.5">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </Icon>
                  </span>
                </button>

                {renamingProjectId === project.id ? (
                  <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-subtle bg-app/95 p-3 shadow-xl shadow-black/10 backdrop-blur">
                    <label className="block text-[11px] font-black uppercase tracking-[0.12em] text-muted">
                      Nume proiect
                      <input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void submitRename(project.id);
                          }
                          if (event.key === "Escape") {
                            setRenamingProjectId(null);
                          }
                        }}
                        className="mt-2 h-11 w-full rounded-xl border border-subtle bg-surface px-3 text-sm font-semibold text-content outline-none transition focus:border-success"
                        autoFocus
                      />
                    </label>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setRenamingProjectId(null)}
                        className="rounded-full border border-subtle px-3 py-2 text-xs font-bold"
                      >
                        Renunță
                      </button>
                      <button
                        type="button"
                        disabled={busyProjectId === project.id}
                        onClick={() => void submitRename(project.id)}
                        className="rounded-full bg-content px-3 py-2 text-xs font-bold text-app disabled:cursor-wait disabled:opacity-60"
                      >
                        Salvează
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-subtle bg-surface p-6 text-center">
            <p className="font-serif text-xl font-semibold">
              Niciun proiect încă.
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
              Creează primul proiect, încarcă materialele și Revizzio îți
              pregătește rezumatul, flashcardurile și quizurile.
            </p>
          </div>
        )}
      </div>

      {deleteCandidateProject ? (
        <ProjectDeleteModal
          project={deleteCandidateProject}
          isDeleting={busyProjectId === deleteCandidateProject.id}
          onCancel={() => setDeleteCandidateProject(null)}
          onConfirm={() => void confirmDeleteProject(deleteCandidateProject.id)}
        />
      ) : null}
    </section>
  );
}

function ProjectDeleteModal({
  project,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  project: StudyProject;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-content/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-project-title"
    >
      <div className="w-full max-w-lg rounded-[2rem] border border-subtle bg-surface p-6 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-danger-border bg-danger-soft text-danger">
            <Icon className="h-5 w-5">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </Icon>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-danger">
              Ștergere definitivă
            </p>
            <h2
              id="delete-project-title"
              className="mt-2 font-serif text-3xl font-semibold leading-tight"
            >
              Ștergi proiectul „{project.name}”?
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Proiectul, materialele convertite și conținutul generat vor fi
              eliminate definitiv. Pentru păstrare fără afișare, folosește
              arhivarea.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-full border border-subtle px-5 py-3 text-sm font-bold transition hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full bg-danger px-5 py-3 text-sm font-bold text-app transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? "Se șterge..." : "Șterge definitiv"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjectView({
  project,
  activeTab,
  chatBackTab,
  flashcardMode,
  onBack,
  onTabChange,
  onQuizMistake,
  onQuizComplete,
  onManualFlashcardCreate,
  onToggleFlashcardReview,
  onHighlightCreate,
  onHighlightColorChange,
  onHighlightRemove,
  onNoteCreate,
  onNoteUpdate,
  onNoteRemove,
}: {
  project: StudyProject;
  activeTab: TabId;
  chatBackTab: TabId;
  flashcardMode: FlashcardPanelMode;
  onBack: () => void;
  onTabChange: (tab: TabId) => void;
  onQuizMistake: (
    projectId: string,
    questionId: string | null,
    fallbackFlashcard: StudyFlashcardCard,
  ) => void;
  onQuizComplete: (
    projectId: string,
    quizId: string,
    result: { correctCount: number; answeredCount: number },
  ) => Promise<void>;
  onManualFlashcardCreate: (
    projectId: string,
    flashcard: ManualFlashcardPayload,
  ) => Promise<void>;
  onToggleFlashcardReview: (
    projectId: string,
    flashcardId: string,
    review: boolean,
  ) => Promise<void>;
  onHighlightCreate: (
    projectId: string,
    highlight: {
      paragraphIndex: number;
      text: string;
      color: ApiSummaryHighlightColor;
    },
  ) => Promise<void>;
  onHighlightColorChange: (
    projectId: string,
    highlightId: string,
    color: ApiSummaryHighlightColor,
  ) => Promise<void>;
  onHighlightRemove: (projectId: string, highlightId: string) => Promise<void>;
  onNoteCreate: (
    projectId: string,
    note: { paragraphIndex: number; text: string; note: string },
  ) => Promise<void>;
  onNoteUpdate: (
    projectId: string,
    noteId: string,
    note: string,
  ) => Promise<void>;
  onNoteRemove: (projectId: string, noteId: string) => Promise<void>;
}) {
  const chatBackLabel =
    tabs.find((tab) => tab.id === chatBackTab)?.label ?? "Rezumat";

  if (activeTab === "chat") {
    return (
      <section>
        <button
          type="button"
          onClick={() => onTabChange(isChatBackTab(chatBackTab) ? chatBackTab : "rezumat")}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
        >
          <Icon>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </Icon>
          Înapoi la {chatBackLabel}
        </button>

        <ProjectChatPanel key={project.id} project={project} />
      </section>
    );
  }

  return (
    <section>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
        >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Proiectele tale
      </button>

      <p className="text-sm font-semibold text-content">
        {project.name} - {project.subjectName}
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "border-content bg-content text-app"
                : "border-subtle text-muted hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "rezumat" ? (
          <SummaryPanel
            project={project}
            onHighlightCreate={onHighlightCreate}
            onHighlightColorChange={onHighlightColorChange}
            onHighlightRemove={onHighlightRemove}
            onNoteCreate={onNoteCreate}
            onNoteUpdate={onNoteUpdate}
            onNoteRemove={onNoteRemove}
          />
        ) : null}
        {activeTab === "flashcards" ? (
          <FlashcardsPanel
            project={project}
            mode={flashcardMode}
            onManualFlashcardCreate={onManualFlashcardCreate}
            onToggleFlashcardReview={onToggleFlashcardReview}
          />
        ) : null}
        {activeTab === "quiz" ? (
          <QuizPanel
            project={project}
            onQuizMistake={onQuizMistake}
            onQuizComplete={onQuizComplete}
          />
        ) : null}
        {activeTab === "strategii" ? (
          <StrategiesPanel strategies={project.strategies} />
        ) : null}
        {activeTab === "progres" ? <ProgressPanel project={project} /> : null}
      </div>
    </section>
  );
}

type ProjectChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

function createProjectChatIntro(project: StudyProject): ProjectChatMessage {
  return {
    id: `assistant-intro-${project.id}`,
    role: "assistant",
    text: `Salut! Sunt AI-ul pentru proiectul „${project.name}”. Întreabă-mă orice despre materialul acesta.`,
  };
}

function buildProjectChatAnswer(project: StudyProject, prompt: string) {
  const normalizedPrompt = prompt.toLocaleLowerCase("ro-RO");

  if (
    normalizedPrompt.includes("plan") ||
    normalizedPrompt.includes("minute") ||
    normalizedPrompt.includes("azi")
  ) {
    return `Pentru „${project.name}”, aș face azi o sesiune scurtă: 5 minute rezumat, 5 minute flashcard-uri și apoi un quiz rapid. Ai ${project.flashcardsDue} flashcard-uri care merită repetate.`;
  }

  if (
    normalizedPrompt.includes("risc") ||
    normalizedPrompt.includes("examen") ||
    normalizedPrompt.includes("greu")
  ) {
    const riskLevel =
      project.progress >= 75
        ? "moderat"
        : project.progress >= 45
          ? "ridicat pe conceptele neexersate"
          : "ridicat";

    return `Pentru „${project.name}”, riscul pare ${riskLevel}. Eu aș începe cu flashcard-urile unde eziți, apoi aș verifica printr-un quiz scurt dacă ai fixat ideea.`;
  }

  if (
    normalizedPrompt.includes("concept") ||
    normalizedPrompt.includes("explic") ||
    normalizedPrompt.includes("rezumat")
  ) {
    return `În proiectul „${project.name}”, încearcă să înveți conceptele ca relații: termenul, rolul lui și de ce contează. Asta te ajută mai mult decât memorarea unei definiții izolate.`;
  }

  if (
    normalizedPrompt.includes("quiz") ||
    normalizedPrompt.includes("întreb") ||
    normalizedPrompt.includes("intreb")
  ) {
    return `La quiz-uri, începe cu întrebările simple și apoi treci la cele mixte. Dacă greșești un concept de două ori, transformă-l într-un flashcard.`;
  }

  return `Am înțeles. Pentru „${project.name}”, aș lega asta de materialul proiectului și de ce ai deja generat: rezumat, flashcard-uri și quiz-uri. Spune-mi conceptul exact dacă vrei să intru mai punctual.`;
}

function ProjectChatPanel({ project }: { project: StudyProject }) {
  const streamTimerRef = useRef<number | null>(null);
  const messageIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<ProjectChatMessage[]>(() => [
    createProjectChatIntro(project),
  ]);
  const [draftMessage, setDraftMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isGenerating]);

  useEffect(() => {
    const input = messageInputRef.current;

    if (!input) {
      return;
    }

    input.style.height = "0px";
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  }, [draftMessage]);

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  function sendChatMessage(message?: string) {
    const text = (message ?? draftMessage).trim();

    if (!text || isGenerating) {
      return;
    }

    if (streamTimerRef.current) {
      window.clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    messageIdRef.current += 1;
    const userMessage: ProjectChatMessage = {
      id: `user-${project.id}-${messageIdRef.current}`,
      role: "user",
      text,
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setDraftMessage("");
    if (messageInputRef.current) {
      messageInputRef.current.style.height = "0px";
    }
    setIsGenerating(true);

    const answer = buildProjectChatAnswer(project, text);
    const answerChunks = answer.match(/\S+\s*/g) ?? [answer];
    let chunkIndex = 0;
    let streamedAnswer = "";

    messageIdRef.current += 1;
    const assistantMessageId = `assistant-${project.id}-${messageIdRef.current}`;

    setStreamingMessageId(assistantMessageId);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: assistantMessageId,
        role: "assistant",
        text: "",
      },
    ]);

    streamTimerRef.current = window.setInterval(() => {
      const nextChunk = answerChunks[chunkIndex];

      if (nextChunk === undefined) {
        if (streamTimerRef.current) {
          window.clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
        setIsGenerating(false);
        setStreamingMessageId(null);
        return;
      }

      streamedAnswer += nextChunk;
      chunkIndex += 1;

      setMessages((currentMessages) => [
        ...currentMessages.map((currentMessage) =>
          currentMessage.id === assistantMessageId
            ? { ...currentMessage, text: streamedAnswer }
            : currentMessage,
        ),
      ]);
    }, 42);
  }

  return (
    <section className="theme-shadow-card overflow-hidden rounded-[1.75rem] border border-subtle bg-surface">
      <div className="flex h-[calc(100svh-10rem)] min-h-[30rem] max-h-[48rem] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-subtle bg-app/70 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="truncate font-serif text-xl font-semibold leading-tight sm:text-2xl">
              Chat AI
            </h2>
            <p className="mt-0.5 truncate text-xs text-muted">
              Conversație despre {project.name}
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full border border-info-border bg-info-soft px-3 py-1 text-xs font-bold text-info sm:inline-flex">
            proiect activ
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-app/35 px-3 py-4 sm:px-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <article
                  className={`max-w-[min(34rem,90%)] rounded-[1.35rem] border px-4 py-2.5 text-sm leading-6 shadow-sm ${
                    message.role === "user"
                      ? "border-content bg-content text-app"
                      : "border-subtle bg-surface text-content"
                  }`}
                >
                  <p>
                    {message.text}
                    {message.id === streamingMessageId ? (
                      <span className="ml-1 inline-block h-4 w-1 translate-y-0.5 animate-pulse rounded-full bg-info align-baseline" />
                    ) : null}
                  </p>
                </article>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-subtle bg-surface p-3 sm:p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendChatMessage();
            }}
            className="mx-auto flex max-w-3xl items-end gap-2 rounded-[1.35rem] border border-subtle bg-app p-2"
          >
            <label className="sr-only" htmlFor="project-chat-message">
              Mesaj pentru Chat AI
            </label>
            <textarea
              id="project-chat-message"
              ref={messageInputRef}
              value={draftMessage}
              onChange={(event) => setDraftMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendChatMessage();
                }
              }}
              placeholder="Scrie un mesaj..."
              rows={1}
              className="max-h-32 min-h-11 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-sm leading-6 text-content outline-none placeholder:text-muted"
            />
            <button
              type="submit"
              disabled={!draftMessage.trim() || isGenerating}
              className="inline-flex items-center justify-center rounded-full bg-action px-4 py-2.5 text-sm font-bold text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
            >
              Trimite
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

type SummaryKeyword = {
  id: string;
  label: string;
  text: string;
  paragraphIndex: number;
};

type UserSummaryHighlight = {
  id: string;
  text: string;
  paragraphIndex: number;
  color: SummaryHighlightColorId;
};

type UserSummaryNote = {
  id: string;
  text: string;
  paragraphIndex: number;
  note: string;
};

type PendingSummarySelection = {
  text: string;
  paragraphIndex: number;
};

type SummaryToolMode = "highlight" | "erase" | "ai" | "note";

type SummaryNotePanelState =
  | { mode: "create"; selection: PendingSummarySelection; draft: string }
  | { mode: "view"; note: UserSummaryNote; draft: string };

type LearningAiResponse = {
  title: string;
  answer: string;
  bullets: string[];
};

type SummaryAiDialog = {
  text: string;
  paragraphIndex: number;
  status: "loading" | "done";
  response?: LearningAiResponse;
};

type SummaryRange = {
  start: number;
  end: number;
  kind: "keyword" | "user" | "note";
  keyword?: SummaryKeyword;
  highlight?: UserSummaryHighlight;
  note?: UserSummaryNote;
};

type SummaryHighlightColorId = "yellow" | "green" | "blue" | "pink" | "purple";

const defaultSummaryHighlightColor: SummaryHighlightColorId = "yellow";

const summaryHighlightColors: Array<{
  id: SummaryHighlightColorId;
  label: string;
  bg: string;
  text: string;
  border: string;
}> = [
  {
    id: "yellow",
    label: "Galben",
    bg: "#fff3bf",
    text: "#5f3e00",
    border: "#f3d36b",
  },
  {
    id: "green",
    label: "Verde",
    bg: "#dcfce7",
    text: "#166534",
    border: "#86efac",
  },
  {
    id: "blue",
    label: "Albastru",
    bg: "#dbeafe",
    text: "#1d4ed8",
    border: "#93c5fd",
  },
  {
    id: "pink",
    label: "Roz",
    bg: "#fce7f3",
    text: "#9d174d",
    border: "#f9a8d4",
  },
  {
    id: "purple",
    label: "Mov",
    bg: "#ede9fe",
    text: "#6d28d9",
    border: "#c4b5fd",
  },
];

function splitSummaryParagraphs(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => normalizeSummarySelection(paragraph))
    .filter(Boolean);
}

function findParagraphIndexForKeyword(paragraphs: string[], anchorText: string) {
  const normalizedAnchor = anchorText.toLocaleLowerCase("ro-RO");
  const index = paragraphs.findIndex((paragraph) =>
    paragraph.toLocaleLowerCase("ro-RO").includes(normalizedAnchor),
  );

  return index === -1 ? 0 : index;
}

function buildProjectSummaryKeywords(
  keywords: StudyProject["keywords"],
  paragraphs: string[],
): SummaryKeyword[] {
  return keywords.map((keyword) => {
    const anchorText = keyword.anchor_text || keyword.term;

    return {
      id: `rezumat-${keyword.id}`,
      label: keyword.term,
      text: anchorText,
      paragraphIndex: findParagraphIndexForKeyword(paragraphs, anchorText),
    };
  });
}

function normalizeSummarySelection(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSummaryHighlightColor(colorId: SummaryHighlightColorId) {
  return (
    summaryHighlightColors.find((color) => color.id === colorId) ??
    summaryHighlightColors[0]
  );
}

function getSummaryHighlightStyle(
  colorId: SummaryHighlightColorId,
): CSSProperties {
  const color = getSummaryHighlightColor(colorId);

  return {
    backgroundColor: color.bg,
    borderColor: color.border,
    color: color.text,
  };
}

function buildSummaryAiResponse(
  selection: PendingSummarySelection,
  paragraphs: string[],
  keywords: SummaryKeyword[],
): LearningAiResponse {
  const normalizedText = selection.text.toLocaleLowerCase("ro-RO");
  const matchedKeyword = keywords.find(
    (keyword) =>
      normalizedText.includes(keyword.text.toLocaleLowerCase("ro-RO")) ||
      normalizedText.includes(keyword.label.toLocaleLowerCase("ro-RO")),
  );
  const concept = matchedKeyword?.label ?? "fragmentul selectat";
  const sourceParagraph = paragraphs[selection.paragraphIndex] ?? selection.text;

  return {
    title: `Explicație rapidă pentru ${concept}`,
    answer: `Fragmentul ales este important pentru că leagă ideea principală din paragraf de felul în care funcționează celula ca sistem. În contextul rezumatului, „${selection.text}” trebuie înțeles ca o piesă din mecanismul general: fiecare structură are un rol, iar rolurile se susțin între ele pentru energie, organizare și adaptare.`,
    bullets: [
      `În paragraf, ideea apare în contextul: ${sourceParagraph.slice(0, 145)}...`,
      "Dacă îl reformulezi pentru examen, pornește de la întrebarea: ce face această componentă pentru supraviețuirea celulei?",
      "Reține legătura cauză-efect: structură → funcție → impact asupra întregii celule.",
    ],
  };
}

function getSummaryParagraphIndex(node: Node | null) {
  const element = node instanceof Element ? node : node?.parentElement;
  const paragraph = element?.closest<HTMLElement>("[data-summary-paragraph]");
  const paragraphIndex = paragraph?.dataset.summaryParagraph;

  if (!paragraphIndex) {
    return null;
  }

  const parsedIndex = Number.parseInt(paragraphIndex, 10);
  return Number.isNaN(parsedIndex) ? null : parsedIndex;
}

function findSummaryRanges(
  paragraph: string,
  searchText: string,
  range: Omit<SummaryRange, "start" | "end">,
) {
  const ranges: SummaryRange[] = [];
  const normalizedParagraph = paragraph.toLocaleLowerCase("ro-RO");
  const normalizedSearchText = searchText.toLocaleLowerCase("ro-RO");
  let searchFrom = 0;

  while (searchFrom < paragraph.length) {
    const start = normalizedParagraph.indexOf(normalizedSearchText, searchFrom);

    if (start === -1) {
      break;
    }

    const end = start + searchText.length;
    ranges.push({ ...range, start, end });
    searchFrom = end;
  }

  return ranges;
}

function renderSummaryText(
  paragraph: string,
  paragraphIndex: number,
  keywords: SummaryKeyword[],
  userHighlights: UserSummaryHighlight[],
  userNotes: UserSummaryNote[],
  keywordClass: string,
  userHighlightClass: string,
  activeKeywordId: string | null,
  isEraseModeActive: boolean,
  onUserHighlightClick: (highlight: UserSummaryHighlight) => void,
  onNoteBadgeClick: (note: UserSummaryNote) => void,
) {
  const keywordRanges = keywords
    .filter((keyword) => keyword.paragraphIndex === paragraphIndex)
    .flatMap((keyword) =>
      findSummaryRanges(paragraph, keyword.text, {
        kind: "keyword",
        keyword,
      }),
    );

  const userRanges = userHighlights
    .filter((highlight) => highlight.paragraphIndex === paragraphIndex)
    .flatMap((highlight) =>
      findSummaryRanges(paragraph, highlight.text, {
        kind: "user",
        highlight,
      }),
    );

  const noteRanges = userNotes
    .filter((note) => note.paragraphIndex === paragraphIndex)
    .flatMap((note) =>
      findSummaryRanges(paragraph, note.text, {
        kind: "note",
        note,
      }),
    );

  const ranges = [...keywordRanges, ...userRanges, ...noteRanges];
  const breakpoints = new Set([0, paragraph.length]);

  ranges.forEach((range) => {
    breakpoints.add(range.start);
    breakpoints.add(range.end);
  });

  const points = [...breakpoints].sort((a, b) => a - b);

  return points.flatMap((start, index) => {
    const end = points[index + 1];

    if (end === undefined || start === end) {
      return [];
    }

    const text = paragraph.slice(start, end);
    const keywordRange = keywordRanges.find(
      (range) => start >= range.start && end <= range.end,
    );
    const userRange = userRanges.find(
      (range) => start >= range.start && end <= range.end,
    );
    const noteRange = noteRanges.find(
      (range) => start >= range.start && end <= range.end,
    );
    const userHighlight = userRange?.highlight;
    const note = noteRange?.note;
    const isHighlightClickable = Boolean(userHighlight) && isEraseModeActive;
    const isActiveKeyword =
      keywordRange?.keyword?.id !== undefined &&
      keywordRange.keyword.id === activeKeywordId;

    const segment = !keywordRange && !userRange && !note ? (
      text
    ) : (
      <mark
        key={`${paragraphIndex}-${start}-${end}`}
        id={
          keywordRange?.keyword && start === keywordRange.start
            ? keywordRange.keyword.id
            : undefined
        }
        role={isHighlightClickable ? "button" : undefined}
        tabIndex={isHighlightClickable ? 0 : undefined}
        title={isHighlightClickable ? "Apasă pentru a șterge highlight-ul" : undefined}
        onClick={
          isHighlightClickable && userHighlight
            ? (event) => {
                event.stopPropagation();
                onUserHighlightClick(userHighlight);
              }
            : undefined
        }
        onKeyDown={
          isHighlightClickable && userHighlight
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onUserHighlightClick(userHighlight);
                }
              }
            : undefined
        }
        className={[
          keywordRange ? keywordClass : "",
          userRange ? userHighlightClass : "",
          isHighlightClickable ? "cursor-pointer" : "",
          note ? "underline decoration-dotted decoration-2 underline-offset-4" : "",
          isActiveKeyword
            ? "animate-pulse ring-2 ring-warning ring-offset-2 ring-offset-surface"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={
          userHighlight ? getSummaryHighlightStyle(userHighlight.color) : undefined
        }
      >
        {text}
      </mark>
    );

    if (note && start === noteRange?.start) {
      return [
        <button
          key={`${paragraphIndex}-${start}-note-badge`}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNoteBadgeClick(note);
          }}
          title="Vezi notița"
          className="mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-info-border bg-info-soft align-middle text-info transition hover:-translate-y-0.5"
        >
          <Icon className="h-3 w-3">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </Icon>
        </button>,
        segment,
      ];
    }

    return segment;
  });
}

function SummaryHighlightColorPicker({
  value,
  onChange,
}: {
  value: SummaryHighlightColorId;
  onChange: (color: SummaryHighlightColorId) => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-info-border bg-surface/70 p-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
        Culoare highlight
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {summaryHighlightColors.map((color) => {
          const isSelected = color.id === value;

          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5 ${
                isSelected ? "ring-2 ring-info/45" : ""
              }`}
              style={{
                backgroundColor: color.bg,
                borderColor: color.border,
                color: color.text,
              }}
              aria-pressed={isSelected}
            >
              <span
                className="h-3 w-3 rounded-full border"
                style={{
                  backgroundColor: color.bg,
                  borderColor: color.text,
                }}
              />
              {color.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${
        active
          ? "border-action bg-action text-on-action"
          : "border-subtle bg-surface text-content hover:bg-surface-hover"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0">{children}</Icon>
      {label}
    </button>
  );
}

function SummaryPanel({
  project,
  onHighlightCreate,
  onHighlightColorChange,
  onHighlightRemove,
  onNoteCreate,
  onNoteUpdate,
  onNoteRemove,
}: {
  project: StudyProject;
  onHighlightCreate: (
    projectId: string,
    highlight: {
      paragraphIndex: number;
      text: string;
      color: ApiSummaryHighlightColor;
    },
  ) => Promise<void>;
  onHighlightColorChange: (
    projectId: string,
    highlightId: string,
    color: ApiSummaryHighlightColor,
  ) => Promise<void>;
  onHighlightRemove: (projectId: string, highlightId: string) => Promise<void>;
  onNoteCreate: (
    projectId: string,
    note: { paragraphIndex: number; text: string; note: string },
  ) => Promise<void>;
  onNoteUpdate: (
    projectId: string,
    noteId: string,
    note: string,
  ) => Promise<void>;
  onNoteRemove: (projectId: string, noteId: string) => Promise<void>;
}) {
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const keywordFocusTimer = useRef<number | null>(null);
  const aiResponseTimer = useRef<number | null>(null);
  const selectionChangeTimer = useRef<number | null>(null);
  const readCurrentSelectionRef = useRef<() => void>(() => {});
  const [activeTool, setActiveTool] = useState<SummaryToolMode | null>(null);
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
  const [aiDialog, setAiDialog] = useState<SummaryAiDialog | null>(null);
  const [pendingHighlightColor, setPendingHighlightColor] =
    useState<SummaryHighlightColorId>(defaultSummaryHighlightColor);
  const [notePanel, setNotePanel] = useState<SummaryNotePanelState | null>(
    null,
  );
  const userHighlights = project.summaryHighlights;
  const userNotes = project.summaryNotes;
  const summaryContent = project.summary?.content ?? "";
  const displayParagraphs = useMemo(() => {
    if (!summaryContent) {
      return [];
    }

    const paragraphs = splitSummaryParagraphs(summaryContent);
    return paragraphs.length ? paragraphs : [summaryContent];
  }, [summaryContent]);
  const displayKeywords = useMemo(() => {
    if (!project.keywords.length) {
      return [];
    }

    return buildProjectSummaryKeywords(project.keywords, displayParagraphs);
  }, [displayParagraphs, project.keywords]);
  const summaryTitle = `Rezumat pentru ${project.name}`;

  const keywordHighlightClass =
    "scroll-mt-28 rounded-md border border-warning-border bg-warning-soft px-1.5 py-0.5 font-semibold text-warning";
  const userHighlightClass =
    "box-decoration-clone rounded-md border px-1.5 py-0.5 font-semibold";

  useEffect(() => {
    return () => {
      if (keywordFocusTimer.current) {
        window.clearTimeout(keywordFocusTimer.current);
      }
      if (aiResponseTimer.current) {
        window.clearTimeout(aiResponseTimer.current);
      }
      if (selectionChangeTimer.current) {
        window.clearTimeout(selectionChangeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    function scheduleSelectionCheck() {
      if (selectionChangeTimer.current) {
        window.clearTimeout(selectionChangeTimer.current);
      }
      selectionChangeTimer.current = window.setTimeout(() => {
        readCurrentSelectionRef.current();
        selectionChangeTimer.current = null;
      }, 300);
    }

    function handleTouchStart() {
      // The user is actively touching (initial press or handle-drag
      // adjustment) — cancel any pending check so nothing fires mid-gesture.
      if (selectionChangeTimer.current) {
        window.clearTimeout(selectionChangeTimer.current);
        selectionChangeTimer.current = null;
      }
    }

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchend", scheduleSelectionCheck, {
      passive: true,
    });
    document.addEventListener("touchcancel", scheduleSelectionCheck, {
      passive: true,
    });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", scheduleSelectionCheck);
      document.removeEventListener("touchcancel", scheduleSelectionCheck);
    };
  }, []);

  useEffect(() => {
    readCurrentSelectionRef.current = readCurrentSelection;
  });

  if (!project.summary?.content) {
    return (
      <article className="rounded-[2rem] border border-subtle bg-surface p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Rezumat
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight">
          Rezumatul nu este generat încă.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
          Descarcă promptul proiectului, generează JSON-ul în ChatGPT și
          importă fișierul ca să vezi conținutul real aici.
        </p>
      </article>
    );
  }

  async function handleApplyHighlight(selection: PendingSummarySelection) {
    const existingHighlight = userHighlights.find(
      (highlight) =>
        highlight.paragraphIndex === selection.paragraphIndex &&
        highlight.text === selection.text,
    );

    try {
      if (existingHighlight) {
        await onHighlightColorChange(
          project.id,
          existingHighlight.id,
          pendingHighlightColor,
        );
      } else {
        await onHighlightCreate(project.id, {
          paragraphIndex: selection.paragraphIndex,
          text: selection.text,
          color: pendingHighlightColor,
        });
      }
    } catch {
      // Selection stays available so the user can try highlighting again.
    }

    window.getSelection()?.removeAllRanges();
  }

  async function handleRemoveHighlight(highlightId: string) {
    try {
      await onHighlightRemove(project.id, highlightId);
    } catch {
      // If deletion failed, the highlight remains in project.summaryHighlights.
    }
  }

  function handleAskAi(selection: PendingSummarySelection) {
    if (aiResponseTimer.current) {
      window.clearTimeout(aiResponseTimer.current);
    }

    setAiDialog({
      ...selection,
      status: "loading",
    });

    aiResponseTimer.current = window.setTimeout(() => {
      setAiDialog({
        ...selection,
        status: "done",
        response: buildSummaryAiResponse(
          selection,
          displayParagraphs,
          displayKeywords,
        ),
      });
      aiResponseTimer.current = null;
    }, 950);

    window.getSelection()?.removeAllRanges();
  }

  function handleCloseAiDialog() {
    if (aiResponseTimer.current) {
      window.clearTimeout(aiResponseTimer.current);
      aiResponseTimer.current = null;
    }

    setAiDialog(null);
  }

  function handleKeywordClick(keywordId: string) {
    if (keywordFocusTimer.current) {
      window.clearTimeout(keywordFocusTimer.current);
    }

    setActiveKeywordId(keywordId);
    keywordFocusTimer.current = window.setTimeout(() => {
      setActiveKeywordId((currentKeywordId) =>
        currentKeywordId === keywordId ? null : currentKeywordId,
      );
      keywordFocusTimer.current = null;
    }, 1800);
  }

  function readCurrentSelection() {
    const root = summaryRef.current;
    const selection = window.getSelection();

    if (!root || !selection || selection.isCollapsed) {
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      !anchorNode ||
      !focusNode ||
      !root.contains(anchorNode) ||
      !root.contains(focusNode)
    ) {
      return;
    }

    const anchorParagraphIndex = getSummaryParagraphIndex(anchorNode);
    const focusParagraphIndex = getSummaryParagraphIndex(focusNode);
    const selectedText = normalizeSummarySelection(selection.toString());

    if (
      anchorParagraphIndex === null ||
      focusParagraphIndex === null ||
      anchorParagraphIndex !== focusParagraphIndex ||
      selectedText.length < 3
    ) {
      return;
    }

    const selectionPayload: PendingSummarySelection = {
      text: selectedText,
      paragraphIndex: anchorParagraphIndex,
    };

    if (activeTool === "note") {
      setNotePanel({ mode: "create", selection: selectionPayload, draft: "" });
      return;
    }

    if (activeTool === "ai") {
      handleAskAi(selectionPayload);
      return;
    }

    if (activeTool === "highlight") {
      handleApplyHighlight(selectionPayload);
    }
  }

  function handleHighlightSpanClick(highlight: UserSummaryHighlight) {
    if (activeTool !== "erase") {
      return;
    }
    handleRemoveHighlight(highlight.id);
  }

  function handleToggleTool(tool: SummaryToolMode) {
    setActiveTool((current) => (current === tool ? null : tool));
    setNotePanel(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleOpenNoteViewer(note: UserSummaryNote) {
    setNotePanel({ mode: "view", note, draft: note.note });
  }

  async function handleSaveNote() {
    if (!notePanel || !notePanel.draft.trim()) {
      return;
    }

    try {
      if (notePanel.mode === "create") {
        await onNoteCreate(project.id, {
          paragraphIndex: notePanel.selection.paragraphIndex,
          text: notePanel.selection.text,
          note: notePanel.draft.trim(),
        });
      } else {
        await onNoteUpdate(
          project.id,
          notePanel.note.id,
          notePanel.draft.trim(),
        );
      }
    } catch {
      return;
    }

    setNotePanel(null);
    window.getSelection()?.removeAllRanges();
  }

  async function handleDeleteNote() {
    if (!notePanel || notePanel.mode !== "view") {
      return;
    }

    try {
      await onNoteRemove(project.id, notePanel.note.id);
    } catch {
      return;
    }

    setNotePanel(null);
  }

  function handleCloseNotePanel() {
    setNotePanel(null);
    window.getSelection()?.removeAllRanges();
  }

  const toolCursorClass =
    activeTool === "highlight"
      ? "cursor-crosshair"
      : activeTool === "erase"
        ? "cursor-pointer"
        : activeTool === "ai"
          ? "cursor-help"
          : activeTool === "note"
            ? "cursor-text"
            : "";

  const toolHintText =
    activeTool === "highlight"
      ? "Selectează un fragment ca să-l evidențiezi cu culoarea aleasă."
      : activeTool === "erase"
        ? "Apasă pe un text evidențiat ca să-l ștergi."
        : activeTool === "ai"
          ? "Selectează un fragment ca să întrebi AI despre el."
          : activeTool === "note"
            ? "Selectează un fragment ca să adaugi o notiță."
            : null;

  return (
    <article className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7 lg:p-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="max-w-none">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Rezumat complet
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight">
            {summaryTitle}
          </h2>

          <div className="mt-5 rounded-2xl border border-dashed border-subtle bg-app px-4 py-3 text-sm leading-6 text-muted">
            Alege un instrument din dreapta, apoi selectează un fragment din
            rezumat.
          </div>

          {notePanel ? (
            <div className="sticky top-16 z-20 mt-4 rounded-2xl border border-info-border bg-info-soft/95 p-4 text-info shadow-2xl shadow-black/10 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                {notePanel.mode === "create" ? "Notiță nouă" : "Notiță"}
              </p>
              <p className="mt-2 text-sm leading-6">
                “
                {notePanel.mode === "create"
                  ? notePanel.selection.text
                  : notePanel.note.text}
                ”
              </p>
              <textarea
                value={notePanel.draft}
                onChange={(event) =>
                  setNotePanel((current) =>
                    current
                      ? { ...current, draft: event.target.value }
                      : current,
                  )
                }
                placeholder="Scrie o notiță pentru acest fragment..."
                rows={4}
                className="mt-3 w-full rounded-2xl border border-info-border bg-surface p-3 text-sm text-content outline-none focus:ring-2 focus:ring-info/40"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={!notePanel.draft.trim()}
                  className="rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvează
                </button>
                {notePanel.mode === "view" ? (
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    className="rounded-full border border-danger-border bg-surface px-4 py-2 text-xs font-bold text-danger transition hover:bg-danger-soft"
                  >
                    Șterge notița
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleCloseNotePanel}
                  className="rounded-full border border-info-border px-4 py-2 text-xs font-bold transition hover:bg-info-soft/70"
                >
                  Anulează
                </button>
              </div>
            </div>
          ) : null}

          <div
            ref={summaryRef}
            onKeyUp={readCurrentSelection}
            onMouseUp={readCurrentSelection}
            className={`mt-6 space-y-5 text-sm leading-7 text-content/85 sm:text-base sm:leading-8 ${toolCursorClass}`}
          >
            {displayParagraphs.map((paragraph, paragraphIndex) => (
              <p
                key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}
                data-summary-paragraph={paragraphIndex}
                className="select-text"
              >
                {renderSummaryText(
                  paragraph,
                  paragraphIndex,
                  displayKeywords,
                  userHighlights,
                  userNotes,
                  keywordHighlightClass,
                  userHighlightClass,
                  activeKeywordId,
                  activeTool === "erase",
                  handleHighlightSpanClick,
                  handleOpenNoteViewer,
                )}
              </p>
            ))}
          </div>

          <div className="mt-8 border-t border-subtle pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Cuvinte cheie din rezumat
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {displayKeywords.map((keyword) => (
                <a
                  key={keyword.id}
                  href={`#${keyword.id}`}
                  onClick={() => handleKeywordClick(keyword.id)}
                  className="rounded-full border border-warning-border bg-warning-soft px-3 py-1.5 text-xs font-bold text-warning transition hover:-translate-y-0.5 hover:bg-warning-soft/80"
                >
                  {keyword.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <aside className="h-fit space-y-2 rounded-3xl border border-subtle bg-app p-5 xl:sticky xl:top-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Instrumente
          </p>

          <div className="space-y-2 pt-1">
            <SummaryToolButton
              label="Evidențiază"
              active={activeTool === "highlight"}
              onClick={() => handleToggleTool("highlight")}
            >
              <path d="m9 11-6 6v3h9l3-3" />
              <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4l8 8Z" />
            </SummaryToolButton>
            {activeTool === "highlight" ? (
              <SummaryHighlightColorPicker
                value={pendingHighlightColor}
                onChange={setPendingHighlightColor}
              />
            ) : null}

            <SummaryToolButton
              label="Șterge"
              active={activeTool === "erase"}
              onClick={() => handleToggleTool("erase")}
            >
              <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
              <path d="M22 21H7" />
              <path d="m5 11 9 9" />
            </SummaryToolButton>

            <SummaryToolButton
              label="AI"
              active={activeTool === "ai"}
              onClick={() => handleToggleTool("ai")}
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            </SummaryToolButton>

            <SummaryToolButton
              label="Notiță"
              active={activeTool === "note"}
              onClick={() => handleToggleTool("note")}
            >
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </SummaryToolButton>
          </div>

          {toolHintText ? (
            <p className="mt-1 rounded-2xl border border-dashed border-subtle bg-surface/60 p-3 text-xs leading-5 text-muted">
              {toolHintText}
            </p>
          ) : null}
        </aside>
      </div>

      {aiDialog ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-ai-title"
        >
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-subtle bg-surface shadow-2xl shadow-black/25">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-subtle bg-app/80 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-info">
                  Revizzio AI
                </p>
                <h3
                  id="summary-ai-title"
                  className="mt-2 font-serif text-2xl font-semibold leading-tight text-content"
                >
                  {aiDialog.status === "loading"
                    ? "Generez explicația"
                    : aiDialog.response?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseAiDialog}
                className="rounded-full border border-subtle px-4 py-2 text-xs font-bold text-content transition hover:bg-surface"
              >
                Închide
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <div className="space-y-5">
              <div className="rounded-3xl border border-info-border bg-info-soft p-4 text-info">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                  Ai întrebat despre
                </p>
                <p className="mt-2 text-sm leading-6">“{aiDialog.text}”</p>
              </div>

              {aiDialog.status === "loading" ? (
                <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-subtle bg-app p-6 text-center">
                  <div>
                    <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-info-border border-t-info" />
                    <p className="mt-5 font-serif text-2xl font-semibold text-content">
                      Analizez fragmentul...
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                      Caut legătura cu rezumatul, extrag ideea utilă pentru examen
                      și o formulez pe scurt.
                    </p>
                    <div className="mx-auto mt-6 max-w-sm space-y-2">
                      <div className="h-3 animate-pulse rounded-full bg-info-soft" />
                      <div className="h-3 w-4/5 animate-pulse rounded-full bg-info-soft" />
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-info-soft" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <p className="text-base leading-8 text-content/85">
                    {aiDialog.response?.answer}
                  </p>
                  <div className="rounded-3xl border border-subtle bg-app p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                      Cum să reții
                    </p>
                    <div className="mt-3 space-y-3">
                      {aiDialog.response?.bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="flex gap-3 rounded-2xl border border-subtle bg-surface p-3 text-sm leading-6 text-content/80"
                        >
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" />
                          <p>{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

type FlashcardStudyCard = {
  id: FlashcardDeckId;
  badge: string;
  title: string;
  description: string;
  duration: string;
  metric: string;
};

type FlashcardDeckId = "initial" | "quiz" | "manual";

type AccountFlashcard = StudyFlashcardCard;

type AccountFlashcardDeck = {
  eyebrow: string;
  title: string;
  description: string;
  cards: AccountFlashcard[];
};

type FlashcardShuffleMixGhost = {
  card: AccountFlashcard;
  startDistance: number;
  endDistance: number;
  variant: number;
};

type FlashcardShuffleState =
  | {
      id: number;
      mode: "move";
      card: AccountFlashcard;
      direction: 1 | -1;
      durationMs: number;
    }
  | {
      id: number;
      mode: "mix";
      ghosts: FlashcardShuffleMixGhost[];
      durationMs: number;
    };

type FlashcardTextSide = "question" | "answer";

type PendingFlashcardSelection = {
  text: string;
  side: FlashcardTextSide;
  topic: string;
};

type FlashcardAiDialog = {
  text: string;
  side: FlashcardTextSide;
  topic: string;
  status: "loading" | "done";
  response?: LearningAiResponse;
};

const accountFlashcardLayouts = [
  {
    x: "var(--flashcard-x-0, 0px)",
    y: "var(--flashcard-y-0, 8px)",
    rotate: -1.5,
  },
  {
    x: "var(--flashcard-x-1, 48px)",
    y: "var(--flashcard-y-1, 36px)",
    rotate: 5.5,
  },
  {
    x: "var(--flashcard-x-2, -38px)",
    y: "var(--flashcard-y-2, 58px)",
    rotate: -6.5,
  },
  {
    x: "var(--flashcard-x-3, 30px)",
    y: "var(--flashcard-y-3, 84px)",
    rotate: 3.5,
  },
];

function buildProjectFlashcardDecks(
  project: StudyProject,
): Record<FlashcardDeckId, AccountFlashcardDeck> {
  const generatedFlashcards = getGeneratedFlashcards(project.flashcards);

  const tones: AccountFlashcard["tone"][] = [
    "success",
    "warning",
    "info",
    "danger",
  ];
  const cards = generatedFlashcards.map((card, index) => ({
    id: `initial-${card.id || index}-${index}`,
    flashcardId: card.id,
    topic: card.category || project.subjectName,
    question: card.front,
    answer: card.back,
    tone: tones[index % tones.length],
    review: card.review,
  }));
  const quizMistakeCards = project.quizMistakeFlashcards;
  const manualCards = project.manualFlashcards;

  return {
    initial: {
      eyebrow: "Generate initial",
      title: generatedFlashcards.length
        ? `Flashcard-uri pentru ${project.name}`
        : "Flashcardurile nu sunt generate încă",
      description:
        generatedFlashcards.length
          ? "Pachetul importat din JSON-ul generat, pregătit pentru recapitulare activă."
          : "Importă JSON-ul generat ca să vezi aici flashcardurile reale ale proiectului.",
      cards,
    },
    quiz: {
      eyebrow: "Din quiz-urile tale",
      title: quizMistakeCards.length
        ? "Întrebările greșite transformate în flashcarduri"
        : "Aici apar întrebările greșite",
      description:
        quizMistakeCards.length
          ? "Fiecare greșeală din quiz devine automat un card de recapitulare."
          : "Fă un quiz. Când greșești, Revizzio pune întrebarea și răspunsul corect aici.",
      cards: quizMistakeCards,
    },
    manual: {
      eyebrow: "Create de tine",
      title: manualCards.length
        ? "Flashcardurile tale"
        : "Creează primul flashcard",
      description:
        "Flashcardurile create manual rămân separate de cele generate automat.",
      cards: manualCards,
    },
  };
}

function toAccountFlashcardTransform(
  layout: (typeof accountFlashcardLayouts)[number],
) {
  return `translate3d(${layout.x}, ${layout.y}, 0) rotate(${layout.rotate}deg)`;
}

function getAccountFlashcardLayout(distance: number) {
  return accountFlashcardLayouts[
    Math.min(distance, accountFlashcardLayouts.length - 1)
  ];
}

function shuffleAccountFlashcards(
  cards: AccountFlashcard[],
  activeIndex: number,
) {
  const shuffledCards = [...cards];

  for (let index = shuffledCards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledCards[index], shuffledCards[randomIndex]] = [
      shuffledCards[randomIndex],
      shuffledCards[index],
    ];
  }

  if (
    shuffledCards.length > 1 &&
    shuffledCards[0]?.id === cards[activeIndex]?.id
  ) {
    const nextDifferentCardIndex = shuffledCards.findIndex(
      (card) => card.id !== cards[activeIndex]?.id,
    );

    if (nextDifferentCardIndex > 0) {
      [shuffledCards[0], shuffledCards[nextDifferentCardIndex]] = [
        shuffledCards[nextDifferentCardIndex],
        shuffledCards[0],
      ];
    }
  }

  return shuffledCards;
}

function getFlashcardShuffleMixGhosts(
  cards: AccountFlashcard[],
  activeIndex: number,
): FlashcardShuffleMixGhost[] {
  const visibleCount = Math.min(cards.length, accountFlashcardLayouts.length);

  return Array.from({ length: visibleCount }, (_, distance) => ({
    card: cards[(activeIndex + distance) % cards.length],
    startDistance: distance,
    endDistance: (distance * 2 + 1) % visibleCount,
    variant: distance % accountFlashcardLayouts.length,
  }));
}

function getFlashcardTextSide(node: Node | null): FlashcardTextSide | null {
  const element = node instanceof Element ? node : node?.parentElement;
  const textElement = element?.closest<HTMLElement>("[data-flashcard-text]");
  const side = textElement?.dataset.flashcardText;

  if (side === "question" || side === "answer") {
    return side;
  }

  return null;
}

function getFlashcardTextDensity(text: string) {
  const normalizedLength = text.trim().replace(/\s+/g, " ").length;

  if (normalizedLength > 480) return "xxs";
  if (normalizedLength > 320) return "xs";
  if (normalizedLength > 200) return "sm";
  if (normalizedLength > 110) return "md";
  return "lg";
}

function buildFlashcardAiResponse(
  selection: PendingFlashcardSelection,
): LearningAiResponse {
  const sideLabel = selection.side === "question" ? "întrebarea" : "răspunsul";
  const oppositeLabel =
    selection.side === "question" ? "răspunsul de pe spate" : "întrebarea";

  return {
    title: `Explicație pentru ${sideLabel}`,
    answer: `Fragmentul selectat din flashcardul „${selection.topic}” merită privit ca o piesă de verificare rapidă. Înainte să memorezi formularea exactă, încearcă să vezi ce relație testează: termenul-cheie, rolul lui și legătura cu restul celulei.`,
    bullets: [
      `Text selectat: „${selection.text}”`,
      `Compară fragmentul cu ${oppositeLabel} și verifică dacă poți explica ideea fără să te uiți pe card.`,
      "Transformă explicația într-o propoziție scurtă: concept → funcție → de ce contează.",
    ],
  };
}

function FlashcardTicket({
  card,
  onOpenDeck,
}: {
  card: FlashcardStudyCard;
  onOpenDeck: (deckId: FlashcardDeckId) => void;
}) {
  return (
    <article className="theme-shadow-card overflow-hidden rounded-[1.25rem] border border-subtle bg-surface">
      <div className="p-5">
        <span className="inline-flex rounded-full bg-success-soft px-3 py-1 text-[11px] font-bold text-success">
          {card.badge}
        </span>
        <h2 className="mt-3 font-serif text-xl font-semibold">
          {card.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          {card.description}
        </p>
      </div>
      <div className="relative border-t border-dashed border-subtle">
        <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-subtle bg-app" />
        <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-subtle bg-app" />
      </div>
      <div className="flex items-center justify-between gap-4 p-5">
        <span className="text-xs text-muted">
          durată est.
          <b className="block font-serif text-lg font-semibold text-content">
            {card.duration}
          </b>
          <span className="mt-1 block">{card.metric}</span>
        </span>
        <button
          type="button"
          onClick={() => onOpenDeck(card.id)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-content px-4 py-2.5 text-sm font-semibold text-app transition hover:opacity-90"
        >
          Continuă
          <Icon>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </Icon>
        </button>
      </div>
    </article>
  );
}

function AccountFlashcardFaceContent({
  card,
  side,
  onFlip,
  onToggleReview,
}: {
  card: AccountFlashcard;
  side: "question" | "answer";
  onFlip?: () => void;
  onToggleReview?: () => void;
}) {
  const isAnswer = side === "answer";
  const text = isAnswer ? card.answer : card.question;
  const image = isAnswer ? undefined : card.questionImage;
  const textDensity = getFlashcardTextDensity(text);
  const flipLabel = isAnswer ? "Vezi întrebarea" : "Vezi răspunsul";

  return (
    <div className="flashcard-card-content h-full">
      {onToggleReview ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleReview();
          }}
          className={`absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition ${
            card.review
              ? "border-action bg-action text-on-action"
              : "border-subtle bg-app text-muted hover:bg-surface-hover hover:text-content"
          }`}
          aria-pressed={card.review}
          aria-label={
            card.review
              ? "Scoate flashcardul din recapitulare"
              : "Marchează flashcardul pentru recapitulare"
          }
        >
          <Icon className="h-4 w-4">
            <path d="M9.5 2a2.5 2.5 0 0 0-2.5 2.5v.5a3 3 0 0 0-2 2.83V8a3 3 0 0 0-1 5.83V15a3 3 0 0 0 3 3 2.5 2.5 0 0 0 2.5 2.5h.5a2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z" />
            <path d="M14.5 2a2.5 2.5 0 0 1 2.5 2.5v.5a3 3 0 0 1 2 2.83V8a3 3 0 0 1 1 5.83V15a3 3 0 0 1-3 3 2.5 2.5 0 0 1-2.5 2.5h-.5a2.5 2.5 0 0 1-2.5-2.5V4.5A2.5 2.5 0 0 1 14.5 2Z" />
          </Icon>
        </button>
      ) : null}
      <div className="flashcard-card-main flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-hidden">
        {image ? (
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-subtle bg-app/60 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="h-full max-h-full w-full max-w-full object-contain"
            />
          </div>
        ) : null}
        {text ? (
          <h3
            data-flashcard-text={side}
            data-density={textDensity}
            className="flashcard-card-question select-text font-serif font-semibold"
          >
            {text}
          </h3>
        ) : null}
      </div>

      <div className="flashcard-card-footer absolute inset-x-6 bottom-6 flex items-center border-t border-subtle pt-4 text-xs font-bold text-muted sm:inset-x-8">
        {onFlip ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onFlip();
            }}
            className="flashcard-card-action rounded-full border border-subtle bg-app px-3 py-1.5 text-content transition hover:-translate-y-0.5 hover:bg-surface-hover"
          >
            {flipLabel}
          </button>
        ) : (
          <span className="flashcard-card-action">{flipLabel}</span>
        )}
      </div>
    </div>
  );
}

function AccountFlashcardContent({
  card,
  flipped = false,
  onFlip,
  onToggleReview,
}: {
  card: AccountFlashcard;
  flipped?: boolean;
  onFlip?: () => void;
  onToggleReview?: () => void;
}) {
  return (
    <div
      className="flashcard-flip h-full"
      data-flipped={flipped ? "true" : "false"}
    >
      <div className="flashcard-flip-inner">
        <div className="flashcard-face-side theme-shadow-card rounded-[1.75rem] border border-subtle bg-surface p-6 text-content sm:p-8">
          <AccountFlashcardFaceContent
            card={card}
            side="question"
            onFlip={onFlip}
            onToggleReview={onToggleReview}
          />
        </div>
        <div className="flashcard-face-side flashcard-face-side-back theme-shadow-card rounded-[1.75rem] border border-subtle bg-surface p-6 text-content sm:p-8">
          <AccountFlashcardFaceContent
            card={card}
            side="answer"
            onFlip={onFlip}
            onToggleReview={onToggleReview}
          />
        </div>
      </div>
    </div>
  );
}

function FlashcardDeckPage({
  deck,
  onBack,
  onToggleReview,
}: {
  deck: AccountFlashcardDeck;
  onBack: () => void;
  onToggleReview: (flashcardId: string, review: boolean) => Promise<void>;
}) {
  const flashcardTextRef = useRef<HTMLDivElement | null>(null);
  const shuffleIdRef = useRef(0);
  const shuffleTimerRef = useRef<number | null>(null);
  const aiResponseTimerRef = useRef<number | null>(null);
  const fullCardsRef = useRef<AccountFlashcard[]>(deck.cards);
  const [cards, setCards] = useState<AccountFlashcard[]>(deck.cards);
  const [showReviewOnly, setShowReviewOnly] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffle, setShuffle] = useState<FlashcardShuffleState | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pendingFlashcardSelection, setPendingFlashcardSelection] =
    useState<PendingFlashcardSelection | null>(null);
  const [flashcardAiDialog, setFlashcardAiDialog] =
    useState<FlashcardAiDialog | null>(null);
  const hasCards = cards.length > 0;
  const isAnimating = Boolean(shuffle);

  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) {
        window.clearTimeout(shuffleTimerRef.current);
      }
      if (aiResponseTimerRef.current) {
        window.clearTimeout(aiResponseTimerRef.current);
      }
    };
  }, []);

  function moveCard(direction: 1 | -1) {
    if (!hasCards || isAnimating || cards.length <= 1) {
      return;
    }

    const previousIndex = activeIndex;
    const nextIndex =
      (activeIndex + direction + cards.length) % cards.length;
    const animatedCard = cards[direction === 1 ? previousIndex : nextIndex];

    shuffleIdRef.current += 1;
    setShowAnswer(false);
    setPendingFlashcardSelection(null);
    window.getSelection()?.removeAllRanges();
    setShuffle({
      id: shuffleIdRef.current,
      mode: "move",
      card: animatedCard,
      direction,
      durationMs: 1150,
    });
    setActiveIndex(nextIndex);

    shuffleTimerRef.current = window.setTimeout(() => {
      setShuffle(null);
      shuffleTimerRef.current = null;
    }, 1150);
  }

  function shuffleDeck() {
    if (!hasCards || isAnimating || cards.length <= 1) {
      return;
    }

    const shuffledCards = shuffleAccountFlashcards(cards, activeIndex);
    const ghosts = getFlashcardShuffleMixGhosts(cards, activeIndex);

    shuffleIdRef.current += 1;
    setShowAnswer(false);
    setPendingFlashcardSelection(null);
    window.getSelection()?.removeAllRanges();
    setShuffle({
      id: shuffleIdRef.current,
      mode: "mix",
      ghosts,
      durationMs: 920,
    });

    shuffleTimerRef.current = window.setTimeout(() => {
      setCards(shuffledCards);
      if (!showReviewOnly) {
        fullCardsRef.current = shuffledCards;
      }
      setActiveIndex(0);
      setShuffle(null);
      shuffleTimerRef.current = null;
    }, 920);
  }

  function toggleReviewOnlyFilter() {
    setShowReviewOnly((current) => {
      const next = !current;
      setCards(
        next
          ? fullCardsRef.current.filter((card) => card.review)
          : fullCardsRef.current,
      );
      setActiveIndex(0);
      return next;
    });
  }

  function handleToggleReview(card: AccountFlashcard) {
    const nextReview = !card.review;
    const applyReview = (list: AccountFlashcard[]) =>
      list.map((item) =>
        item.id === card.id ? { ...item, review: nextReview } : item,
      );

    fullCardsRef.current = applyReview(fullCardsRef.current);
    setCards((currentCards) => {
      const updated = applyReview(currentCards);
      return showReviewOnly ? updated.filter((item) => item.review) : updated;
    });

    onToggleReview(card.flashcardId, nextReview).catch(() => {
      const revertReview = (list: AccountFlashcard[]) =>
        list.map((item) =>
          item.id === card.id ? { ...item, review: card.review } : item,
        );
      fullCardsRef.current = revertReview(fullCardsRef.current);
      setCards((currentCards) => {
        const reverted = revertReview(currentCards);
        return showReviewOnly
          ? reverted.filter((item) => item.review)
          : reverted;
      });
    });
  }

  function toggleFlashcardSide() {
    setShowAnswer((visible) => !visible);
    setPendingFlashcardSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function readFlashcardSelection() {
    if (!hasCards) {
      return;
    }

    const root = flashcardTextRef.current;
    const selection = window.getSelection();

    if (!root || !selection || selection.isCollapsed) {
      return;
    }

    const anchorNode = selection.anchorNode;
    const focusNode = selection.focusNode;

    if (
      !anchorNode ||
      !focusNode ||
      !root.contains(anchorNode) ||
      !root.contains(focusNode)
    ) {
      return;
    }

    const anchorSide = getFlashcardTextSide(anchorNode);
    const focusSide = getFlashcardTextSide(focusNode);
    const selectedText = normalizeSummarySelection(selection.toString());

    if (!anchorSide || anchorSide !== focusSide || selectedText.length < 3) {
      return;
    }

    setPendingFlashcardSelection({
      text: selectedText,
      side: anchorSide,
      topic: cards[activeIndex].topic,
    });
  }

  function handleAskFlashcardAi() {
    if (!pendingFlashcardSelection) {
      return;
    }

    if (aiResponseTimerRef.current) {
      window.clearTimeout(aiResponseTimerRef.current);
    }

    setFlashcardAiDialog({
      ...pendingFlashcardSelection,
      status: "loading",
    });

    aiResponseTimerRef.current = window.setTimeout(() => {
      setFlashcardAiDialog({
        ...pendingFlashcardSelection,
        status: "done",
        response: buildFlashcardAiResponse(pendingFlashcardSelection),
      });
      aiResponseTimerRef.current = null;
    }, 950);
  }

  function handleCloseFlashcardAiDialog() {
    if (aiResponseTimerRef.current) {
      window.clearTimeout(aiResponseTimerRef.current);
      aiResponseTimerRef.current = null;
    }

    setFlashcardAiDialog(null);
  }

  const shufflingCardIds =
    shuffle?.mode === "move"
      ? [shuffle.card.id]
      : shuffle?.mode === "mix"
        ? shuffle.ghosts.map((ghost) => ghost.card.id)
        : [];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7 lg:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-subtle bg-app px-4 text-sm font-semibold text-content shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Înapoi la pachete
      </button>

      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            {deck.eyebrow}
          </p>
          <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            {deck.title}
          </h2>
          {pendingFlashcardSelection ? (
            <div className="sticky top-16 z-20 mt-4 rounded-2xl border border-info-border bg-info-soft/95 p-4 text-info shadow-2xl shadow-black/10 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                Text selectat din{" "}
                {pendingFlashcardSelection.side === "question"
                  ? "întrebare"
                  : "răspuns"}
              </p>
              <p className="mt-2 text-sm leading-6">
                “{pendingFlashcardSelection.text}”
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAskFlashcardAi}
                  className="rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover"
                >
                  Întreabă AI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingFlashcardSelection(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="rounded-full border border-info-border px-4 py-2 text-xs font-bold transition hover:bg-info-soft/70"
                >
                  Renunță
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="lg:-mt-2">
          {hasCards ? (
            <div
              ref={flashcardTextRef}
              onKeyUp={readFlashcardSelection}
              onMouseUp={readFlashcardSelection}
              className="flashcard-story-deck relative mx-auto w-full max-w-xl"
            >
              {cards.map((card, index) => {
                const distance =
                  (index - activeIndex + cards.length) % cards.length;
                const isActive = distance === 0;
                const isShuffling = shufflingCardIds.includes(card.id);
                const visibleLayer = Math.max(
                  0,
                  accountFlashcardLayouts.length - distance,
                );

                if (
                  distance >= accountFlashcardLayouts.length &&
                  !isShuffling
                ) {
                  return null;
                }

                return (
                  <div
                    key={card.id}
                    aria-hidden={!isActive}
                    className="flashcard-desk-card flashcard-face absolute inset-x-3 top-0 rounded-[1.75rem] text-left outline-none transition sm:inset-x-0"
                    style={{
                      zIndex: isShuffling ? 0 : visibleLayer,
                      transform: toAccountFlashcardTransform(
                        getAccountFlashcardLayout(distance),
                      ),
                      visibility: isShuffling ? "hidden" : "visible",
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <AccountFlashcardContent
                      card={card}
                      flipped={showAnswer && isActive}
                      onFlip={isActive ? toggleFlashcardSide : undefined}
                      onToggleReview={
                        isActive ? () => handleToggleReview(card) : undefined
                      }
                    />
                  </div>
                );
              })}

              {shuffle?.mode === "move" ? (
                <div
                  key={shuffle.id}
                  aria-hidden="true"
                  className={`flashcard-shuffle-ghost flashcard-face pointer-events-none absolute inset-x-3 top-0 text-left sm:inset-x-0 ${
                    shuffle.direction === 1
                      ? "flashcard-shuffle-forward"
                      : "flashcard-shuffle-reverse"
                  }`}
                  style={
                    {
                      "--shuffle-start": toAccountFlashcardTransform(
                        shuffle.direction === 1
                          ? getAccountFlashcardLayout(0)
                          : getAccountFlashcardLayout(cards.length - 1),
                      ),
                      "--shuffle-end": toAccountFlashcardTransform(
                        shuffle.direction === 1
                          ? getAccountFlashcardLayout(cards.length - 1)
                          : getAccountFlashcardLayout(0),
                      ),
                      "--shuffle-duration": `${shuffle.durationMs}ms`,
                    } as CSSProperties
                  }
                >
                  <AccountFlashcardContent card={shuffle.card} />
                </div>
              ) : null}

              {shuffle?.mode === "mix"
                ? shuffle.ghosts.map((ghost, index) => (
                    <div
                      key={`${shuffle.id}-${ghost.card.id}`}
                      aria-hidden="true"
                      className={`flashcard-shuffle-ghost flashcard-shuffle-mix flashcard-shuffle-mix-${ghost.variant} flashcard-face pointer-events-none absolute inset-x-3 top-0 text-left sm:inset-x-0`}
                      style={
                        {
                          "--shuffle-start": toAccountFlashcardTransform(
                            getAccountFlashcardLayout(ghost.startDistance),
                          ),
                          "--shuffle-end": toAccountFlashcardTransform(
                            getAccountFlashcardLayout(ghost.endDistance),
                          ),
                          "--shuffle-duration": `${shuffle.durationMs}ms`,
                          "--shuffle-delay": `${index * 35}ms`,
                          "--mix-layer": index,
                        } as CSSProperties
                      }
                    >
                      <AccountFlashcardContent card={ghost.card} />
                    </div>
                  ))
                : null}
            </div>
          ) : (
            <div className="grid min-h-[22rem] place-items-center rounded-[2rem] border border-dashed border-subtle bg-app p-6 text-center">
              <div>
                {showReviewOnly ? (
                  <>
                    <p className="font-serif text-3xl font-semibold">
                      Nu ai flashcarduri marcate pentru recapitulare.
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
                      Apasă pe iconița cu creierul de pe un flashcard ca să-l
                      adaugi aici.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-serif text-3xl font-semibold">
                      Încă nu ai flashcarduri din quizuri.
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted">
                      Intră într-un quiz și răspunde. Când greșești, întrebarea
                      și răspunsul corect vor fi salvate automat aici.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {hasCards ? (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:mt-5">
              <button
                type="button"
                onClick={shuffleDeck}
                disabled={isAnimating || cards.length <= 1}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-subtle bg-app px-5 text-sm font-bold text-content transition hover:-translate-y-0.5 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-55"
              >
                <Icon>
                  <path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </Icon>
                Amestecă
              </button>
              <button
                type="button"
                onClick={() => moveCard(-1)}
                disabled={isAnimating || cards.length <= 1}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-subtle bg-app text-content transition hover:-translate-y-0.5 hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Flashcard anterior"
              >
                <Icon>
                  <path d="M19 12H5M11 5l-7 7 7 7" />
                </Icon>
              </button>
              <button
                type="button"
                onClick={() => moveCard(1)}
                disabled={isAnimating || cards.length <= 1}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-content text-app transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                aria-label="Flashcard următor"
              >
                <Icon>
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </Icon>
              </button>
              <span className="text-xs font-bold text-muted">
                {activeIndex + 1}/{cards.length}
              </span>
            </div>
          ) : null}

          {deck.cards.length > 0 ? (
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={toggleReviewOnlyFilter}
                className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-xs font-bold transition ${
                  showReviewOnly
                    ? "border-action bg-action text-on-action"
                    : "border-subtle bg-app text-content hover:bg-surface-hover"
                }`}
                aria-pressed={showReviewOnly}
              >
                <Icon className="h-4 w-4">
                  <path d="M9.5 2a2.5 2.5 0 0 0-2.5 2.5v.5a3 3 0 0 0-2 2.83V8a3 3 0 0 0-1 5.83V15a3 3 0 0 0 3 3 2.5 2.5 0 0 0 2.5 2.5h.5a2.5 2.5 0 0 0 2.5-2.5V4.5A2.5 2.5 0 0 0 9.5 2Z" />
                  <path d="M14.5 2a2.5 2.5 0 0 1 2.5 2.5v.5a3 3 0 0 1 2 2.83V8a3 3 0 0 1 1 5.83V15a3 3 0 0 1-3 3 2.5 2.5 0 0 1-2.5 2.5h-.5a2.5 2.5 0 0 1-2.5-2.5V4.5A2.5 2.5 0 0 1 14.5 2Z" />
                </Icon>
                Doar marcate pentru recapitulare
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {flashcardAiDialog ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="flashcard-ai-title"
        >
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-subtle bg-surface shadow-2xl shadow-black/25">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-subtle bg-app/80 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-info">
                  Flashcard AI
                </p>
                <h3
                  id="flashcard-ai-title"
                  className="mt-2 font-serif text-2xl font-semibold leading-tight text-content"
                >
                  {flashcardAiDialog.status === "loading"
                    ? "Generez explicația"
                    : flashcardAiDialog.response?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseFlashcardAiDialog}
                className="rounded-full border border-subtle px-4 py-2 text-xs font-bold text-content transition hover:bg-surface"
              >
                Închide
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              <div className="space-y-5">
                <div className="rounded-3xl border border-info-border bg-info-soft p-4 text-info">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                    Ai întrebat despre{" "}
                    {flashcardAiDialog.side === "question"
                      ? "întrebare"
                      : "răspuns"}
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    “{flashcardAiDialog.text}”
                  </p>
                </div>

                {flashcardAiDialog.status === "loading" ? (
                  <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-subtle bg-app p-6 text-center">
                    <div>
                      <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-info-border border-t-info" />
                      <p className="mt-5 font-serif text-2xl font-semibold text-content">
                        Analizez flashcardul...
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                        Caut conceptul, legătura cu răspunsul și cea mai scurtă
                        explicație utilă pentru recapitulare.
                      </p>
                      <div className="mx-auto mt-6 max-w-sm space-y-2">
                        <div className="h-3 animate-pulse rounded-full bg-info-soft" />
                        <div className="h-3 w-4/5 animate-pulse rounded-full bg-info-soft" />
                        <div className="h-3 w-2/3 animate-pulse rounded-full bg-info-soft" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <p className="text-base leading-8 text-content/85">
                      {flashcardAiDialog.response?.answer}
                    </p>
                    <div className="rounded-3xl border border-subtle bg-app p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                        Cum să-l înveți
                      </p>
                      <div className="mt-3 space-y-3">
                        {flashcardAiDialog.response?.bullets.map((bullet) => (
                          <div
                            key={bullet}
                            className="flex gap-3 rounded-2xl border border-subtle bg-surface p-3 text-sm leading-6 text-content/80"
                          >
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-info" />
                            <p>{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ManualFlashcardPayload = {
  question: string;
  answer: string;
  category: string;
  difficulty: string;
  questionImageFile?: File;
};

const manualFlashcardDifficulties = [
  { value: "low", label: "Ușor" },
  { value: "medium", label: "Mediu" },
  { value: "high", label: "Greu" },
];

function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ManualFlashcardBuilderPage({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (flashcard: ManualFlashcardPayload) => Promise<void>;
}) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionImage, setQuestionImage] = useState<string | undefined>();
  const [questionImageFile, setQuestionImageFile] = useState<File | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave =
    category.trim().length > 0 &&
    (question.trim().length > 0 || Boolean(questionImage)) &&
    answer.trim().length > 0 &&
    !isSaving;

  function resetForm() {
    setQuestion("");
    setAnswer("");
    setCategory("");
    setDifficulty("medium");
    setQuestionImage(undefined);
    setQuestionImageFile(undefined);
    setSaveError(null);
  }

  async function handleImageChange(file: File | undefined) {
    if (!file) return;
    const dataUrl = await readImageAsDataUrl(file);
    setQuestionImage(dataUrl);
    setQuestionImageFile(file);
  }

  function handleCancel() {
    resetForm();
    onBack();
  }

  async function handleSave() {
    if (!canSave) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await onCreate({
        question: question.trim(),
        answer: answer.trim(),
        category: category.trim(),
        difficulty,
        questionImageFile,
      });
      resetForm();
    } catch {
      setSaveError("Flashcardul nu a putut fi salvat momentan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7 lg:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-subtle bg-app px-4 text-sm font-semibold text-content shadow-sm transition hover:-translate-y-0.5 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Înapoi la pachete
      </button>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
        <label className="block rounded-[1.5rem] border border-subtle bg-app px-4 py-3">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-muted">
            Categorie
          </span>
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Ex: Farmacognozie, formule, capitol 2"
            className="mt-2 w-full bg-transparent text-base font-semibold text-content outline-none placeholder:text-muted/50"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-subtle bg-app p-2">
          {manualFlashcardDifficulties.map((option) => {
            const isActive = difficulty === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setDifficulty(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition sm:px-4 sm:py-2 sm:text-sm ${
                  isActive
                    ? "bg-content text-app"
                    : "text-muted hover:bg-surface-hover hover:text-content"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ManualFlashcardEditorCard
          label="Întrebare"
          value={question}
          image={questionImage}
          placeholder="Scrie întrebarea sau adaugă o imagine..."
          onChange={setQuestion}
          onImageChange={handleImageChange}
          onImageRemove={() => {
            setQuestionImage(undefined);
            setQuestionImageFile(undefined);
          }}
        />
        <ManualFlashcardEditorCard
          label="Răspuns"
          value={answer}
          placeholder="Scrie răspunsul..."
          onChange={setAnswer}
          allowImage={false}
        />
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-3">
        {saveError ? (
          <p className="mr-auto rounded-full border border-danger-border bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
            {saveError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded-full border border-subtle px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover"
        >
          Anulare
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-full bg-content px-6 py-3 text-sm font-bold text-app transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted"
        >
          {isSaving ? "Se salvează..." : "Salvare"}
        </button>
      </div>
    </section>
  );
}

function ManualFlashcardEditorCard({
  label,
  value,
  image,
  placeholder,
  onChange,
  onImageChange,
  onImageRemove,
  allowImage = true,
}: {
  label: string;
  value: string;
  image?: string;
  placeholder: string;
  onChange: (value: string) => void;
  onImageChange?: (file: File | undefined) => void;
  onImageRemove?: () => void;
  allowImage?: boolean;
}) {
  return (
    <article className="min-h-[20rem] rounded-[2rem] border border-subtle bg-app p-4 shadow-xl shadow-black/5 sm:min-h-[26rem] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-success-soft px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-success">
          {label}
        </span>
        {allowImage ? (
          <label className="cursor-pointer rounded-full border border-subtle bg-surface px-3 py-2 text-xs font-bold text-content transition hover:bg-surface-hover">
            Imagine
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                onImageChange?.(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      <div className="flex h-[15rem] flex-col gap-4 sm:h-[20rem]">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-0 flex-1 resize-none rounded-3xl border border-subtle bg-surface p-4 font-serif text-lg font-semibold leading-tight text-content outline-none transition placeholder:text-muted/50 focus:border-success focus:ring-4 focus:ring-success-soft sm:p-5 sm:text-2xl"
        />
        {allowImage && image ? (
          <div className="relative h-28 overflow-hidden rounded-3xl border border-subtle bg-surface p-3 sm:h-40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={onImageRemove}
              className="absolute right-3 top-3 rounded-full bg-content px-3 py-1.5 text-xs font-bold text-app"
            >
              Șterge
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function FlashcardsPanel({
  project,
  mode,
  onManualFlashcardCreate,
  onToggleFlashcardReview,
}: {
  project: StudyProject;
  mode: FlashcardPanelMode;
  onManualFlashcardCreate: (
    projectId: string,
    flashcard: ManualFlashcardPayload,
  ) => Promise<void>;
  onToggleFlashcardReview: (
    projectId: string,
    flashcardId: string,
    review: boolean,
  ) => Promise<void>;
}) {
  const router = useRouter();
  const [activeDeckId, setActiveDeckId] = useState<FlashcardDeckId | null>(null);
  const decks = useMemo(() => buildProjectFlashcardDecks(project), [project]);
  const quizMistakeCount = project.quizMistakeFlashcards.length;
  const manualFlashcardCount = project.manualFlashcards.length;
  const flashcardCards: FlashcardStudyCard[] = [
    {
      id: "initial",
      badge: "Generate initial",
      title: `${project.flashcardsDue} din ${project.flashcardsTotal} flashcard-uri`,
      description:
        "Pachetul generat din materialele încărcate, bun pentru prima recapitulare structurată.",
      duration: "8 min",
      metric: "din rezumatul inițial",
    },
    {
      id: "quiz",
      badge: "Recapitulare adaptivă",
      title: quizMistakeCount
        ? `${quizMistakeCount} flashcard-uri din greșeli`
        : "Din quiz-urile tale",
      description:
        quizMistakeCount
          ? "Întrebările greșite sunt salvate automat aici cu răspunsul corect."
          : "Aici vor apărea automat întrebările greșite la quizuri.",
      duration: quizMistakeCount ? `${Math.max(3, quizMistakeCount * 2)} min` : "0 min",
      metric: "din greșeli reale",
    },
  ];

  if (manualFlashcardCount > 0) {
    flashcardCards.push({
      id: "manual",
      badge: "Create manual",
      title: `${manualFlashcardCount} flashcard-uri create de tine`,
      description:
        "Cardurile adăugate manual, separate de pachetele generate automat.",
      duration: `${Math.max(2, manualFlashcardCount * 2)} min`,
      metric: "create manual",
    });
  }

  if (mode === "create") {
    return (
      <ManualFlashcardBuilderPage
        onBack={() =>
          router.push(`/myaccount/flashcarduri?project=${project.id}`)
        }
        onCreate={(flashcard) =>
          onManualFlashcardCreate(project.id, flashcard)
        }
      />
    );
  }

  if (activeDeckId) {
    return (
      <FlashcardDeckPage
        deck={decks[activeDeckId]}
        onBack={() => setActiveDeckId(null)}
        onToggleReview={(flashcardId, review) =>
          onToggleFlashcardReview(project.id, flashcardId, review)
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <GeneratedContentDisclaimer className="w-fit max-w-full" />
        <button
          type="button"
          onClick={() =>
            router.push(`/myaccount/flashcarduri/creeaza?project=${project.id}`)
          }
          className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-content px-5 text-sm font-bold text-app transition hover:-translate-y-0.5 hover:opacity-90 sm:ml-auto"
        >
          <Icon>
            <path d="M12 5v14M5 12h14" />
          </Icon>
          Creează flashcard
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {flashcardCards.map((card) => (
          <FlashcardTicket
            key={card.title}
            card={card}
            onOpenDeck={setActiveDeckId}
          />
        ))}
      </div>
    </div>
  );
}

type QuizQuestionMode = "single" | "multiple";
type QuizComplexity = "Mică" | "Medie" | "Ridicată";
type QuizModeLabel = "Single choice" | "Multiple choice" | "Mixt";

type AccountQuizQuestion = {
  id: string;
  sourceQuestionId?: string;
  concept: string;
  difficulty: "Ușor" | "Mediu" | "Greu";
  mode: QuizQuestionMode;
  question: string;
  answers: string[];
  correctIndexes: number[];
  explanation: string;
  aiInsight: string;
  source: string;
};

type AccountQuizAttempt = {
  id: string;
  scorePercent: number;
  correctCount: number;
  answeredCount: number;
  completedAt: string;
};

type AccountQuiz = {
  id: string;
  title: string;
  description: string;
  complexity: QuizComplexity;
  mode: QuizModeLabel;
  duration: string;
  focus: string;
  recommended?: boolean;
  questionIds: string[];
  completedAt: string | null;
  scorePercent: number | null;
  correctCount: number | null;
  answeredCount: number | null;
  attempts: AccountQuizAttempt[];
};

function getQuizQuestions(
  quiz: AccountQuiz,
  questionBank: Record<string, AccountQuizQuestion>,
) {
  return quiz.questionIds
    .map((questionId) => questionBank[questionId])
    .filter(Boolean);
}

function normalizeGeneratedQuestionMode(value: string | null | undefined) {
  return value?.toLowerCase().includes("multiple") ? "multiple" : "single";
}

function normalizeGeneratedQuizComplexity(
  value: string | null | undefined,
): QuizComplexity {
  const normalizedValue = value?.toLocaleLowerCase("ro-RO") ?? "";

  if (
    normalizedValue.includes("rid") ||
    normalizedValue.includes("high") ||
    normalizedValue.includes("greu")
  ) {
    return "Ridicată";
  }

  if (
    normalizedValue.includes("med") ||
    normalizedValue.includes("medium")
  ) {
    return "Medie";
  }

  return "Mică";
}

function getGeneratedQuizModeLabel(
  modes: QuizQuestionMode[],
): QuizModeLabel {
  const hasSingle = modes.includes("single");
  const hasMultiple = modes.includes("multiple");

  if (hasSingle && hasMultiple) return "Mixt";
  if (hasMultiple) return "Multiple choice";
  return "Single choice";
}

function buildProjectQuizData(project: StudyProject) {
  if (!project.quizzes.length) {
    return {
      catalog: [],
      questionBank: {},
    };
  }

  const questionBank: Record<string, AccountQuizQuestion> = {};
  const catalog: AccountQuiz[] = project.quizzes
    .map<AccountQuiz | null>((quiz, quizIndex) => {
      const complexity = normalizeGeneratedQuizComplexity(quiz.complexity);
      const questionIds: string[] = [];
      const questionModes: QuizQuestionMode[] = [];

      quiz.questions.forEach((question) => {
        const options = question.options.filter((option) => option.label.trim());

        if (options.length < 2) {
          return;
        }

        const id = `${quiz.id}-${question.id}`;
        const mode = normalizeGeneratedQuestionMode(question.question_type);
        const correctIndexes = options
          .map((option, optionIndex) => (option.is_correct ? optionIndex : -1))
          .filter((optionIndex) => optionIndex >= 0);

        questionIds.push(id);
        questionModes.push(mode);
        questionBank[id] = {
          id,
          sourceQuestionId: question.id,
          concept: quiz.title,
          difficulty:
            complexity === "Ridicată"
              ? "Greu"
              : complexity === "Medie"
                ? "Mediu"
                : "Ușor",
          mode,
          question: question.prompt,
          answers: options.map((option) => option.label),
          correctIndexes: correctIndexes.length ? correctIndexes : [0],
          explanation:
            question.explanation ??
            "Explicația nu a fost inclusă în JSON, dar răspunsul corect este marcat.",
          aiInsight: `Întrebarea verifică un concept din ${project.subjectName}. Revizuiește fragmentul din rezumat dacă ai ezitat.`,
          source: `Quiz generat · ${project.name}`,
        };
      });

      if (!questionIds.length) {
        return null;
      }

      return {
        id: quiz.id,
        title: quiz.title,
        description:
          quiz.description ??
          "Quiz generat din materialele importate pentru acest proiect.",
        complexity,
        mode: getGeneratedQuizModeLabel(questionModes),
        duration: `${Math.max(3, Math.ceil(questionIds.length * 1.4))} min`,
        focus: project.subjectName,
        recommended: quizIndex === 0,
        questionIds,
        completedAt: quiz.completed_at,
        scorePercent: quiz.score_percent,
        correctCount: quiz.correct_count,
        answeredCount: quiz.answered_count,
        attempts: quiz.attempts.map((attempt) => ({
          id: attempt.id,
          scorePercent: attempt.score_percent,
          correctCount: attempt.correct_count,
          answeredCount: attempt.answered_count,
          completedAt: attempt.completed_at,
        })),
      };
    })
    .filter((quiz): quiz is AccountQuiz => quiz !== null);

  if (!catalog.length) {
    return {
      catalog: [],
      questionBank: {},
    };
  }

  return { catalog, questionBank };
}

function areAnswerSetsEqual(expected: number[], received: number[] = []) {
  if (expected.length !== received.length) {
    return false;
  }

  return expected.every((answerIndex) => received.includes(answerIndex));
}

function isQuizAnswerCorrect(
  question: AccountQuizQuestion,
  submittedAnswer?: number[],
) {
  return areAnswerSetsEqual(question.correctIndexes, submittedAnswer);
}

function buildMistakeFlashcardFromQuestion(
  question: AccountQuizQuestion,
): StudyFlashcardCard {
  const correctAnswers = question.correctIndexes
    .map((answerIndex) => question.answers[answerIndex])
    .filter(Boolean);

  return {
    id: `quiz-${question.sourceQuestionId ?? question.id}`,
    flashcardId: question.sourceQuestionId ?? question.id,
    review: false,
    topic: question.concept,
    question: question.question,
    answer: [
      `Răspuns corect: ${correctAnswers.join("; ") || "vezi explicația"}.`,
      question.explanation,
    ]
      .filter(Boolean)
      .join(" "),
    tone: "danger",
    sourceQuestionId: question.sourceQuestionId ?? question.id,
  };
}

function getQuizComplexityClass(complexity: QuizComplexity) {
  if (complexity === "Mică") {
    return "border-success-border bg-success-soft text-success";
  }

  if (complexity === "Medie") {
    return "border-info-border bg-info-soft text-info";
  }

  return "border-warning-border bg-warning-soft text-warning";
}

function formatQuizAttemptTimestamp(value: string) {
  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QuizPanel({
  project,
  onQuizMistake,
  onQuizComplete,
}: {
  project: StudyProject;
  onQuizMistake: (
    projectId: string,
    questionId: string | null,
    fallbackFlashcard: StudyFlashcardCard,
  ) => void;
  onQuizComplete: (
    projectId: string,
    quizId: string,
    result: { correctCount: number; answeredCount: number },
  ) => Promise<void>;
}) {
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number[]>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, number[]>
  >({});
  const [showQuizSummary, setShowQuizSummary] = useState(false);
  const [attemptId, setAttemptId] = useState(0);
  const isPersistingCompletionRef = useRef(false);
  const persistedAttemptRef = useRef<number | null>(null);

  const quizData = useMemo(() => buildProjectQuizData(project), [project]);
  const activeQuiz = activeQuizId
    ? quizData.catalog.find((quiz) => quiz.id === activeQuizId) ?? null
    : null;
  const quizQuestions = activeQuiz
    ? getQuizQuestions(activeQuiz, quizData.questionBank)
    : [];
  const answeredCount = Object.keys(submittedAnswers).length;
  const correctCount = quizQuestions.reduce((count, question) => {
    return isQuizAnswerCorrect(question, submittedAnswers[question.id])
      ? count + 1
      : count;
  }, 0);
  const isComplete =
    quizQuestions.length > 0 && answeredCount === quizQuestions.length;

  useEffect(() => {
    if (
      !activeQuiz ||
      !isComplete ||
      persistedAttemptRef.current === attemptId ||
      isPersistingCompletionRef.current
    ) {
      return;
    }

    isPersistingCompletionRef.current = true;
    onQuizComplete(project.id, activeQuiz.id, {
      correctCount,
      answeredCount,
    })
      .then(() => {
        persistedAttemptRef.current = attemptId;
      })
      .finally(() => {
        isPersistingCompletionRef.current = false;
      });
  }, [
    activeQuiz,
    isComplete,
    attemptId,
    correctCount,
    answeredCount,
    onQuizComplete,
    project.id,
  ]);

  function resetQuiz() {
    setDraftAnswers({});
    setSubmittedAnswers({});
    setActiveQuestionIndex(0);
    setShowQuizSummary(false);
    setAttemptId((currentId) => currentId + 1);
  }

  function handleBackToQuizList() {
    setActiveQuizId(null);
  }

  if (!activeQuiz) {
    return (
      <QuizLibrary
        quizzes={quizData.catalog}
        onStartQuiz={(quizId) => {
          setActiveQuizId(quizId);
          setActiveQuestionIndex(0);
          setDraftAnswers({});
          setSubmittedAnswers({});
          setShowQuizSummary(false);
          setAttemptId((currentId) => currentId + 1);
        }}
      />
    );
  }

  const activeQuestion = quizQuestions[activeQuestionIndex];
  const submittedAnswer = submittedAnswers[activeQuestion.id];
  const draftAnswer = draftAnswers[activeQuestion.id] ?? [];
  const scorePercent =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;
  const completionPercent = Math.round(
    (answeredCount / quizQuestions.length) * 100,
  );
  const isAnswered = submittedAnswer !== undefined;
  const weakConcepts = quizQuestions
    .filter(
      (question) =>
        submittedAnswers[question.id] !== undefined &&
        !isQuizAnswerCorrect(question, submittedAnswers[question.id]),
    )
    .map((question) => question.concept);

  function toggleAnswer(answerIndex: number) {
    if (submittedAnswers[activeQuestion.id] !== undefined) {
      return;
    }

    if (activeQuestion.mode === "single") {
      const submittedAnswerIndexes = [answerIndex];
      setSubmittedAnswers((currentAnswers) => ({
        ...currentAnswers,
        [activeQuestion.id]: submittedAnswerIndexes,
      }));
      if (!isQuizAnswerCorrect(activeQuestion, submittedAnswerIndexes)) {
        onQuizMistake(
          project.id,
          activeQuestion.sourceQuestionId ?? null,
          buildMistakeFlashcardFromQuestion(activeQuestion),
        );
      }
      return;
    }

    setDraftAnswers((currentAnswers) => {
      const currentQuestionAnswers = currentAnswers[activeQuestion.id] ?? [];
      const nextQuestionAnswers = currentQuestionAnswers.includes(answerIndex)
        ? currentQuestionAnswers.filter((index) => index !== answerIndex)
        : [...currentQuestionAnswers, answerIndex];

      return {
        ...currentAnswers,
        [activeQuestion.id]: nextQuestionAnswers,
      };
    });
  }

  function submitMultipleAnswer() {
    if (activeQuestion.mode !== "multiple" || draftAnswer.length === 0) {
      return;
    }
    if (submittedAnswers[activeQuestion.id] !== undefined) {
      return;
    }

    setSubmittedAnswers((currentAnswers) => {
      if (currentAnswers[activeQuestion.id] !== undefined) {
        return currentAnswers;
      }

      return {
        ...currentAnswers,
        [activeQuestion.id]: draftAnswer,
      };
    });
    if (!isQuizAnswerCorrect(activeQuestion, draftAnswer)) {
      onQuizMistake(
        project.id,
        activeQuestion.sourceQuestionId ?? null,
        buildMistakeFlashcardFromQuestion(activeQuestion),
      );
    }
  }

  function goToQuestion(questionIndex: number) {
    setActiveQuestionIndex(questionIndex);
  }

  function goToNextQuestion() {
    setActiveQuestionIndex((currentIndex) =>
      Math.min(quizQuestions.length - 1, currentIndex + 1),
    );
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={handleBackToQuizList}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-content"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Înapoi la quiz-uri
      </button>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Întrebarea {activeQuestionIndex + 1} din{" "}
                {quizQuestions.length} ·{" "}
                {activeQuestion.mode === "multiple"
                  ? "alege toate răspunsurile corecte"
                  : "alege un singur răspuns"}
              </p>
              <h3 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight">
                {activeQuestion.question}
              </h3>
            </div>
            <span className="w-fit rounded-full border border-info-border bg-info-soft px-3 py-1.5 text-xs font-bold text-info">
              {activeQuestion.difficulty}
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-content transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          <div className="mt-6 grid gap-3">
            {activeQuestion.answers.map((answer, answerIndex) => (
              <QuizAnswerButton
                key={answer}
                answer={answer}
                answerIndex={answerIndex}
                correctIndexes={activeQuestion.correctIndexes}
                submittedAnswer={submittedAnswer}
                draftAnswer={draftAnswer}
                onSelect={() => toggleAnswer(answerIndex)}
              />
            ))}
          </div>

          {activeQuestion.mode === "multiple" && !isAnswered ? (
            <button
              type="button"
              onClick={submitMultipleAnswer}
              disabled={draftAnswer.length === 0}
              className="mt-5 inline-flex items-center justify-center rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Verifică răspunsul
            </button>
          ) : null}

          {isAnswered ? (
            <div
              className={`mt-6 rounded-3xl border p-5 ${
                isQuizAnswerCorrect(activeQuestion, submittedAnswer)
                  ? "border-success-border bg-success-soft text-success"
                  : "border-danger-border bg-danger-soft text-danger"
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.16em]">
                {isQuizAnswerCorrect(activeQuestion, submittedAnswer)
                  ? "Corect"
                  : "De revizuit"}
              </p>
              <h4 className="mt-2 font-serif text-2xl font-semibold text-content">
                {activeQuestion.explanation}
              </h4>
              <p className="mt-3 text-sm leading-7">
                {activeQuestion.aiInsight}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-content">
                  Sursă: {activeQuestion.source}
                </span>
                <span className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs font-bold text-content">
                  Concept: {activeQuestion.concept}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => goToQuestion(Math.max(0, activeQuestionIndex - 1))}
              disabled={activeQuestionIndex === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-subtle px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon>
                <path d="M19 12H5M11 5l-7 7 7 7" />
              </Icon>
              Înapoi
            </button>

            <button
              type="button"
              onClick={goToNextQuestion}
              disabled={!isAnswered || activeQuestionIndex === quizQuestions.length - 1}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Următoarea întrebare
              <Icon>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </Icon>
            </button>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-[2rem] border border-subtle bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Navigator quiz
            </p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {quizQuestions.map((question, questionIndex) => {
                const selected = submittedAnswers[question.id];
                const isCorrect = isQuizAnswerCorrect(question, selected);
                const isCurrent = questionIndex === activeQuestionIndex;
                const isQuestionAnswered = selected !== undefined;

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => goToQuestion(questionIndex)}
                    className={`flex h-11 items-center justify-center rounded-2xl border text-sm font-bold transition ${
                      isCurrent
                        ? "border-content bg-content text-app"
                        : isQuestionAnswered && isCorrect
                          ? "border-success-border bg-success-soft text-success"
                          : isQuestionAnswered
                            ? "border-danger-border bg-danger-soft text-danger"
                            : "border-subtle bg-app text-muted hover:bg-surface-hover"
                    }`}
                  >
                    {questionIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-subtle bg-surface p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              AI live
            </p>
            <div className="mt-4 space-y-3">
              <QuizSideStat label="Corecte" value={String(correctCount)} />
              <QuizSideStat label="Acuratețe" value={`${scorePercent}%`} />
              <QuizSideStat
                label="Concepte slabe"
                value={weakConcepts.length ? String(weakConcepts.length) : "0"}
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-info-border bg-info-soft p-5 text-info">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Recomandare
            </p>
            <p className="mt-3 text-sm font-semibold leading-6">
              {weakConcepts.length
                ? `După quiz, revizuiește ${weakConcepts.slice(0, 2).join(" și ")}.`
                : "Răspunde la primele întrebări ca AI-ul să identifice zonele slabe."}
            </p>
          </div>

          {activeQuiz.attempts.length ? (
            <div className="rounded-[2rem] border border-subtle bg-surface p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Istoric încercări
              </p>
              <div className="mt-4 space-y-2">
                {activeQuiz.attempts.map((attempt, attemptIndex) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-2xl border border-subtle bg-app px-3 py-2 text-xs"
                  >
                    <span className="font-bold text-muted">
                      #{activeQuiz.attempts.length - attemptIndex} ·{" "}
                      {formatQuizAttemptTimestamp(attempt.completedAt)}
                    </span>
                    <span className="font-bold text-content">
                      {attempt.scorePercent}% ({attempt.correctCount}/
                      {attempt.answeredCount})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {isComplete ? (
        <section className="flex flex-col items-start justify-between gap-4 rounded-[2rem] border border-success-border bg-success-soft p-5 text-success sm:flex-row sm:items-center sm:p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Quiz finalizat
            </p>
            <h3 className="mt-2 font-serif text-2xl font-semibold text-content">
              Ai obținut {correctCount}/{quizQuestions.length} răspunsuri corecte.
            </h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowQuizSummary(true)}
              className="rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90"
            >
              Vezi sumarul
            </button>
            <button
              type="button"
              onClick={handleBackToQuizList}
              className="rounded-full border border-success-border px-5 py-3 text-sm font-bold text-success transition hover:bg-success-soft/70"
            >
              Înapoi la quiz-uri
            </button>
          </div>
        </section>
      ) : null}

      {showQuizSummary ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-summary-title"
        >
          <div className="w-full max-w-lg rounded-[2rem] border border-subtle bg-surface p-6 shadow-2xl shadow-black/25">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Sumar final
                </p>
                <h3
                  id="quiz-summary-title"
                  className="mt-2 font-serif text-2xl font-semibold leading-tight"
                >
                  Ai obținut {correctCount}/{quizQuestions.length} răspunsuri
                  corecte.
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQuizSummary(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-subtle text-muted transition hover:bg-surface-hover hover:text-content"
                aria-label="Închide sumarul"
              >
                <Icon className="h-4 w-4">
                  <path d="M18 6 6 18M6 6l12 12" />
                </Icon>
              </button>
            </div>

            <p className="mt-3 text-sm leading-7 text-muted">
              Pregătirea estimată crește cu {correctCount >= 3 ? "6" : "3"}%.
              Revizzio ar transforma automat greșelile în flashcard-uri de
              recapitulare.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <QuizResultCard label="Scor quiz" value={`${scorePercent}%`} />
              <QuizResultCard
                label="Flashcard-uri sugerate"
                value={String(Math.max(1, weakConcepts.length))}
              />
              <QuizResultCard label="Timp recomandat" value="9 min" />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetQuiz}
                className="rounded-full border border-subtle px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover"
              >
                Reia quiz-ul
              </button>
              <button
                type="button"
                onClick={handleBackToQuizList}
                className="rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90"
              >
                Înapoi la quiz-uri
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function QuizLibrary({
  quizzes,
  onStartQuiz,
}: {
  quizzes: AccountQuiz[];
  onStartQuiz: (quizId: string) => void;
}) {
  if (!quizzes.length) {
    return (
      <section className="rounded-[2rem] border border-subtle bg-surface p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Quiz-uri
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-semibold leading-tight">
          Quizurile nu sunt generate încă.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
          După importul JSON-ului, aici vor apărea quizurile reale ale
          proiectului: recapitulare, aplicare și pregătire de examen.
        </p>
      </section>
    );
  }

  const completedCount = quizzes.filter((quiz) => quiz.completedAt).length;

  return (
    <section className="space-y-5">
      <p className="text-sm font-bold text-muted">
        {completedCount}/{quizzes.length} quiz-uri completate
      </p>
      <div className="grid items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {quizzes.map((quiz) => (
          <QuizCatalogCard key={quiz.id} quiz={quiz} onStartQuiz={onStartQuiz} />
        ))}
      </div>
    </section>
  );
}

function QuizCatalogCard({
  quiz,
  onStartQuiz,
}: {
  quiz: AccountQuiz;
  onStartQuiz: (quizId: string) => void;
}) {
  const isCompleted = Boolean(quiz.completedAt);

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[2rem] border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 ${
        quiz.recommended ? "border-action" : "border-subtle"
      }`}
    >
      {quiz.recommended ? (
        <span className="absolute right-5 top-5 rounded-full bg-content px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-app">
          Recomandat
        </span>
      ) : null}

      <span
        className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-[11px] font-bold ${getQuizComplexityClass(
          quiz.complexity,
        )}`}
      >
        Complexitate {quiz.complexity.toLowerCase()}
      </span>

      <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight">
        {quiz.title}
      </h3>
      <p className="mt-3 flex-1 text-sm leading-7 text-muted">
        {quiz.description}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <QuizCardStat label="Întrebări" value={String(quiz.questionIds.length)} />
        <QuizCardStat
          label="Rezultat"
          value={isCompleted ? `${quiz.scorePercent}%` : "Neîncercat"}
        />
      </div>

      <button
        type="button"
        onClick={() => onStartQuiz(quiz.id)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90"
      >
        {isCompleted ? "Reintră în quiz" : "Intră în quiz"}
        <Icon>
          <path d="M5 12h14M13 5l7 7-7 7" />
        </Icon>
      </button>
    </article>
  );
}

function QuizCardStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-subtle bg-app p-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-content">{value}</p>
    </div>
  );
}

function QuizAnswerButton({
  answer,
  answerIndex,
  correctIndexes,
  submittedAnswer,
  draftAnswer,
  onSelect,
}: {
  answer: string;
  answerIndex: number;
  correctIndexes: number[];
  submittedAnswer?: number[];
  draftAnswer: number[];
  onSelect: () => void;
}) {
  const isAnswered = submittedAnswer !== undefined;
  const isCorrect = correctIndexes.includes(answerIndex);
  const isSelected = submittedAnswer?.includes(answerIndex) ?? false;
  const isDraftSelected = draftAnswer.includes(answerIndex);
  const stateClass = !isAnswered
    ? isDraftSelected
      ? "border-content bg-action-soft text-content"
      : "border-subtle bg-app text-content hover:-translate-y-0.5 hover:bg-surface-hover"
    : isCorrect
      ? "border-success-border bg-success-soft text-success"
      : isSelected
        ? "border-danger-border bg-danger-soft text-danger"
        : "border-subtle bg-surface text-muted opacity-65";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isAnswered}
      className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-4 text-left text-sm font-bold transition ${stateClass}`}
    >
      <span className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/20 text-xs">
          {String.fromCharCode(65 + answerIndex)}
        </span>
        {answer}
      </span>
      {isAnswered && isCorrect ? (
        <Icon className="h-5 w-5 shrink-0">
          <path d="m5 12 4 4L19 6" />
        </Icon>
      ) : null}
      {isAnswered && isSelected && !isCorrect ? (
        <Icon className="h-5 w-5 shrink-0">
          <path d="M18 6 6 18M6 6l12 12" />
        </Icon>
      ) : null}
    </button>
  );
}

function QuizSideStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-subtle bg-app px-4 py-3">
      <span className="text-xs font-bold text-muted">{label}</span>
      <span className="font-serif text-xl font-semibold">{value}</span>
    </div>
  );
}

function QuizResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-success-border bg-surface p-4">
      <p className="font-serif text-2xl font-semibold text-content">{value}</p>
      <p className="mt-1 text-xs font-bold">{label}</p>
    </div>
  );
}

function StrategiesPanel({
  strategies,
}: {
  strategies: StudyProject["strategies"];
}) {
  const universalStrategies = [
    [
      "Întreabă materialul, nu doar îl citi",
      "Transformă fiecare titlu într-o întrebare și răspunde fără să te uiți.",
    ],
    [
      "Revizuire scurtă după 24h",
      "O sesiune de 5 minute a doua zi fixează mult mai bine conceptele.",
    ],
    [
      "Explică ideea ca unui coleg",
      "Dacă poți explica simplu, înseamnă că ai înțeles-o cu adevărat.",
    ],
  ];

  return (
    <div>
      <div className="inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
        <Icon className="h-3.5 w-3.5">
          <path d="M12 2 2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </Icon>
        Generate de AI pentru acest proiect
      </div>

      <div className="mt-3 space-y-3">
        {strategies.map((strategy) => (
          <StrategyAccordionItem
            key={strategy.title}
            badge={
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                <Icon>
                  <circle cx="12" cy="12" r="10" />
                  <path d="m16.2 7.8-2 6.4-6.4 2 2-6.4z" />
                </Icon>
              </span>
            }
            title={strategy.title}
            description={strategy.description}
          />
        ))}
      </div>

      <SectionLabel>Valabile pentru orice materie</SectionLabel>
      <div className="mt-3 space-y-3">
        {universalStrategies.map(([title, description], index) => (
          <StrategyAccordionItem
            key={title}
            badge={
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app text-xs font-bold">
                {index + 1}
              </span>
            }
            title={title}
            description={description}
          />
        ))}
      </div>
    </div>
  );
}

function StrategyAccordionItem({
  badge,
  title,
  description,
}: {
  badge: ReactNode;
  title: string;
  description: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-subtle bg-surface">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        {badge}
        <span className="flex-1 text-sm font-bold">{title}</span>
        <Icon
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </Icon>
      </button>
      <div
        className={`grid transition-all duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-4 pb-4 pl-12 text-xs leading-5 text-muted">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function buildProjectProgressData(project: StudyProject) {
  const quizzes = project.quizzes;
  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizzes.filter((quiz) => quiz.completed_at);
  const completedCount = completedQuizzes.length;
  const averageScore = completedCount
    ? Math.round(
        completedQuizzes.reduce(
          (sum, quiz) => sum + (quiz.score_percent ?? 0),
          0,
        ) / completedCount,
      )
    : null;

  const allAttempts = quizzes
    .flatMap((quiz) =>
      quiz.attempts.map((attempt) => ({
        quizTitle: quiz.title,
        scorePercent: attempt.score_percent,
        completedAt: attempt.completed_at,
      })),
    )
    .sort(
      (a, b) =>
        new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
    );

  const weakConceptCounts = new Map<string, number>();
  for (const mistake of project.quizMistakeFlashcards) {
    const key = mistake.topic || "General";
    weakConceptCounts.set(key, (weakConceptCounts.get(key) ?? 0) + 1);
  }
  const weakConcepts = Array.from(weakConceptCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  const quizScores = quizzes
    .map((quiz) => ({
      title: quiz.title,
      scorePercent: quiz.score_percent,
      completed: Boolean(quiz.completed_at),
    }))
    .sort((a, b) => Number(b.completed) - Number(a.completed));

  return {
    totalQuizzes,
    completedCount,
    averageScore,
    totalAttempts: allAttempts.length,
    recentAttempts: allAttempts.slice(-8),
    weakConcepts,
    quizScores,
    totalFlashcards: project.flashcards.length,
    generatedFlashcardsCount: getGeneratedFlashcards(project.flashcards).length,
    manualFlashcardsCount: project.manualFlashcards.length,
    quizMistakeFlashcardsCount: project.quizMistakeFlashcards.length,
    keywordsCount: project.keywords.length,
    highlightsCount: project.summaryHighlights.length,
  };
}

function ProgressPanel({ project }: { project: StudyProject }) {
  const data = useMemo(() => buildProjectProgressData(project), [project]);
  const completionPercent = data.totalQuizzes
    ? Math.round((data.completedCount / data.totalQuizzes) * 100)
    : 0;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-subtle bg-content p-6 text-app sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-on-action/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-app/60">
              Progresul tău
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              {data.totalQuizzes
                ? `${data.completedCount}/${data.totalQuizzes} quiz-uri completate`
                : "Încă nu ai date de progres."}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-app/70">
              {data.totalQuizzes
                ? "Calculat pe baza rezultatelor tale reale la quiz-uri, nu pe estimări."
                : "Rezolvă cel puțin un quiz ca să vezi aici scorul, zonele slabe și evoluția ta."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProgressHeroMetric
              label="Scor mediu"
              value={data.averageScore !== null ? `${data.averageScore}%` : "—"}
            />
            <ProgressHeroMetric
              label="Încercări totale"
              value={String(data.totalAttempts)}
            />
            <ProgressHeroMetric
              label="Flashcard-uri"
              value={String(data.totalFlashcards)}
            />
            <ProgressHeroMetric
              label="Concepte cheie"
              value={String(data.keywordsCount)}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Rata de completare
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold">
            {completionPercent}%
          </h3>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${completionPercent}%` }}
            />
          </div>

          <p className="mt-4 text-sm leading-6 text-muted">
            {data.totalQuizzes
              ? `Ai completat ${data.completedCount} din ${data.totalQuizzes} quiz-uri din acest proiect.`
              : "Nu există quiz-uri generate încă pentru acest proiect."}
          </p>
        </section>

        <section className="rounded-[2rem] border border-warning-border bg-warning-soft p-5 text-warning sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Zone care necesită atenție
          </p>
          {data.weakConcepts.length ? (
            <>
              <h3 className="mt-3 font-serif text-2xl font-semibold text-content">
                Greșești frecvent la:
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.weakConcepts.map(([concept, count]) => (
                  <span
                    key={concept}
                    className="rounded-full border border-warning-border bg-surface px-3 py-1.5 text-xs font-bold"
                  >
                    {concept} ({count})
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm leading-7">
              Nu ai încă greșeli înregistrate la quiz-uri — răspunde la câteva
              întrebări ca să apară zonele de recapitulat aici.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Scor pe quiz
        </p>
        {data.quizScores.length ? (
          <div className="mt-5 space-y-4">
            {data.quizScores.map((quiz) =>
              quiz.completed ? (
                <ProgressBarRow
                  key={quiz.title}
                  label={quiz.title}
                  value={quiz.scorePercent ?? 0}
                />
              ) : (
                <div
                  key={quiz.title}
                  className="flex items-center justify-between gap-3"
                >
                  <p className="text-sm font-bold">{quiz.title}</p>
                  <span className="rounded-full bg-app px-2.5 py-1 text-[11px] font-bold text-muted">
                    Neîncercat
                  </span>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">
            Quiz-urile nu sunt generate încă pentru acest proiect.
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Evoluția scorurilor în timp
        </p>
        {data.recentAttempts.length ? (
          <ProgressScoreTrendChart attempts={data.recentAttempts} />
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">
            Rezolvă un quiz ca să vezi aici evoluția scorurilor tale în timp.
          </p>
        )}
      </section>

      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Alte date din proiect
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ProgressMiniStat
            label="Flashcard-uri generate"
            value={String(data.generatedFlashcardsCount)}
          />
          <ProgressMiniStat
            label="Flashcard-uri manuale"
            value={String(data.manualFlashcardsCount)}
          />
          <ProgressMiniStat
            label="Flashcard-uri din greșeli"
            value={String(data.quizMistakeFlashcardsCount)}
          />
          <ProgressMiniStat
            label="Concepte cheie"
            value={String(data.keywordsCount)}
          />
          <ProgressMiniStat
            label="Highlight-uri în rezumat"
            value={String(data.highlightsCount)}
          />
          <ProgressMiniStat
            label="Încercări la quiz-uri"
            value={String(data.totalAttempts)}
          />
        </div>
      </section>
    </div>
  );
}

function buildSmoothLinePath(points: Array<{ x: number; y: number }>) {
  if (!points.length) {
    return "";
  }
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function ProgressScoreTrendChart({
  attempts,
}: {
  attempts: Array<{
    quizTitle: string;
    scorePercent: number;
    completedAt: string;
  }>;
}) {
  const width = 640;
  const height = 220;
  const paddingX = 16;
  const paddingTop = 16;
  const paddingBottom = 8;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingTop - paddingBottom;

  const points = attempts.map((attempt, index) => ({
    x:
      attempts.length > 1
        ? paddingX + (plotWidth * index) / (attempts.length - 1)
        : paddingX + plotWidth / 2,
    y: paddingTop + plotHeight * (1 - attempt.scorePercent / 100),
    attempt,
  }));

  const linePath = buildSmoothLinePath(points);
  const floorY = paddingTop + plotHeight;
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${floorY} L ${points[0].x} ${floorY} Z`;

  return (
    <div className="mt-5 rounded-3xl border border-subtle bg-app p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-56 w-full"
        role="img"
        aria-label="Evoluția scorurilor la quiz-uri în timp"
      >
        <defs>
          <linearGradient id="progress-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--theme-content)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--theme-content)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 25, 50, 75, 100].map((line) => {
          const y = paddingTop + plotHeight * (1 - line / 100);
          return (
            <line
              key={line}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="var(--theme-border)"
              strokeDasharray="4 5"
              strokeWidth={1}
            />
          );
        })}

        <path d={areaPath} fill="url(#progress-trend-fill)" stroke="none" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--theme-content)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map(({ x, y, attempt }, index) => (
          <circle
            key={`${attempt.completedAt}-${index}`}
            cx={x}
            cy={y}
            r={index === points.length - 1 ? 6 : 4}
            fill="var(--theme-app)"
            stroke="var(--theme-content)"
            strokeWidth={2.5}
          >
            <title>
              {attempt.quizTitle} · {attempt.scorePercent}% ·{" "}
              {formatQuizAttemptTimestamp(attempt.completedAt)}
            </title>
          </circle>
        ))}
      </svg>

      <div className="mt-2 flex items-center justify-between text-[10px] font-bold text-muted">
        <span>{formatQuizAttemptTimestamp(attempts[0].completedAt)}</span>
        <span>
          {formatQuizAttemptTimestamp(
            attempts[attempts.length - 1].completedAt,
          )}
        </span>
      </div>
    </div>
  );
}

function ProgressHeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-app/10 bg-app/10 p-4">
      <p className="font-serif text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-app/65">{label}</p>
    </div>
  );
}

function ProgressMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-subtle bg-app p-4">
      <p className="font-serif text-2xl font-semibold text-content">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{label}</p>
    </div>
  );
}

function ProgressBarRow({ label, value }: { label: string; value: number }) {
  const barClass =
    value >= 80 ? "bg-success" : value >= 60 ? "bg-warning" : "bg-danger";
  const badgeClass =
    value >= 80
      ? "bg-success-soft text-success"
      : value >= 60
        ? "bg-warning-soft text-warning"
        : "bg-danger-soft text-danger";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${badgeClass}`}>
          {value}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-app">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function NewProjectView({
  projectName,
  subjectName,
  institutionName,
  files,
  canGenerate,
  hasMaterialRights,
  generationState,
  generationProgress,
  completedSteps,
  preparedProject,
  generationError,
  isImportingJson,
  jsonImportMessage,
  isDragging,
  fileInputRef,
  onBack,
  onProjectNameChange,
  onSubjectNameChange,
  onInstitutionNameChange,
  onMaterialRightsChange,
  onAddFiles,
  onRemoveFile,
  onDrop,
  onDragStateChange,
  onStartGeneration,
  onImportJson,
  onOpenGeneratedProject,
}: {
  projectName: string;
  subjectName: string;
  institutionName: string;
  files: UploadedFile[];
  canGenerate: boolean;
  hasMaterialRights: boolean;
  generationState: GenerationState;
  generationProgress: number;
  completedSteps: string[];
  preparedProject: StudyProjectPrepareResponse | null;
  generationError: string | null;
  isImportingJson: boolean;
  jsonImportMessage: string | null;
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onProjectNameChange: (value: string) => void;
  onSubjectNameChange: (value: string) => void;
  onInstitutionNameChange: (value: string) => void;
  onMaterialRightsChange: (value: boolean) => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onStartGeneration: () => void | Promise<void>;
  onImportJson: (file: File) => void | Promise<void>;
  onOpenGeneratedProject: () => void;
}) {
  const totalFileSize = files.reduce((total, file) => total + file.size, 0);
  const detailFieldsCompleted =
    projectName.trim().length > 0 &&
    subjectName.trim().length > 0 &&
    institutionName.trim().length > 0;
  const setupSteps = [
    { label: "Detalii", done: detailFieldsCompleted },
    { label: "Materiale", done: files.length > 0 },
    { label: "Drepturi", done: hasMaterialRights },
  ];

  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Proiectele tale
      </button>

      {generationState === "form" ? (
        <>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-warning">
                Proiect nou
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                Încarcă un curs.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
                Adaugi contextul, pui materialele și primești pachetul de
                studiu pregătit pentru import.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {setupSteps.map((step) => (
                <span
                  key={step.label}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${
                    step.done
                      ? "border-success-border bg-success-soft text-success"
                      : "border-subtle bg-surface text-muted"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      step.done ? "bg-success" : "bg-muted/30"
                    }`}
                  />
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          {generationError ? (
            <div className="mt-5 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
              {generationError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-[2rem] border border-subtle bg-surface">
              <div className="grid gap-0 divide-y divide-subtle lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                <label className="block p-5">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-muted">
                    Nume
                  </span>
                  <input
                    value={projectName}
                    onChange={(event) => onProjectNameChange(event.target.value)}
                    type="text"
                    placeholder="Ex: Farma sem. 2"
                    className="mt-3 h-14 w-full rounded-2xl border border-subtle bg-app px-4 font-serif text-xl font-semibold outline-none transition placeholder:text-muted/45 focus:border-success focus:bg-surface focus:ring-4 focus:ring-success-soft"
                  />
                </label>

                <label className="block p-5">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-muted">
                    Materie
                  </span>
                  <input
                    value={subjectName}
                    onChange={(event) => onSubjectNameChange(event.target.value)}
                    type="text"
                    placeholder="Ex: Imunologie"
                    className="mt-3 h-14 w-full rounded-2xl border border-subtle bg-app px-4 text-base font-semibold outline-none transition placeholder:text-muted/45 focus:border-success focus:bg-surface focus:ring-4 focus:ring-success-soft"
                  />
                </label>

                <label className="block p-5">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-muted">
                    Școală
                  </span>
                  <input
                    value={institutionName}
                    onChange={(event) =>
                      onInstitutionNameChange(event.target.value)
                    }
                    type="text"
                    placeholder="Ex: UMF / UTCN"
                    className="mt-3 h-14 w-full rounded-2xl border border-subtle bg-app px-4 text-base font-semibold outline-none transition placeholder:text-muted/45 focus:border-success focus:bg-surface focus:ring-4 focus:ring-success-soft"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  onDragStateChange(true);
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  onDragStateChange(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  onDragStateChange(false);
                }}
                onDrop={onDrop}
                className={`flex w-full items-center gap-4 border-t border-dashed p-6 text-left transition sm:p-8 ${
                  isDragging
                    ? "border-success bg-success-soft"
                    : "border-subtle hover:bg-surface-hover"
                }`}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-app text-content">
                  <Icon className="h-6 w-6">
                    <path d="M12 16V4M7 9l5-5 5 5" />
                    <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                  </Icon>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-2xl font-semibold leading-tight">
                    {files.length
                      ? `${files.length} materiale selectate`
                      : "Adaugă materialele"}
                  </span>
                  <span className="mt-1 block text-sm text-muted">
                    {files.length
                      ? `${formatBytes(totalFileSize)} în total`
                      : "PDF, PPTX, DOCX, XLSX, TXT sau Markdown"}
                  </span>
                </span>
                <span className="hidden rounded-full bg-content px-4 py-2 text-xs font-black text-app sm:inline-flex">
                  Alege fișiere
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.pptx,.docx,.txt,.md,.html,.csv,.xls,.xlsx"
                className="hidden"
                onChange={(event) => onAddFiles(event.target.files)}
              />

              {files.length > 0 ? (
                <div className="divide-y divide-subtle border-t border-subtle px-5">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">
                          {file.name}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {formatBytes(file.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveFile(index)}
                        className="w-fit rounded-full border border-subtle px-3 py-2 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content"
                      >
                        Elimină
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="h-fit rounded-[2rem] border border-subtle bg-surface p-5 xl:sticky xl:top-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">
                Pregătire
              </p>
              <div className="mt-4 divide-y divide-subtle border-y border-subtle">
                {setupSteps.map((step) => (
                  <div
                    key={step.label}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <span className="text-sm font-bold">{step.label}</span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        step.done
                          ? "bg-success-soft text-success"
                          : "bg-surface-hover text-muted"
                      }`}
                    >
                      {step.done ? "ok" : "lipsește"}
                    </span>
                  </div>
                ))}
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-subtle bg-app p-4 text-sm font-semibold leading-6">
                <input
                  type="checkbox"
                  checked={hasMaterialRights}
                  onChange={(event) =>
                    onMaterialRightsChange(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-action"
                />
                Am dreptul să folosesc aceste materiale.
              </label>

              <button
                type="button"
                disabled={!canGenerate}
                onClick={onStartGeneration}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-content px-5 py-4 text-sm font-black text-app transition disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted"
              >
                Pregătește proiectul
                <Icon>
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </Icon>
              </button>

              <p className="mt-4 text-xs leading-5 text-muted">
                Nu încărca date sensibile. Limita curentă este 50MB / fișier.
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold text-muted">
                {["Rezumat", "Flashcard-uri", "Quiz-uri", "Cuvinte cheie"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-subtle px-3 py-2 text-center"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </aside>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-subtle px-4 py-4 text-sm font-black text-muted transition hover:bg-surface-hover sm:hidden"
          >
            <Icon>
              <path d="M12 16V4M7 9l5-5 5 5" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </Icon>
            Alege fișiere
          </button>
        </>
      ) : (
          <GenerationView
            projectName={projectName}
            state={generationState}
            progress={generationProgress}
            completedSteps={completedSteps}
            preparedProject={preparedProject}
            generationError={generationError}
            isImportingJson={isImportingJson}
            jsonImportMessage={jsonImportMessage}
            onImportJson={onImportJson}
            onOpenGeneratedProject={onOpenGeneratedProject}
          />
      )}
    </section>
  );
}

function GenerationView({
  projectName,
  state,
  progress,
  completedSteps,
  preparedProject,
  generationError,
  isImportingJson,
  jsonImportMessage,
  onImportJson,
  onOpenGeneratedProject,
}: {
  projectName: string;
  state: GenerationState;
  progress: number;
  completedSteps: string[];
  preparedProject: StudyProjectPrepareResponse | null;
  generationError: string | null;
  isImportingJson: boolean;
  jsonImportMessage: string | null;
  onImportJson: (file: File) => void | Promise<void>;
  onOpenGeneratedProject: () => void;
}) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">
        {state === "done" ? "Materialul este pregătit" : "Se convertește"}
        <span className="text-muted"> - {projectName}</span>
      </h1>
      <p className="mt-1 text-sm text-muted">
        {state === "done"
          ? "Descarcă markdown-ul și promptul, apoi încarcă JSON-ul primit de la ChatGPT."
          : "Documentele sunt convertite în markdown cu MarkItDown."}
      </p>

      {generationError ? (
        <div className="mt-5 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {generationError}
        </div>
      ) : null}

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-success transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-subtle bg-surface px-4">
        {generationSteps.map((step) => {
          const isDone = completedSteps.includes(step);
          const isCurrent =
            !isDone && completedSteps.length === generationSteps.indexOf(step);

          return (
            <div
              key={step}
              className="flex items-center gap-3 border-t border-subtle py-4 first:border-t-0"
            >
              <span className="flex-1 text-sm font-semibold">{step}</span>
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-success text-app"
                    : isCurrent
                      ? "animate-spin border-2 border-subtle border-t-success"
                      : "border border-subtle"
                }`}
              >
                {isDone ? (
                  <Icon className="h-3.5 w-3.5">
                    <path d="M20 6 9 17l-5-5" />
                  </Icon>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {state === "done" ? (
        <div className="mt-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <Icon className="h-6 w-6">
              <path d="M20 6 9 17l-5-5" />
            </Icon>
          </span>
          <p className="mt-4 text-sm leading-6 text-muted">
            Markdown-ul și promptul au fost create. Următorul pas este manual:
            le încarci în ChatGPT, iar JSON-ul primit îl aduci aici.
          </p>

          {preparedProject ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <a
                href={preparedProject.markdown_download_url}
                className="rounded-2xl border border-subtle bg-surface px-4 py-3 text-sm font-black transition hover:bg-surface-hover"
              >
                Descarcă Markdown
              </a>
              <a
                href={preparedProject.prompt_download_url}
                className="rounded-2xl border border-subtle bg-surface px-4 py-3 text-sm font-black transition hover:bg-surface-hover"
              >
                Descarcă promptul
              </a>
            </div>
          ) : null}

          <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-subtle bg-surface p-5 transition hover:bg-surface-hover">
            <span className="text-sm font-black">
              Încarcă JSON-ul generat de ChatGPT
            </span>
            <span className="mt-1 text-xs leading-5 text-muted">
              Format acceptat: .json, conform promptului generat.
            </span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              disabled={!preparedProject || isImportingJson}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onImportJson(file);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {isImportingJson ? (
            <p className="mt-3 text-xs font-semibold text-muted">
              Importăm JSON-ul și creăm pachetul proiectului...
            </p>
          ) : null}
          {jsonImportMessage ? (
            <div className="mt-3 rounded-2xl border border-success-border bg-success-soft px-4 py-3 text-sm font-semibold text-success">
              {jsonImportMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onOpenGeneratedProject}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-semibold text-app"
          >
            Deschide proiectul
            <Icon>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </Icon>
          </button>
        </div>
      ) : null}
    </div>
  );
}
