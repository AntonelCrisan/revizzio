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

type ViewId = "home" | "project" | "new";
export type TabId =
  | "rezumat"
  | "flashcards"
  | "quiz"
  | "strategii"
  | "progres"
  | "chat";
type GenerationState = "form" | "generating" | "done";

type StudyProject = {
  id: string;
  name: string;
  meta: string;
  flashcardsDue: number;
  flashcardsTotal: number;
  progress: number;
  strategies: Array<{
    title: string;
    description: string;
  }>;
};

type UploadedFile = {
  name: string;
  size: number;
};

const initialProjects: StudyProject[] = [
  {
    id: "biologie",
    name: "Biologie celulară",
    meta: "Capitolul 3 · Celula · 28 pagini",
    flashcardsDue: 12,
    flashcardsTotal: 32,
    progress: 64,
    strategies: [
      {
        title: "Desenează celula din memorie",
        description:
          "După ce citești o secțiune, închide cartea și redesenează schema cu organitele. Comparațiile vizuale fixează informația mai bine decât textul.",
      },
      {
        title: "Asociază organitul cu funcția lui printr-o poveste",
        description:
          "Mitocondria produce energie ca o uzină. Micro-poveștile scurte ajută la reținerea funcțiilor fiecărui organit.",
      },
      {
        title: "Tabel comparativ celulă animală vs. vegetală",
        description:
          "Pune-le pe coloane. Diferențele ies în evidență mult mai ușor decât citite separat.",
      },
    ],
  },
  {
    id: "chimie",
    name: "Chimie organică",
    meta: "Reacții de adiție · 19 pagini",
    flashcardsDue: 5,
    flashcardsTotal: 18,
    progress: 30,
    strategies: [
      {
        title: "Rescrie mecanismele pas cu pas",
        description:
          "Desenează săgețile electronilor de mână, de fiecare dată, până devine reflex.",
      },
      {
        title: "Grupează reacțiile după mecanism",
        description:
          "Reacțiile cu mecanism similar se rețin împreună mai ușor decât în ordinea din curs.",
      },
      {
        title: "Codează culorile atomilor care se mută",
        description:
          "Marchează atomii implicați direct în reacție ca să vezi tiparul mult mai rapid.",
      },
    ],
  },
  {
    id: "drept",
    name: "Drept civil",
    meta: "Obligații contractuale · 34 pagini",
    flashcardsDue: 0,
    flashcardsTotal: 40,
    progress: 88,
    strategies: [
      {
        title: "Construiește spețe proprii din fiecare articol",
        description:
          "Transformă fiecare normă într-un scenariu concret. Este mai ușor de reținut decât textul de lege gol.",
      },
      {
        title: "Tabel cu condițiile de valabilitate",
        description:
          "Pune tipurile de contracte unul lângă altul ca să vezi imediat ce este comun și ce diferă.",
      },
      {
        title: "Reformulează definițiile cu propriile cuvinte",
        description:
          "Dacă nu poți reformula un termen juridic simplu, încă nu l-ai înțeles complet.",
      },
    ],
  },
];

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

const generationSteps = [
  "Rezumat",
  "Flashcard-uri",
  "Quiz-uri",
  "Cuvinte cheie",
  "Strategii",
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

function BookIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Icon>
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
  return (
    projects.find((project) => project.id === projectId) ?? projects[0]
  );
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
  initialView?: ViewId;
  useTabPages?: boolean;
};

export function AccountDashboard({
  initialProjectId,
  initialTab = "flashcards",
  initialChatBackTab,
  initialView = "home",
  useTabPages = false,
}: AccountDashboardProps = {}) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const generationTimers = useRef<number[]>([]);
  const startingProject = getProjectById(initialProjects, initialProjectId);

  const [projects, setProjects] = useState(initialProjects);
  const [view, setView] = useState<ViewId>(initialView);
  const [activeProjectId, setActiveProjectId] = useState(startingProject.id);
  const [openProjectId, setOpenProjectId] = useState<string | null>(
    startingProject.id,
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [hasMaterialRights, setHasMaterialRights] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [generationState, setGenerationState] =
    useState<GenerationState>("form");
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const activeProject = useMemo(
    () => getProjectById(projects, activeProjectId),
    [activeProjectId, projects],
  );

  const firstName = user?.full_name.split(" ")[0] ?? "student";
  const canGenerate =
    projectName.trim().length > 0 && uploadedFiles.length > 0 && hasMaterialRights;
  const generationProgress = Math.round(
    (completedSteps.length / generationSteps.length) * 100,
  );

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    return () => {
      generationTimers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

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
    if (useTabPages) {
      setSidebarOpen(false);
      router.push("/myaccount");
      return;
    }

    setView("home");
    setSidebarOpen(false);
  }

  function openProject(projectId: string, tab: TabId = "flashcards") {
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
    setUploadedFiles([]);
    setHasMaterialRights(false);
    setCompletedSteps([]);
    setGenerationState("form");
  }

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadedFiles((currentFiles) => [
      ...currentFiles,
      ...Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
      })),
    ]);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function startGeneration() {
    if (!canGenerate) return;

    generationTimers.current.forEach((timer) => window.clearTimeout(timer));
    generationTimers.current = [];
    setGenerationState("generating");
    setCompletedSteps([]);

    generationSteps.forEach((step, index) => {
      const timer = window.setTimeout(() => {
        setCompletedSteps((currentSteps) => [...currentSteps, step]);
        if (index === generationSteps.length - 1) {
          setGenerationState("done");
        }
      }, 650 * (index + 1));
      generationTimers.current.push(timer);
    });
  }

  function createGeneratedProject() {
    const name = projectName.trim();
    if (!name) return;

    const id = `${slugify(name)}-${Math.floor(Math.random() * 1000)}`;
    const newProject: StudyProject = {
      id,
      name,
      meta: `${uploadedFiles.length} materiale · generat azi`,
      flashcardsDue: 24,
      flashcardsTotal: 24,
      progress: 0,
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col border-r border-subtle bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-content transition hover:bg-surface-hover"
            >
              <Icon className="h-[18px] w-[18px]">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.08.08a2 2 0 1 1-2.83-2.83l.08-.08A1.7 1.7 0 0 0 10.6 15a1.7 1.7 0 0 0-1.88-.34l-.1.04a2 2 0 1 1-1.53-3.7l.1-.04A1.7 1.7 0 0 0 7.8 9a1.7 1.7 0 0 0-.6-1l-.08-.08a2 2 0 1 1 2.83-2.83l.08.08A1.7 1.7 0 0 0 12 4.6a1.7 1.7 0 0 0 1-.6l.08-.08a2 2 0 1 1 2.83 2.83l-.08.08A1.7 1.7 0 0 0 16.4 9a1.7 1.7 0 0 0 1.88.34l.1-.04a2 2 0 1 1 1.53 3.7l-.1.04A1.7 1.7 0 0 0 19.4 15z" />
              </Icon>
              Setări
            </Link>
            <Link
              href="/upgrade"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-content transition hover:bg-surface-hover"
            >
              <Icon className="h-[18px] w-[18px]">
                <path d="M12 3l3.2 6.5 7.1 1-5.1 5 1.2 7-6.4-3.4-6.4 3.4 1.2-7-5.1-5 7.1-1L12 3z" />
              </Icon>
              Upgrade
            </Link>
          </nav>

          <p className="px-5 pt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            Proiectele tale
          </p>

          <div className="mt-2 space-y-1 px-2">
            {projects.map((project) => {
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
                        {project.meta}
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
            })}
          </div>

          <div className="mx-4 my-5 h-px bg-subtle" />

          <div className="mx-4 rounded-2xl border border-subtle bg-app p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-[0.08em]">PLAN START</p>
              <span className="text-[11px] text-muted">gratuit</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full w-2/3 rounded-full bg-success" />
            </div>
            <p className="mt-2 text-xs text-muted">
              2 din 3 materiale procesate luna aceasta
            </p>
            <Link
              href="/upgrade"
              className="mt-3 flex items-center justify-center rounded-full border border-content px-3 py-2 text-xs font-bold transition hover:bg-content hover:text-app"
            >
              Upgrade plan
            </Link>
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

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-subtle bg-app px-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-content transition hover:bg-surface-hover lg:hidden"
              aria-label="Deschide meniul"
            >
              <Icon className="h-5 w-5">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </Icon>
            </button>
            <Logo />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-success-soft text-xs font-bold text-success">
              {initials(user.full_name)}
            </span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {view === "home" ? (
            <HomeView
              firstName={firstName}
              projects={projects}
              onOpenProject={openProject}
              onOpenNewProject={openNewProject}
            />
          ) : null}

          {view === "project" && activeProject ? (
            <ProjectView
              project={activeProject}
              activeTab={activeTab}
              chatBackTab={chatBackTab}
              onBack={showHome}
              onTabChange={changeProjectTab}
            />
          ) : null}

          {view === "new" ? (
            <NewProjectView
              projectName={projectName}
              files={uploadedFiles}
              canGenerate={canGenerate}
              hasMaterialRights={hasMaterialRights}
              generationState={generationState}
              generationProgress={generationProgress}
              completedSteps={completedSteps}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              onBack={showHome}
              onProjectNameChange={setProjectName}
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
}: {
  firstName: string;
  projects: StudyProject[];
  onOpenProject: (projectId: string, tab?: TabId) => void;
  onOpenNewProject: () => void;
}) {
  return (
    <section>
      <h1 className="font-serif text-2xl font-semibold">
        Bună, <em className="text-success">{firstName}</em>
      </h1>
      <p className="mt-1 text-sm text-muted">
        Ai 2 proiecte cu sesiuni pregătite azi.
      </p>

      <SectionLabel>Proiectele tale</SectionLabel>
      <div className="mt-3 flex flex-col gap-3">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => onOpenProject(project.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-subtle bg-surface p-4 text-left transition hover:bg-surface-hover"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-success"
              style={{
                background: `conic-gradient(var(--theme-success-text) ${project.progress}%, var(--theme-border) 0)`,
              }}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface">
                {project.progress}%
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">
                {project.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {project.meta}
              </span>
            </span>
            <Icon className="h-4 w-4 shrink-0 text-muted">
              <path d="M9 18l6-6-6-6" />
            </Icon>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onOpenNewProject}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-subtle px-4 py-4 text-sm font-bold text-muted transition hover:bg-surface-hover"
      >
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
        Proiect nou
      </button>
    </section>
  );
}

function ProjectView({
  project,
  activeTab,
  chatBackTab,
  onBack,
  onTabChange,
}: {
  project: StudyProject;
  activeTab: TabId;
  chatBackTab: TabId;
  onBack: () => void;
  onTabChange: (tab: TabId) => void;
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
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Proiectele tale
      </button>

      <div className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Proiect activ
        </p>
        <h1 className="font-serif text-2xl font-semibold">{project.name}</h1>
        <p className="mt-1 text-sm text-muted">{project.meta}</p>
      </div>

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
        {activeTab === "rezumat" ? <SummaryPanel /> : null}
        {activeTab === "flashcards" ? <FlashcardsPanel project={project} /> : null}
        {activeTab === "quiz" ? <QuizPanel /> : null}
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

type PendingSummarySelection = {
  text: string;
  paragraphIndex: number;
};

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
  kind: "keyword" | "user";
  keyword?: SummaryKeyword;
  highlight?: UserSummaryHighlight;
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

const summaryParagraphs = [
  "Celula este unitatea de bază a vieții și funcționează ca un sistem organizat, în care fiecare componentă are un rol precis. În interiorul ei se află organite specializate care împart sarcinile esențiale: coordonare, producție de energie, sinteză de proteine, transport și reciclare celulară.",
  "Centrul de control este nucleul, unde se găsește materialul genetic. ADN-ul conține instrucțiuni pentru funcționarea celulei, iar aceste informații sunt folosite pentru a produce molecule necesare creșterii, reparării și adaptării celulare.",
  "Producția de proteine începe prin citirea informației genetice și continuă în ribozomi. Aceștia pot fi liberi în citoplasmă sau atașați de reticulul endoplasmatic rugos. Proteinele rezultate pot rămâne în celulă sau pot fi trimise către alte zone unde sunt modificate, transportate ori secretate.",
  "Energia necesară acestor procese este produsă în principal de mitocondrie. Aici are loc transformarea substanțelor nutritive în ATP, moneda energetică a celulei. Cu cât o celulă are activitate mai intensă, cu atât are nevoie de mai multă energie și, de obicei, de mai multe mitocondrii.",
  "Limita dintre interiorul și exteriorul celulei este controlată de membrana celulară. Aceasta nu este doar o barieră, ci un filtru selectiv: permite intrarea substanțelor utile, eliminarea deșeurilor și comunicarea cu alte celule prin receptori specializați.",
  "Un proces central pentru supraviețuire este respirația celulară, prin care glucoza și oxigenul sunt folosite pentru a genera energie. Acest proces explică legătura dintre nutriție, respirație și activitatea fiecărei celule din organism.",
  "În paralel, sinteza proteică susține funcțiile structurale și enzimatice ale celulei. Fără proteine, celula nu ar putea construi componente noi, nu ar putea repara structuri afectate și nu ar putea regla reacțiile chimice interne.",
  "Diferențele dintre celula animală și cea vegetală apar prin structuri specifice. Celula vegetală are perete celular, cloroplaste și o vacuolă mare, în timp ce celula animală este mai flexibilă și nu realizează fotosinteză. Totuși, ambele tipuri de celule au aceleași principii de organizare: separarea funcțiilor, reglarea schimburilor și coordonarea proceselor interne.",
];

const summaryKeywords: SummaryKeyword[] = [
  {
    id: "rezumat-organite",
    label: "Organite",
    text: "organite",
    paragraphIndex: 0,
  },
  {
    id: "rezumat-nucleu",
    label: "Nucleu",
    text: "nucleul",
    paragraphIndex: 1,
  },
  {
    id: "rezumat-ribozomi",
    label: "Ribozomi",
    text: "ribozomi",
    paragraphIndex: 2,
  },
  {
    id: "rezumat-mitocondrie",
    label: "Mitocondrie",
    text: "mitocondrie",
    paragraphIndex: 3,
  },
  {
    id: "rezumat-membrana",
    label: "Membrana celulară",
    text: "membrana celulară",
    paragraphIndex: 4,
  },
  {
    id: "rezumat-respiratie",
    label: "Respirație celulară",
    text: "respirația celulară",
    paragraphIndex: 5,
  },
  {
    id: "rezumat-sinteza",
    label: "Sinteză proteică",
    text: "sinteza proteică",
    paragraphIndex: 6,
  },
];

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
): LearningAiResponse {
  const normalizedText = selection.text.toLocaleLowerCase("ro-RO");
  const matchedKeyword = summaryKeywords.find(
    (keyword) =>
      normalizedText.includes(keyword.text.toLocaleLowerCase("ro-RO")) ||
      normalizedText.includes(keyword.label.toLocaleLowerCase("ro-RO")),
  );
  const concept = matchedKeyword?.label ?? "fragmentul selectat";
  const sourceParagraph = summaryParagraphs[selection.paragraphIndex];

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
  let searchFrom = 0;

  while (searchFrom < paragraph.length) {
    const start = paragraph.indexOf(searchText, searchFrom);

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
  userHighlights: UserSummaryHighlight[],
  keywordClass: string,
  userHighlightClass: string,
  activeKeywordId: string | null,
  onUserHighlightClick: (highlight: UserSummaryHighlight) => void,
) {
  const keywordRanges = summaryKeywords
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

  const ranges = [...keywordRanges, ...userRanges];
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
    const userHighlight = userRange?.highlight;
    const isActiveKeyword =
      keywordRange?.keyword?.id !== undefined &&
      keywordRange.keyword.id === activeKeywordId;

    if (!keywordRange && !userRange) {
      return text;
    }

    return (
      <mark
        key={`${paragraphIndex}-${start}-${end}`}
        id={
          keywordRange?.keyword && start === keywordRange.start
            ? keywordRange.keyword.id
            : undefined
        }
        role={userHighlight ? "button" : undefined}
        tabIndex={userHighlight ? 0 : undefined}
        title={userHighlight ? "Apasă pentru opțiuni" : undefined}
        onClick={
          userHighlight
            ? (event) => {
                event.stopPropagation();
                onUserHighlightClick(userHighlight);
              }
            : undefined
        }
        onKeyDown={
          userHighlight
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

function SummaryPanel() {
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const keywordFocusTimer = useRef<number | null>(null);
  const aiResponseTimer = useRef<number | null>(null);
  const [pendingSelection, setPendingSelection] =
    useState<PendingSummarySelection | null>(null);
  const [selectedHighlight, setSelectedHighlight] =
    useState<UserSummaryHighlight | null>(null);
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
  const [aiDialog, setAiDialog] = useState<SummaryAiDialog | null>(null);
  const [pendingHighlightColor, setPendingHighlightColor] =
    useState<SummaryHighlightColorId>(defaultSummaryHighlightColor);
  const [userHighlights, setUserHighlights] = useState<UserSummaryHighlight[]>(
    [],
  );

  const keywordHighlightClass =
    "scroll-mt-28 rounded-md border border-warning-border bg-warning-soft px-1.5 py-0.5 font-semibold text-warning";
  const userHighlightClass =
    "box-decoration-clone cursor-pointer rounded-md border px-1.5 py-0.5 font-semibold transition hover:ring-2 hover:ring-info/35 focus:outline-none focus:ring-2 focus:ring-info/60";

  useEffect(() => {
    return () => {
      if (keywordFocusTimer.current) {
        window.clearTimeout(keywordFocusTimer.current);
      }
      if (aiResponseTimer.current) {
        window.clearTimeout(aiResponseTimer.current);
      }
    };
  }, []);

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

    setPendingSelection({
      text: selectedText,
      paragraphIndex: anchorParagraphIndex,
    });
    setSelectedHighlight(null);
  }

  function handleAddHighlight() {
    if (!pendingSelection) {
      return;
    }

    setUserHighlights((currentHighlights) => {
      const alreadyHighlighted = currentHighlights.some(
        (highlight) =>
          highlight.paragraphIndex === pendingSelection.paragraphIndex &&
          highlight.text === pendingSelection.text,
      );

      if (alreadyHighlighted) {
        return currentHighlights.map((highlight) =>
          highlight.paragraphIndex === pendingSelection.paragraphIndex &&
          highlight.text === pendingSelection.text
            ? { ...highlight, color: pendingHighlightColor }
            : highlight,
        );
      }

      return [
        ...currentHighlights,
        {
          ...pendingSelection,
          color: pendingHighlightColor,
          id: `summary-highlight-${Date.now()}`,
        },
      ];
    });

    setPendingSelection(null);
    setSelectedHighlight(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleRemoveHighlight(highlightId: string) {
    setUserHighlights((currentHighlights) =>
      currentHighlights.filter((highlight) => highlight.id !== highlightId),
    );
    setSelectedHighlight((currentHighlight) =>
      currentHighlight?.id === highlightId ? null : currentHighlight,
    );
  }

  function handleOpenHighlightOptions(highlight: UserSummaryHighlight) {
    setSelectedHighlight(highlight);
    setPendingHighlightColor(highlight.color);
    setPendingSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function handleHighlightColorChange(color: SummaryHighlightColorId) {
    setPendingHighlightColor(color);

    if (!selectedHighlight) {
      return;
    }

    setUserHighlights((currentHighlights) =>
      currentHighlights.map((highlight) =>
        highlight.id === selectedHighlight.id ? { ...highlight, color } : highlight,
      ),
    );
    setSelectedHighlight((highlight) =>
      highlight ? { ...highlight, color } : highlight,
    );
  }

  function handleAskAi(selection: PendingSummarySelection | UserSummaryHighlight) {
    if (aiResponseTimer.current) {
      window.clearTimeout(aiResponseTimer.current);
    }

    const aiSelection = {
      text: selection.text,
      paragraphIndex: selection.paragraphIndex,
    };

    setAiDialog({
      ...aiSelection,
      status: "loading",
    });

    aiResponseTimer.current = window.setTimeout(() => {
      setAiDialog({
        ...aiSelection,
        status: "done",
        response: buildSummaryAiResponse(aiSelection),
      });
      aiResponseTimer.current = null;
    }, 950);
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

  const aiSelectionTarget = pendingSelection ?? selectedHighlight;
  const activeHighlightColor = selectedHighlight?.color ?? pendingHighlightColor;

  return (
    <article className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7 lg:p-8">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="max-w-none">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Rezumat complet
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight">
            Celula ca sistem viu: structură, energie și producție de proteine.
          </h2>

          <div className="mt-5 rounded-2xl border border-dashed border-subtle bg-app px-4 py-3 text-sm leading-6 text-muted">
            Selectează o propoziție sau un fragment din rezumat, apoi apasă
            butonul de highlight.
          </div>

          {pendingSelection || selectedHighlight ? (
            <div className="sticky top-16 z-20 mt-4 rounded-2xl border border-info-border bg-info-soft/95 p-4 text-info shadow-2xl shadow-black/10 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em]">
                {pendingSelection ? "Text selectat" : "Highlight selectat"}
              </p>
              <p className="mt-2 text-sm leading-6">
                “{pendingSelection?.text ?? selectedHighlight?.text}”
              </p>
              <SummaryHighlightColorPicker
                value={activeHighlightColor}
                onChange={handleHighlightColorChange}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingSelection ? (
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover"
                  >
                    Evidențiază
                  </button>
                ) : null}
                {selectedHighlight ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveHighlight(selectedHighlight.id)}
                    className="rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover"
                  >
                    Șterge highlight
                  </button>
                ) : null}
                {aiSelectionTarget ? (
                  <button
                    type="button"
                    onClick={() => handleAskAi(aiSelectionTarget)}
                    className="rounded-full border border-info-border bg-surface px-4 py-2 text-xs font-bold text-info transition hover:-translate-y-0.5 hover:bg-info-soft"
                  >
                    Întreabă AI
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setPendingSelection(null);
                    setSelectedHighlight(null);
                  }}
                  className="rounded-full border border-info-border px-4 py-2 text-xs font-bold transition hover:bg-info-soft/70"
                >
                  {pendingSelection ? "Anulează" : "Renunță"}
                </button>
              </div>
            </div>
          ) : null}

          <div
            ref={summaryRef}
            onKeyUp={readCurrentSelection}
            onMouseUp={readCurrentSelection}
            className="mt-6 space-y-5 text-sm leading-7 text-content/85 sm:text-base sm:leading-8"
          >
            {summaryParagraphs.map((paragraph, paragraphIndex) => (
              <p
                key={paragraph}
                data-summary-paragraph={paragraphIndex}
                className="select-text"
              >
                {renderSummaryText(
                  paragraph,
                  paragraphIndex,
                  userHighlights,
                  keywordHighlightClass,
                  userHighlightClass,
                  activeKeywordId,
                  handleOpenHighlightOptions,
                )}
              </p>
            ))}
          </div>

          <div className="mt-8 border-t border-subtle pt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Cuvinte cheie din rezumat
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summaryKeywords.map((keyword) => (
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

        <aside className="h-fit rounded-3xl border border-subtle bg-app p-5 xl:sticky xl:top-20">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Ideea centrală
          </p>
          <p className="mt-3 font-serif text-2xl font-semibold leading-tight">
            Celula funcționează ca un oraș mic: are centru de comandă, fabrici,
            filtre și surse de energie.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-subtle bg-surface p-4">
              <p className="font-serif text-2xl font-semibold">6 min</p>
              <p className="mt-1 text-xs text-muted">timp estimat</p>
            </div>
            <div className="rounded-2xl border border-subtle bg-surface p-4">
              <p className="font-serif text-2xl font-semibold">7</p>
              <p className="mt-1 text-xs text-muted">concepte cheie</p>
            </div>
          </div>
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

type FlashcardDeckId = "initial" | "quiz";

type AccountFlashcard = {
  topic: string;
  question: string;
  answer: string;
  tone: "success" | "warning" | "info" | "danger";
};

type FlashcardShuffleState = {
  id: number;
  cardIndex: number;
  direction: 1 | -1;
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

const accountFlashcardDecks: Record<
  FlashcardDeckId,
  {
    eyebrow: string;
    title: string;
    description: string;
    cards: AccountFlashcard[];
  }
> = {
  initial: {
    eyebrow: "Generate initial",
    title: "Flashcard-uri generate din rezumat",
    description:
      "Primul pachet extras din materialele încărcate, bun pentru recapitularea conceptelor de bază.",
    cards: [
      {
        topic: "Biologie celulară",
        question: "Care este rolul principal al ribozomilor?",
        answer:
          "Ribozomii sintetizează proteine prin traducerea informației din ARNm.",
        tone: "success",
      },
      {
        topic: "Energie celulară",
        question: "Ce produce mitocondria pentru celulă?",
        answer:
          "Mitocondria produce ATP, moneda energetică folosită în procesele celulare.",
        tone: "warning",
      },
      {
        topic: "Nucleu",
        question: "De ce este nucleul considerat centrul de control?",
        answer:
          "Nucleul conține ADN-ul și coordonează instrucțiunile pentru funcționarea celulei.",
        tone: "info",
      },
      {
        topic: "Membrană",
        question: "Ce face membrana celulară?",
        answer:
          "Membrana controlează schimburile cu exteriorul și ajută celula să comunice.",
        tone: "danger",
      },
    ],
  },
  quiz: {
    eyebrow: "Din quiz-urile tale",
    title: "Flashcard-uri din răspunsurile dificile",
    description:
      "Pachet adaptiv construit din întrebările unde ai ezitat sau unde răspunsul are nevoie de repetare.",
    cards: [
      {
        topic: "Quiz · ATP",
        question: "Ce organit trebuie asociat cu producția de ATP?",
        answer:
          "Mitocondria, pentru că transformă nutrienții în energie utilizabilă.",
        tone: "warning",
      },
      {
        topic: "Quiz · Proteine",
        question: "Ce structură este direct implicată în sinteza proteică?",
        answer:
          "Ribozomul, liber în citoplasmă sau atașat de reticulul endoplasmatic rugos.",
        tone: "success",
      },
      {
        topic: "Quiz · Transport",
        question: "De ce membrana celulară este selectivă?",
        answer:
          "Permite intrarea substanțelor utile și eliminarea deșeurilor, fără să lase totul să treacă liber.",
        tone: "info",
      },
      {
        topic: "Quiz · Organizare",
        question: "Care este ideea centrală despre organite?",
        answer:
          "Organitele împart sarcinile celulei: coordonare, energie, sinteză, transport și reciclare.",
        tone: "danger",
      },
    ],
  },
};

function toAccountFlashcardTransform(
  layout: (typeof accountFlashcardLayouts)[number],
) {
  return `translate3d(${layout.x}, ${layout.y}, 0) rotate(${layout.rotate}deg)`;
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
}: {
  card: AccountFlashcard;
  side: "question" | "answer";
  onFlip?: () => void;
}) {
  const isAnswer = side === "answer";
  const flipLabel = isAnswer ? "Vezi întrebarea" : "Vezi răspunsul";

  return (
    <div className="flashcard-card-content h-full">
      <div className="flex min-h-0 flex-1 items-center">
        <h3
          data-flashcard-text={side}
          className="flashcard-card-question select-text font-serif text-2xl font-semibold leading-snug sm:text-3xl"
        >
          {isAnswer ? card.answer : card.question}
        </h3>
      </div>

      <div className="flashcard-card-footer absolute inset-x-6 bottom-6 flex items-center justify-between border-t border-subtle pt-4 text-xs font-bold text-muted sm:inset-x-8">
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
        <span className="flex items-center gap-2 text-content">
          Revizzio
          <Icon>
            <path d="M5 12h14M13 5l7 7-7 7" />
          </Icon>
        </span>
      </div>
    </div>
  );
}

function AccountFlashcardContent({
  card,
  flipped = false,
  onFlip,
}: {
  card: AccountFlashcard;
  flipped?: boolean;
  onFlip?: () => void;
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
          />
        </div>
        <div className="flashcard-face-side flashcard-face-side-back theme-shadow-card rounded-[1.75rem] border border-subtle bg-surface p-6 text-content sm:p-8">
          <AccountFlashcardFaceContent
            card={card}
            side="answer"
            onFlip={onFlip}
          />
        </div>
      </div>
    </div>
  );
}

function FlashcardDeckPage({
  deckId,
  onBack,
}: {
  deckId: FlashcardDeckId;
  onBack: () => void;
}) {
  const deck = accountFlashcardDecks[deckId];
  const flashcardTextRef = useRef<HTMLDivElement | null>(null);
  const shuffleIdRef = useRef(0);
  const shuffleTimerRef = useRef<number | null>(null);
  const aiResponseTimerRef = useRef<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shuffle, setShuffle] = useState<FlashcardShuffleState | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [pendingFlashcardSelection, setPendingFlashcardSelection] =
    useState<PendingFlashcardSelection | null>(null);
  const [flashcardAiDialog, setFlashcardAiDialog] =
    useState<FlashcardAiDialog | null>(null);

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
    if (shuffleTimerRef.current) {
      window.clearTimeout(shuffleTimerRef.current);
    }

    const previousIndex = activeIndex;
    const nextIndex =
      (activeIndex + direction + deck.cards.length) % deck.cards.length;
    const animatedCardIndex = direction === 1 ? previousIndex : nextIndex;

    shuffleIdRef.current += 1;
    setShowAnswer(false);
    setPendingFlashcardSelection(null);
    window.getSelection()?.removeAllRanges();
    setShuffle({
      id: shuffleIdRef.current,
      cardIndex: animatedCardIndex,
      direction,
    });
    setActiveIndex(nextIndex);

    shuffleTimerRef.current = window.setTimeout(() => {
      setShuffle(null);
      shuffleTimerRef.current = null;
    }, 1750);
  }

  function toggleFlashcardSide() {
    setShowAnswer((visible) => !visible);
    setPendingFlashcardSelection(null);
    window.getSelection()?.removeAllRanges();
  }

  function readFlashcardSelection() {
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
      topic: deck.cards[activeIndex].topic,
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

  return (
    <section className="overflow-hidden rounded-[2rem] border border-subtle bg-surface p-5 sm:p-7 lg:p-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-content"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Înapoi la pachete
      </button>

      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            {deck.eyebrow}
          </p>
          <h2 className="mt-3 max-w-xl font-serif text-3xl font-semibold leading-tight sm:text-5xl">
            {deck.title}
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-muted sm:text-base">
            {deck.description}
          </p>

          <p className="mt-6 max-w-md text-sm font-semibold leading-6 text-muted">
            Selectează text din întrebare sau răspuns pentru explicații AI.
            Flip-ul se face doar din butonul de pe card.
          </p>

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

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => moveCard(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-subtle bg-app text-content transition hover:-translate-y-0.5 hover:bg-surface-hover"
              aria-label="Flashcard anterior"
            >
              <Icon>
                <path d="M19 12H5M11 5l-7 7 7 7" />
              </Icon>
            </button>
            <button
              type="button"
              onClick={() => moveCard(1)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-content text-app transition hover:-translate-y-0.5 hover:opacity-90"
              aria-label="Flashcard următor"
            >
              <Icon>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </Icon>
            </button>
            <span className="text-xs font-bold text-muted">
              {activeIndex + 1}/{deck.cards.length}
            </span>
          </div>
        </div>

        <div
          ref={flashcardTextRef}
          onKeyUp={readFlashcardSelection}
          onMouseUp={readFlashcardSelection}
          className="flashcard-story-deck relative mx-auto w-full max-w-xl"
        >
          {deck.cards.map((card, index) => {
            const distance =
              (index - activeIndex + deck.cards.length) % deck.cards.length;
            const isActive = distance === 0;
            const isShuffling = shuffle?.cardIndex === index;

            return (
              <div
                key={card.question}
                aria-hidden={!isActive}
                className="flashcard-desk-card flashcard-face absolute inset-x-3 top-0 rounded-[1.75rem] text-left outline-none transition sm:inset-x-0"
                style={{
                  zIndex: deck.cards.length - distance,
                  transform: toAccountFlashcardTransform(
                    accountFlashcardLayouts[distance],
                  ),
                  visibility: isShuffling ? "hidden" : "visible",
                  pointerEvents: isActive ? "auto" : "none",
                }}
              >
                <AccountFlashcardContent
                  card={card}
                  flipped={showAnswer && isActive}
                  onFlip={isActive ? toggleFlashcardSide : undefined}
                />
              </div>
            );
          })}

          {shuffle ? (
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
                      ? accountFlashcardLayouts[0]
                      : accountFlashcardLayouts[deck.cards.length - 1],
                  ),
                  "--shuffle-end": toAccountFlashcardTransform(
                    shuffle.direction === 1
                      ? accountFlashcardLayouts[deck.cards.length - 1]
                      : accountFlashcardLayouts[0],
                  ),
                } as CSSProperties
              }
            >
              <AccountFlashcardContent card={deck.cards[shuffle.cardIndex]} />
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

function FlashcardsPanel({ project }: { project: StudyProject }) {
  const [activeDeckId, setActiveDeckId] = useState<FlashcardDeckId | null>(null);
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
      title: "Din quiz-urile tale",
      description:
        "Flashcard-uri construite din întrebările dificile și din răspunsurile care au nevoie de repetare.",
      duration: "6 min",
      metric: "bazate pe quiz-uri",
    },
  ];

  if (activeDeckId) {
    return (
      <FlashcardDeckPage
        deckId={activeDeckId}
        onBack={() => setActiveDeckId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <GeneratedContentDisclaimer />
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
};

const accountQuizQuestionBank: Record<string, AccountQuizQuestion> = {
  "celula-unitate": {
    id: "celula-unitate",
    concept: "Celula",
    difficulty: "Ușor",
    mode: "single",
    question: "Ce reprezintă celula într-un organism viu?",
    answers: [
      "Unitatea de bază a vieții",
      "Un țesut specializat",
      "O moleculă energetică",
      "Un tip de proteină",
    ],
    correctIndexes: [0],
    explanation:
      "Celula este unitatea structurală și funcțională de bază a vieții.",
    aiInsight:
      "Aceasta este ancora capitolului. Dacă o reții, poți lega mai ușor organitele de funcțiile lor.",
    source: "Rezumat · introducere",
  },
  "organite-roluri": {
    id: "organite-roluri",
    concept: "Organite",
    difficulty: "Ușor",
    mode: "single",
    question: "Ce sunt organitele celulare?",
    answers: [
      "Structuri specializate care îndeplinesc funcții precise",
      "Fragmente de ADN libere în exteriorul celulei",
      "Substanțe nutritive fără rol structural",
      "Tipuri de celule independente",
    ],
    correctIndexes: [0],
    explanation:
      "Organitele împart sarcinile celulei: coordonare, energie, sinteză, transport și reciclare.",
    aiInsight:
      "Gândește organitele ca departamente într-un sistem viu, nu ca elemente izolate.",
    source: "Rezumat · organite",
  },
  "nucleu-control": {
    id: "nucleu-control",
    concept: "Nucleu",
    difficulty: "Ușor",
    mode: "single",
    question: "De ce nucleul este considerat centrul de control al celulei?",
    answers: [
      "Conține materialul genetic",
      "Produce direct ATP",
      "Filtrează substanțele care intră",
      "Descompune deșeurile celulare",
    ],
    correctIndexes: [0],
    explanation:
      "Nucleul conține ADN-ul, care păstrează instrucțiunile necesare funcționării celulei.",
    aiInsight:
      "Pentru întrebările despre control și instrucțiuni genetice, nucleul este aproape mereu conceptul-cheie.",
    source: "Rezumat · nucleu",
  },
  "ribozomi-proteine": {
    id: "ribozomi-proteine",
    concept: "Sinteză proteică",
    difficulty: "Mediu",
    mode: "single",
    question: "De ce ribozomii sunt esențiali pentru funcționarea celulei?",
    answers: [
      "Controlează intrarea apei",
      "Stochează materialul genetic",
      "Construiesc proteine pe baza informației genetice",
      "Transformă glucoza în oxigen",
    ],
    correctIndexes: [2],
    explanation:
      "Ribozomii citesc informația transmisă prin ARNm și construiesc proteinele necesare celulei.",
    aiInsight:
      "Leagă procesul de sinteză proteică de ARNm și ribozomi, nu doar de numele organitului.",
    source: "Flashcard-uri · sinteză proteică",
  },
  "mitocondrie-atp": {
    id: "mitocondrie-atp",
    concept: "Mitocondrie",
    difficulty: "Ușor",
    mode: "single",
    question: "Care organit produce cea mai mare parte din ATP în celulă?",
    answers: ["Ribozomul", "Mitocondria", "Aparatul Golgi", "Nucleul"],
    correctIndexes: [1],
    explanation:
      "Mitocondria transformă energia nutrienților în ATP, forma de energie folosită direct de celulă.",
    aiInsight:
      "Întrebarea testează asocierea dintre organit și funcție. Dacă ai ezitat, repetă relația energie -> mitocondrie -> ATP.",
    source: "Rezumat · paragraful despre energie celulară",
  },
  "membrana-selectiva": {
    id: "membrana-selectiva",
    concept: "Transport celular",
    difficulty: "Mediu",
    mode: "single",
    question:
      "Ce înseamnă că membrana celulară funcționează ca un filtru selectiv?",
    answers: [
      "Lasă toate moleculele să intre liber",
      "Permite doar schimburile utile și controlate",
      "Produce proteine pentru citoplasmă",
      "Înlocuiește rolul nucleului",
    ],
    correctIndexes: [1],
    explanation:
      "Membrana permite intrarea substanțelor utile, eliminarea deșeurilor și comunicarea cu alte celule.",
    aiInsight:
      "Conceptul-cheie este selecția. Nu te gândi la membrană ca la un zid, ci ca la o poartă controlată.",
    source: "Rezumat · membrana celulară",
  },
  "respiratie-proces": {
    id: "respiratie-proces",
    concept: "Respirație celulară",
    difficulty: "Mediu",
    mode: "single",
    question:
      "Ce explică procesul de respirație celulară în contextul energiei?",
    answers: [
      "Transformarea glucozei și oxigenului în energie utilizabilă",
      "Formarea peretelui celular la celulele animale",
      "Copierea directă a membranei celulare",
      "Blocarea schimburilor cu exteriorul",
    ],
    correctIndexes: [0],
    explanation:
      "Respirația celulară folosește glucoza și oxigenul pentru a genera energie sub formă de ATP.",
    aiInsight:
      "Dacă apare legătura nutriție + oxigen + energie, gândește imediat la respirație celulară.",
    source: "Rezumat · respirație celulară",
  },
  "vegetala-animala": {
    id: "vegetala-animala",
    concept: "Celulă animală vs vegetală",
    difficulty: "Ușor",
    mode: "single",
    question: "Ce structură este specifică celulei vegetale?",
    answers: [
      "Perete celular",
      "Ribozom",
      "Membrană celulară",
      "Nucleu",
    ],
    correctIndexes: [0],
    explanation:
      "Celula vegetală are perete celular, cloroplaste și o vacuolă mare.",
    aiInsight:
      "Când compari celula animală cu cea vegetală, caută structurile care apar doar la vegetală.",
    source: "Rezumat · comparație celule",
  },
  "adn-arn": {
    id: "adn-arn",
    concept: "ADN vs ARN",
    difficulty: "Greu",
    mode: "single",
    question:
      "Care este rolul informației genetice în producția de proteine?",
    answers: [
      "ADN-ul conține instrucțiuni care sunt folosite pentru sinteza proteinelor",
      "ADN-ul produce direct ATP în mitocondrie",
      "ARN-ul blochează citirea informației genetice",
      "Proteinele sunt produse fără instrucțiuni genetice",
    ],
    correctIndexes: [0],
    explanation:
      "ADN-ul conține instrucțiunile, iar informația este folosită în procesul care duce la sinteza proteinelor.",
    aiInsight:
      "Aici se testează lanțul logic: ADN -> informație -> ribozomi -> proteine. Merită transformat în flashcard.",
    source: "Quiz adaptiv · greșeli frecvente",
  },
  "proteine-traseu": {
    id: "proteine-traseu",
    concept: "Sinteză și transport",
    difficulty: "Greu",
    mode: "multiple",
    question:
      "Selectează structurile implicate în producția și procesarea proteinelor.",
    answers: [
      "Ribozomi",
      "Cloroplaste",
      "Reticul endoplasmatic rugos",
      "Aparatul Golgi",
    ],
    correctIndexes: [0, 2, 3],
    explanation:
      "Ribozomii sintetizează proteinele, reticulul rugos le ajută în procesare, iar aparatul Golgi le modifică și sortează.",
    aiInsight:
      "Întrebarea verifică traseul proteinelor. Nu e suficient să alegi ribozomii; contează și procesarea ulterioară.",
    source: "Quiz-uri · procesare proteine",
  },
  "membrana-roluri": {
    id: "membrana-roluri",
    concept: "Membrană celulară",
    difficulty: "Mediu",
    mode: "multiple",
    question: "Ce roluri are membrana celulară?",
    answers: [
      "Controlează schimburile cu exteriorul",
      "Ajută comunicarea prin receptori",
      "Depozitează ADN-ul",
      "Permite eliminarea deșeurilor",
    ],
    correctIndexes: [0, 1, 3],
    explanation:
      "Membrana este un filtru selectiv și o suprafață de comunicare cu mediul extern.",
    aiInsight:
      "Ai grijă la opțiunile care mută rolul nucleului către membrană. ADN-ul nu este depozitat în membrană.",
    source: "Rezumat · membrana celulară",
  },
  "vegetala-structuri": {
    id: "vegetala-structuri",
    concept: "Celulă vegetală",
    difficulty: "Mediu",
    mode: "multiple",
    question: "Ce structuri sunt caracteristice celulei vegetale?",
    answers: [
      "Perete celular",
      "Cloroplaste",
      "Vacuolă mare",
      "Centriol ca element definitoriu",
    ],
    correctIndexes: [0, 1, 2],
    explanation:
      "Celula vegetală are perete celular, cloroplaste și o vacuolă mare.",
    aiInsight:
      "Aceasta este o întrebare de comparație. Marchează ce diferențiază vegetalul, nu ce există în orice celulă.",
    source: "Rezumat · celule animale și vegetale",
  },
  "respiratie-input-output": {
    id: "respiratie-input-output",
    concept: "Respirație celulară",
    difficulty: "Greu",
    mode: "multiple",
    question:
      "Ce elemente sunt corect asociate cu respirația celulară?",
    answers: [
      "Glucoză",
      "Oxigen",
      "ATP",
      "Fotosinteză obligatorie în celula animală",
    ],
    correctIndexes: [0, 1, 2],
    explanation:
      "Respirația celulară folosește glucoza și oxigenul pentru a genera ATP.",
    aiInsight:
      "Capcana este fotosinteza. Celula animală nu realizează fotosinteză, dar are respirație celulară.",
    source: "Quiz adaptiv · respirație celulară",
  },
  "energie-mitocondrii": {
    id: "energie-mitocondrii",
    concept: "Energie celulară",
    difficulty: "Greu",
    mode: "multiple",
    question:
      "Ce afirmații sunt corecte despre celulele cu activitate intensă?",
    answers: [
      "Au nevoie de mai mult ATP",
      "Pot avea mai multe mitocondrii",
      "Nu folosesc deloc nutrienți",
      "Consumă mai multă energie",
    ],
    correctIndexes: [0, 1, 3],
    explanation:
      "O activitate celulară mai intensă cere mai multă energie și, de obicei, mai multe mitocondrii.",
    aiInsight:
      "Leagă cererea de energie de numărul de mitocondrii. Asta explică multe exemple din biologie.",
    source: "Rezumat · mitocondrie",
  },
  "adn-arn-afirmatii": {
    id: "adn-arn-afirmatii",
    concept: "ADN vs ARN",
    difficulty: "Greu",
    mode: "multiple",
    question: "Selectează afirmațiile corecte despre informația genetică.",
    answers: [
      "ADN-ul conține instrucțiuni pentru funcționarea celulei",
      "Informația genetică poate fi folosită pentru producția de proteine",
      "Ribozomii sunt implicați în sinteza proteinelor",
      "ADN-ul este produs de membrana celulară",
    ],
    correctIndexes: [0, 1, 2],
    explanation:
      "ADN-ul conține instrucțiuni, iar informația este folosită în sinteza proteinelor cu ajutorul ribozomilor.",
    aiInsight:
      "Aceasta verifică lanțul logic complet: informație genetică -> ribozomi -> proteine.",
    source: "Quiz adaptiv · ADN vs ARN",
  },
  "reciclare-celulara": {
    id: "reciclare-celulara",
    concept: "Reciclare celulară",
    difficulty: "Mediu",
    mode: "single",
    question: "De ce este importantă reciclarea celulară?",
    answers: [
      "Ajută la eliminarea și refolosirea componentelor afectate",
      "Înlocuiește complet producția de energie",
      "Transformă ADN-ul în perete celular",
      "Blochează comunicarea dintre celule",
    ],
    correctIndexes: [0],
    explanation:
      "Reciclarea celulară permite eliminarea deșeurilor și refolosirea unor componente.",
    aiInsight:
      "Dacă vezi termeni precum deșeuri, degradare sau refolosire, gândește-te la reciclare celulară.",
    source: "Rezumat · organizare celulară",
  },
  "receptori-comunicare": {
    id: "receptori-comunicare",
    concept: "Comunicare celulară",
    difficulty: "Mediu",
    mode: "single",
    question: "Cum comunică membrana celulară cu alte celule?",
    answers: [
      "Prin receptori specializați",
      "Prin distrugerea nucleului",
      "Prin eliminarea tuturor proteinelor",
      "Prin blocarea oxigenului",
    ],
    correctIndexes: [0],
    explanation:
      "Membrana are receptori specializați care ajută celula să primească și să transmită semnale.",
    aiInsight:
      "Membrana nu este doar o barieră; este și o interfață de comunicare.",
    source: "Rezumat · membrană și receptori",
  },
};

const accountQuizCatalog: AccountQuiz[] = [
  {
    id: "start-rapid",
    title: "Start rapid: celula",
    description:
      "Quiz scurt pentru încălzire, cu întrebări simple despre conceptele de bază.",
    complexity: "Mică",
    mode: "Single choice",
    duration: "5 min",
    focus: "Bazele capitolului",
    recommended: true,
    questionIds: [
      "celula-unitate",
      "organite-roluri",
      "nucleu-control",
      "mitocondrie-atp",
      "vegetala-animala",
      "reciclare-celulara",
    ],
  },
  {
    id: "organite-functii",
    title: "Organite și funcții",
    description:
      "Asociază fiecare organit cu rolul lui și verifică rapid dacă ai înțeles sistemul.",
    complexity: "Mică",
    mode: "Single choice",
    duration: "7 min",
    focus: "Organite",
    questionIds: [
      "organite-roluri",
      "nucleu-control",
      "ribozomi-proteine",
      "mitocondrie-atp",
      "reciclare-celulara",
      "receptori-comunicare",
      "vegetala-animala",
    ],
  },
  {
    id: "transport-celular",
    title: "Transport celular",
    description:
      "Întrebări despre membrană, selectivitate, receptori și schimburi cu exteriorul.",
    complexity: "Medie",
    mode: "Mixt",
    duration: "8 min",
    focus: "Membrană celulară",
    questionIds: [
      "membrana-selectiva",
      "receptori-comunicare",
      "membrana-roluri",
      "respiratie-proces",
      "organite-roluri",
      "reciclare-celulara",
      "vegetala-animala",
    ],
  },
  {
    id: "adn-proteine",
    title: "ADN, ARN și proteine",
    description:
      "Quiz mixt despre traseul informației genetice și sinteza proteică.",
    complexity: "Ridicată",
    mode: "Mixt",
    duration: "10 min",
    focus: "Sinteză proteică",
    questionIds: [
      "adn-arn",
      "ribozomi-proteine",
      "proteine-traseu",
      "adn-arn-afirmatii",
      "nucleu-control",
      "receptori-comunicare",
    ],
  },
  {
    id: "respiratie-energie",
    title: "Respirație și energie",
    description:
      "Întrebări mai grele despre ATP, mitocondrii și consumul energetic al celulei.",
    complexity: "Ridicată",
    mode: "Mixt",
    duration: "9 min",
    focus: "Energie celulară",
    questionIds: [
      "respiratie-proces",
      "mitocondrie-atp",
      "respiratie-input-output",
      "energie-mitocondrii",
      "membrana-selectiva",
      "organite-roluri",
    ],
  },
  {
    id: "capcane-multiple-choice",
    title: "Capcane multiple choice",
    description:
      "Selectează toate răspunsurile corecte și exersează întrebările unde apar cele mai multe confuzii.",
    complexity: "Ridicată",
    mode: "Multiple choice",
    duration: "11 min",
    focus: "Atenție la detalii",
    questionIds: [
      "proteine-traseu",
      "membrana-roluri",
      "vegetala-structuri",
      "respiratie-input-output",
      "energie-mitocondrii",
      "adn-arn-afirmatii",
    ],
  },
  {
    id: "simulare-examen",
    title: "Simulare examen",
    description:
      "Quiz mixt, cu single choice și multiple choice, construit ca o mini-simulare de examen.",
    complexity: "Ridicată",
    mode: "Mixt",
    duration: "14 min",
    focus: "Toate conceptele",
    questionIds: [
      "celula-unitate",
      "organite-roluri",
      "nucleu-control",
      "ribozomi-proteine",
      "proteine-traseu",
      "membrana-selectiva",
      "membrana-roluri",
      "respiratie-input-output",
      "adn-arn-afirmatii",
      "vegetala-structuri",
    ],
  },
];

function getQuizQuestions(quiz: AccountQuiz) {
  return quiz.questionIds.map((questionId) => accountQuizQuestionBank[questionId]);
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

function getQuizComplexityClass(complexity: QuizComplexity) {
  if (complexity === "Mică") {
    return "border-success-border bg-success-soft text-success";
  }

  if (complexity === "Medie") {
    return "border-info-border bg-info-soft text-info";
  }

  return "border-warning-border bg-warning-soft text-warning";
}

function QuizPanel() {
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, number[]>>({});
  const [submittedAnswers, setSubmittedAnswers] = useState<
    Record<string, number[]>
  >({});
  const activeQuiz = activeQuizId
    ? accountQuizCatalog.find((quiz) => quiz.id === activeQuizId) ?? null
    : null;

  if (!activeQuiz) {
    return (
      <QuizLibrary
        quizzes={accountQuizCatalog}
        onStartQuiz={(quizId) => {
          setActiveQuizId(quizId);
          setActiveQuestionIndex(0);
          setDraftAnswers({});
          setSubmittedAnswers({});
        }}
      />
    );
  }

  const quizQuestions = getQuizQuestions(activeQuiz);
  const activeQuestion = quizQuestions[activeQuestionIndex];
  const submittedAnswer = submittedAnswers[activeQuestion.id];
  const draftAnswer = draftAnswers[activeQuestion.id] ?? [];
  const answeredCount = Object.keys(submittedAnswers).length;
  const correctCount = quizQuestions.reduce((count, question) => {
    return isQuizAnswerCorrect(question, submittedAnswers[question.id])
      ? count + 1
      : count;
  }, 0);
  const scorePercent =
    answeredCount > 0
      ? Math.round((correctCount / answeredCount) * 100)
      : 0;
  const completionPercent = Math.round(
    (answeredCount / quizQuestions.length) * 100,
  );
  const isAnswered = submittedAnswer !== undefined;
  const isComplete = answeredCount === quizQuestions.length;
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
      setSubmittedAnswers((currentAnswers) => ({
        ...currentAnswers,
        [activeQuestion.id]: [answerIndex],
      }));
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

    setSubmittedAnswers((currentAnswers) => {
      if (currentAnswers[activeQuestion.id] !== undefined) {
        return currentAnswers;
      }

      return {
        ...currentAnswers,
        [activeQuestion.id]: draftAnswer,
      };
    });
  }

  function goToQuestion(questionIndex: number) {
    setActiveQuestionIndex(questionIndex);
  }

  function goToNextQuestion() {
    setActiveQuestionIndex((currentIndex) =>
      Math.min(quizQuestions.length - 1, currentIndex + 1),
    );
  }

  function resetQuiz() {
    setDraftAnswers({});
    setSubmittedAnswers({});
    setActiveQuestionIndex(0);
  }

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-subtle bg-content p-6 text-app sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-on-action/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-app/60">
              {activeQuiz.title}
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Test rapid cu feedback AI pe loc.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-app/70">
              Răspunzi, primești explicația, iar Revizzio marchează automat
              conceptele care trebuie revizuite.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <QuizHeroMetric label="Scor live" value={`${scorePercent}%`} />
            <QuizHeroMetric
              label="Întrebări"
              value={`${answeredCount}/${quizQuestions.length}`}
            />
            <QuizHeroMetric label="Timp estimat" value={activeQuiz.duration} />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setActiveQuizId(null)}
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
        </aside>
      </div>

      {isComplete ? (
        <section className="rounded-[2rem] border border-success-border bg-success-soft p-5 text-success sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Sumar final
              </p>
              <h3 className="mt-3 font-serif text-3xl font-semibold text-content">
                Ai obținut {correctCount}/{quizQuestions.length} răspunsuri corecte.
              </h3>
              <p className="mt-3 text-sm leading-7">
                Pregătirea estimată crește cu {correctCount >= 3 ? "6" : "3"}%.
                Revizzio ar transforma automat greșelile în flashcard-uri de
                recapitulare.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuizResultCard label="Scor quiz" value={`${scorePercent}%`} />
              <QuizResultCard
                label="Flashcard-uri sugerate"
                value={String(Math.max(1, weakConcepts.length))}
              />
              <QuizResultCard label="Timp recomandat" value="9 min" />
              <button
                type="button"
                onClick={resetQuiz}
                className="rounded-2xl bg-content px-4 py-4 text-sm font-bold text-app transition hover:opacity-90"
              >
                Reia quiz-ul
              </button>
            </div>
          </div>
        </section>
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
  const totalQuestions = quizzes.reduce(
    (count, quiz) => count + quiz.questionIds.length,
    0,
  );

  return (
    <section className="space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-subtle bg-content p-6 text-app sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-on-action/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-app/60">
              Biblioteca de quiz-uri
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Alege nivelul potrivit înainte să intri în test.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-app/70">
              Ai quiz-uri scurte, quiz-uri avansate, single choice și multiple
              choice. Începi cu ce ai nevoie azi.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <QuizHeroMetric label="Quiz-uri" value={String(quizzes.length)} />
            <QuizHeroMetric label="Întrebări" value={String(totalQuestions)} />
            <QuizHeroMetric label="Moduri" value="3" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
  return (
    <article
      className={`relative overflow-hidden rounded-[2rem] border bg-surface p-5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/10 ${
        quiz.recommended ? "border-action" : "border-subtle"
      }`}
    >
      {quiz.recommended ? (
        <span className="absolute right-5 top-5 rounded-full bg-content px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-app">
          Recomandat
        </span>
      ) : null}

      <span
        className={`inline-flex rounded-full border px-3 py-1.5 text-[11px] font-bold ${getQuizComplexityClass(
          quiz.complexity,
        )}`}
      >
        Complexitate {quiz.complexity.toLowerCase()}
      </span>

      <h3 className="mt-5 font-serif text-2xl font-semibold leading-tight">
        {quiz.title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-muted">{quiz.description}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <QuizCardStat label="Întrebări" value={String(quiz.questionIds.length)} />
        <QuizCardStat label="Durată" value={quiz.duration} />
        <QuizCardStat label="Tip" value={quiz.mode} />
        <QuizCardStat label="Focus" value={quiz.focus} />
      </div>

      <button
        type="button"
        onClick={() => onStartQuiz(quiz.id)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90"
      >
        Intră în quiz
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

function QuizHeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-app/10 bg-app/10 p-4">
      <p className="font-serif text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs leading-5 text-app/65">{label}</p>
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
          <StrategyCard
            key={strategy.title}
            title={strategy.title}
            description={strategy.description}
          />
        ))}
      </div>

      <SectionLabel>Valabile pentru orice materie</SectionLabel>
      <div className="mt-3 rounded-2xl border border-subtle bg-surface px-4">
        {universalStrategies.map(([title, description], index) => (
          <div
            key={title}
            className="flex gap-3 border-t border-subtle py-4 first:border-t-0"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-app text-xs font-bold">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-bold">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {description}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StrategyCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-subtle bg-surface p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
        <Icon>
          <circle cx="12" cy="12" r="10" />
          <path d="m16.2 7.8-2 6.4-6.4 2 2-6.4z" />
        </Icon>
      </span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
    </div>
  );
}

function ProgressPanel({ project }: { project: StudyProject }) {
  const readinessScore = Math.min(94, Math.max(48, project.progress + 8));
  const passChance = Math.min(96, readinessScore + 9);
  const gradeOverEightChance = Math.max(38, readinessScore - 21);
  const gradeOverNineChance = Math.max(16, readinessScore - 50);
  const examEstimate = Math.min(96, readinessScore + 20);
  const currentPaceEstimate = Math.max(58, readinessScore - 1);

  const chapterMastery = [
    ["Celula", 92],
    ["Membrană celulară", 84],
    ["ADN", 58],
    ["Respirație celulară", 43],
  ] as const;

  const gamifiedStats = [
    ["1.247", "întrebări rezolvate"],
    ["83%", "răspunsuri corecte"],
    ["18", "zile consecutive"],
    ["47", "flashcard-uri stăpânite"],
    ["12", "concepte în risc"],
  ] as const;

  const weeklyProgress = [
    ["S1", 42],
    ["S2", 57],
    ["S3", 68],
    ["S4", 79],
  ] as const;

  const retentionScores = [
    ["Memorare inițială", 91],
    ["Retenție după 7 zile", 73],
    ["Retenție după 30 zile", 61],
  ] as const;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[2rem] border border-subtle bg-content p-6 text-app sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-on-action/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-app/60">
              Pregătirea ta actuală
            </p>
            <h2 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Șanse de promovare: {passChance}%
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-app/70">
              Revizzio combină quiz-urile, flashcard-urile stăpânite, timpul de
              studiu și consistența pentru a estima cât de pregătit ești.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ProgressHeroMetric label="Pregătire generală" value={`${readinessScore}%`} />
            <ProgressHeroMetric label="Concepte cu risc" value="3" />
            <ProgressHeroMetric label="Timp recomandat azi" value="17 min" />
            <ProgressHeroMetric label="Flashcard-uri stăpânite" value="47" />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                Scor de pregătire
              </p>
              <h3 className="mt-2 font-serif text-3xl font-semibold">
                Examen: {readinessScore}%
              </h3>
            </div>
            <span className="w-fit rounded-full border border-success-border bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
              +3% / zi
            </span>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-app">
            <div
              className="h-full rounded-full bg-success"
              style={{ width: `${readinessScore}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ProgressProbabilityCard
              label="Promovare"
              value={passChance}
              tone="success"
            />
            <ProgressProbabilityCard
              label="Notă peste 8"
              value={gradeOverEightChance}
              tone="info"
            />
            <ProgressProbabilityCard
              label="Notă peste 9"
              value={gradeOverNineChance}
              tone="warning"
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-warning-border bg-warning-soft p-5 text-warning sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em]">
            Zone care necesită atenție
          </p>
          <h3 className="mt-3 font-serif text-3xl font-semibold text-content">
            AI-ul a găsit 3 blocaje recurente.
          </h3>
          <p className="mt-3 text-sm leading-7">
            Din ultimele 3 quiz-uri observăm că greșești frecvent întrebările
            despre:
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Mitocondrie", "Transport celular", "ADN vs ARN"].map((concept) => (
              <span
                key={concept}
                className="rounded-full border border-warning-border bg-surface px-3 py-1.5 text-xs font-bold"
              >
                {concept}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-bold text-app transition hover:opacity-90"
          >
            Revizuiește acum
            <span className="rounded-full bg-app/15 px-2 py-0.5 text-[11px]">
              5 min
            </span>
          </button>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Heatmap pe capitole
          </p>
          <div className="mt-5 space-y-4">
            {chapterMastery.map(([chapter, value]) => (
              <ProgressBarRow key={chapter} label={chapter} value={value} />
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-info-border bg-info-soft p-5 text-info sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-info/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Recomandarea AI pentru azi
            </p>
            <h3 className="mt-3 font-serif text-3xl font-semibold text-content">
              Revizuiește Respirație celulară.
            </h3>
            <p className="mt-4 text-sm leading-7">
              Șansele de retenție sunt maxime dacă revizuiești acum capitolul.
              Ultima interacțiune a fost acum 4 zile, iar rata de răspuns corect
              este doar 48%.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <ProgressMiniStat label="Corectitudine" value="48%" />
              <ProgressMiniStat label="Ultima sesiune" value="4 zile" />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Predicție până la examen
            </p>
            <h3 className="mt-3 font-serif text-3xl font-semibold">
              Examen peste 12 zile
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              La ritmul actual vei ajunge la {currentPaceEstimate}% pregătire.
              Recomandăm încă 18 minute pe zi pentru o pregătire estimată de{" "}
              {examEstimate}%.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
            <ProgressMiniStat label="Material parcurs" value={`${project.progress}%`} />
            <ProgressMiniStat label="Ritm actual" value="+3% / zi" />
            <ProgressMiniStat label="Estimare examen" value={`${examEstimate}%`} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Statistici gamificate
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {gamifiedStats.map(([value, label]) => (
              <div
                key={label}
                className="rounded-2xl border border-subtle bg-app p-4"
              >
                <p className="font-serif text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Evoluție în timp
          </p>
          <div className="mt-5 flex h-56 items-end gap-4 rounded-3xl border border-subtle bg-app p-4">
            {weeklyProgress.map(([week, value]) => (
              <div key={week} className="flex h-full flex-1 flex-col justify-end">
                <div
                  className="rounded-t-2xl bg-content transition"
                  style={{ height: `${value}%` }}
                />
                <div className="mt-3 text-center">
                  <p className="text-xs font-bold">{week}</p>
                  <p className="text-[11px] text-muted">{value}%</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Retention Score
            </p>
            <h3 className="mt-3 font-serif text-3xl font-semibold">
              5 concepte riscă să fie uitate în 48h.
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Retenția scade natural după prima sesiune. Revizzio prioritizează
              automat conceptele care merită revizuite înainte să dispară din
              memorie.
            </p>
          </div>
          <div className="space-y-4">
            {retentionScores.map(([label, value]) => (
              <ProgressBarRow key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      </section>
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

function ProgressProbabilityCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "info" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-success-border bg-success-soft text-success"
      : tone === "info"
        ? "border-info-border bg-info-soft text-info"
        : "border-warning-border bg-warning-soft text-warning";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="font-serif text-3xl font-semibold">{value}%</p>
      <p className="mt-1 text-xs font-bold">{label}</p>
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
  files,
  canGenerate,
  hasMaterialRights,
  generationState,
  generationProgress,
  completedSteps,
  isDragging,
  fileInputRef,
  onBack,
  onProjectNameChange,
  onMaterialRightsChange,
  onAddFiles,
  onRemoveFile,
  onDrop,
  onDragStateChange,
  onStartGeneration,
  onOpenGeneratedProject,
}: {
  projectName: string;
  files: UploadedFile[];
  canGenerate: boolean;
  hasMaterialRights: boolean;
  generationState: GenerationState;
  generationProgress: number;
  completedSteps: string[];
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onProjectNameChange: (value: string) => void;
  onMaterialRightsChange: (value: boolean) => void;
  onAddFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
  onDragStateChange: (isDragging: boolean) => void;
  onStartGeneration: () => void;
  onOpenGeneratedProject: () => void;
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted"
      >
        <Icon>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </Icon>
        Proiectele tale
      </button>

      {generationState === "form" ? (
        <>
          <h1 className="font-serif text-2xl font-semibold">Proiect nou</h1>
          <p className="mt-1 text-sm text-muted">
            Încarcă materialele, iar Revizzio pregătește pachetul de studiu.
          </p>

          <label className="mt-5 block text-xs font-bold">
            Numele proiectului
            <input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              type="text"
              placeholder="Ex: Biologie celulară"
              className="mt-2 h-12 w-full rounded-2xl border border-subtle bg-surface px-4 text-[15px] outline-none transition focus:border-success"
            />
          </label>

          <label className="mt-5 block text-xs font-bold">
            Materiale de curs
            <div className="mt-2 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-xs font-semibold leading-5 text-warning">
              Nu încărca parole, date bancare, informații medicale, documente
              confidențiale sau date personale ale altor persoane fără un temei
              legal.
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
              className={`mt-2 flex w-full flex-col items-center rounded-2xl border border-dashed p-7 text-center transition ${
                isDragging
                  ? "border-success bg-success-soft"
                  : "border-subtle bg-surface hover:bg-surface-hover"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app">
                <Icon>
                  <path d="M12 16V4M7 9l5-5 5 5" />
                  <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
                </Icon>
              </span>
              <span className="mt-3 text-sm font-semibold">
                Trage fișierele aici sau atinge pentru a alege
              </span>
              <span className="mt-1 text-xs font-normal text-muted">
                PDF, PPT, DOCX · max 50MB / fișier
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              className="hidden"
              onChange={(event) => onAddFiles(event.target.files)}
            />
          </label>

          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-subtle bg-surface p-4 text-xs leading-5 text-muted">
            <input
              type="checkbox"
              checked={hasMaterialRights}
              onChange={(event) => onMaterialRightsChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-action"
            />
            Confirm că am dreptul să folosesc și să încarc acest material.
          </label>

          {files.length > 0 ? (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-app">
                    <BookIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted">
                      {formatBytes(file.size)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-hover"
                    aria-label="Elimină fișierul"
                  >
                    <Icon>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </Icon>
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <SectionLabel>Ce generează AI</SectionLabel>
          <GeneratedContentDisclaimer className="mt-3" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {[
              ["Rezumat", "Esența cursului, gata de citit rapid"],
              ["Flashcard-uri", "Carduri de recapitulare pe concepte"],
              ["Quiz-uri", "Întrebări cu feedback"],
              ["Cuvinte cheie", "Termeni esențiali definiți clar"],
            ].map(([title, description]) => (
              <GenerationCard
                key={title}
                title={title}
                description={description}
              />
            ))}
            <div className="col-span-2">
              <GenerationCard
                title="Strategii de învățare"
                description="Recomandări personalizate în funcție de material și progres"
              />
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-6 border-t border-subtle bg-app p-4">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={onStartGeneration}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-content px-5 py-4 text-sm font-semibold text-app transition disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted"
            >
              Generează proiectul
              <Icon>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </Icon>
            </button>
          </div>
        </>
      ) : (
        <GenerationView
          projectName={projectName}
          state={generationState}
          progress={generationProgress}
          completedSteps={completedSteps}
          onOpenGeneratedProject={onOpenGeneratedProject}
        />
      )}
    </section>
  );
}

function GenerationCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface p-4">
      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-success-soft text-success">
        <Icon>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </Icon>
      </span>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}

function GenerationView({
  projectName,
  state,
  progress,
  completedSteps,
  onOpenGeneratedProject,
}: {
  projectName: string;
  state: GenerationState;
  progress: number;
  completedSteps: string[];
  onOpenGeneratedProject: () => void;
}) {
  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold">
        {state === "done" ? "Proiectul tău e gata" : "Se generează"}
        <span className="text-muted"> - {projectName}</span>
      </h1>
      <p className="mt-1 text-sm text-muted">
        {state === "done"
          ? "Pachetul este pregătit pentru studiu."
          : "Durează de obicei sub un minut."}
      </p>

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
          <p className="mt-4 text-sm text-muted">
            Proiectul{" "}
            <span className="font-semibold text-content">{projectName}</span>{" "}
            e gata de studiat.
          </p>
          <div className="my-5 grid grid-cols-4 gap-3 text-center">
            {[
              ["6 min", "Rezumat"],
              ["24", "Flashcard-uri"],
              ["3", "Quiz-uri"],
              ["18", "Concepte"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="font-serif text-xl font-semibold">{value}</p>
                <p className="text-[11px] text-muted">{label}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={onOpenGeneratedProject}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-content px-5 py-3 text-sm font-semibold text-app"
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
