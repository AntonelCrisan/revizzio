export type StudyProjectFile = {
  id: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  markdown_char_count: number;
  conversion_status: string;
  conversion_error: string | null;
  created_at: string;
};

export type StudyProjectSummary = {
  id: string;
  content: string;
  estimated_reading_minutes: number | null;
};

export type StudyProjectKeyword = {
  id: string;
  term: string;
  explanation: string;
  anchor_text: string | null;
  sort_order: number;
};

export type StudyProjectFlashcard = {
  id: string;
  front: string;
  front_image: string | null;
  back: string;
  category: string | null;
  difficulty: string | null;
  source_type: string;
  source_quiz_question_id: string | null;
  sort_order: number;
};

export type StudyProjectQuizOption = {
  id: string;
  label: string;
  is_correct: boolean;
  sort_order: number;
};

export type StudyProjectQuizQuestion = {
  id: string;
  prompt: string;
  question_type: string;
  explanation: string | null;
  sort_order: number;
  options: StudyProjectQuizOption[];
};

export type StudyProjectQuiz = {
  id: string;
  title: string;
  description: string | null;
  complexity: string | null;
  question_type: string | null;
  sort_order: number;
  questions: StudyProjectQuizQuestion[];
};

export type StudyProjectStrategy = {
  id: string;
  title: string;
  description: string;
  sort_order: number;
};

export type StudyProject = {
  id: string;
  name: string;
  subject_name: string;
  institution_name: string;
  slug: string;
  status: "processing" | "awaiting_ai_json" | "ready" | "failed" | string;
  material_rights_confirmed: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  archived_at: string | null;
  file_count: number;
  summary_count: number;
  keyword_count: number;
  flashcard_count: number;
  quiz_count: number;
  strategy_count: number;
  markdown_download_url: string | null;
  prompt_download_url: string | null;
  files: StudyProjectFile[];
  summary: StudyProjectSummary | null;
  keywords: StudyProjectKeyword[];
  flashcards: StudyProjectFlashcard[];
  quizzes: StudyProjectQuiz[];
  strategies: StudyProjectStrategy[];
};

export type StudyProjectPrepareResponse = {
  project: StudyProject;
  markdown_download_url: string;
  prompt_download_url: string;
  next_step: string;
};

export type StudyProjectImportResponse = {
  project: StudyProject;
  imported: boolean;
  message: string;
};

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string }>;
};

export class ProjectsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProjectsApiError";
  }
}

function extractErrorMessage(payload: ApiErrorPayload): string {
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail)) {
    const firstMessage = payload.detail.find((item) => item.msg)?.msg;
    if (firstMessage) return firstMessage;
  }
  return "A apărut o eroare la proiect. Te rugăm să încerci din nou.";
}

async function parseProjectResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Non-JSON upstream errors are handled by the fallback.
    }
    throw new ProjectsApiError(extractErrorMessage(payload), response.status);
  }

  return (await response.json()) as T;
}

export async function listStudyProjects(): Promise<StudyProject[]> {
  const response = await fetch("/api/projects", {
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject[]>(response);
}

export async function listArchivedStudyProjects(): Promise<StudyProject[]> {
  const response = await fetch("/api/projects/archived", {
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject[]>(response);
}

export async function renameStudyProject(payload: {
  projectId: string;
  name: string;
}): Promise<StudyProject> {
  const response = await fetch(`/api/projects/${payload.projectId}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: payload.name }),
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject>(response);
}

export async function archiveStudyProject(projectId: string): Promise<StudyProject> {
  const response = await fetch(`/api/projects/${projectId}/archive`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject>(response);
}

export async function restoreStudyProject(projectId: string): Promise<StudyProject> {
  const response = await fetch(`/api/projects/${projectId}/restore`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject>(response);
}

export async function deleteStudyProject(projectId: string): Promise<void> {
  const response = await fetch(`/api/projects/${projectId}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return;
    }

    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // Non-JSON upstream errors are handled by the fallback.
    }
    throw new ProjectsApiError(extractErrorMessage(payload), response.status);
  }
}

export async function prepareStudyProject(payload: {
  name: string;
  subjectName: string;
  institutionName: string;
  files: File[];
  materialRightsConfirmed: boolean;
}): Promise<StudyProjectPrepareResponse> {
  const formData = new FormData();
  formData.set("name", payload.name);
  formData.set("subject_name", payload.subjectName);
  formData.set("institution_name", payload.institutionName);
  formData.set(
    "material_rights_confirmed",
    String(payload.materialRightsConfirmed),
  );
  for (const file of payload.files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/projects/prepare", {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    cache: "no-store",
  });
  return parseProjectResponse<StudyProjectPrepareResponse>(response);
}

export async function importStudyProjectJson(payload: {
  projectId: string;
  file: File;
}): Promise<StudyProjectImportResponse> {
  const formData = new FormData();
  formData.set("file", payload.file);

  const response = await fetch(`/api/projects/${payload.projectId}/import-json`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    cache: "no-store",
  });
  return parseProjectResponse<StudyProjectImportResponse>(response);
}

export async function createQuizMistakeFlashcard(payload: {
  projectId: string;
  questionId: string;
}): Promise<StudyProject> {
  const response = await fetch(
    `/api/projects/${payload.projectId}/quiz-mistake-flashcards`,
    {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question_id: payload.questionId,
      }),
      cache: "no-store",
    },
  );
  return parseProjectResponse<StudyProject>(response);
}

export async function createManualStudyProjectFlashcard(payload: {
  projectId: string;
  front: string;
  back: string;
  category?: string;
  difficulty?: string;
  frontImage?: File;
}): Promise<StudyProject> {
  const formData = new FormData();
  formData.set("front", payload.front);
  formData.set("back", payload.back);
  if (payload.category?.trim()) {
    formData.set("category", payload.category.trim());
  }
  if (payload.difficulty?.trim()) {
    formData.set("difficulty", payload.difficulty.trim());
  }
  if (payload.frontImage) {
    formData.set("front_image", payload.frontImage);
  }

  const response = await fetch(`/api/projects/${payload.projectId}/flashcards`, {
    method: "POST",
    credentials: "same-origin",
    body: formData,
    cache: "no-store",
  });
  return parseProjectResponse<StudyProject>(response);
}
