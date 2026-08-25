export type ContentReportType =
  | "drepturi_autor"
  | "date_personale"
  | "continut_incorect"
  | "altul";

export type AdminContentReport = {
  id: string;
  registration_number: string;
  name: string;
  email: string;
  report_type: ContentReportType;
  content_reference: string;
  description: string;
  rights_evidence: string | null;
  declaration: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  attachments: AdminContentReportAttachment[];
};

export type AdminContentReportAttachment = {
  id: string;
  original_filename: string;
  content_type: string | null;
  size_bytes: number;
  created_at: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AdminContentReportsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminContentReportsApiError";
  }
}

export type ContentReportFilters = {
  report_type?: ContentReportType | "";
  search?: string;
  limit?: number;
};

export function contentReportsQuery(filters: ContentReportFilters = {}) {
  const params = new URLSearchParams();

  if (filters.report_type) params.set("report_type", filters.report_type);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getAdminContentReports(
  filters: ContentReportFilters = {},
): Promise<AdminContentReport[]> {
  const response = await fetch(
    `/api/admin/content-reports${contentReportsQuery(filters)}`,
    {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new AdminContentReportsApiError(
      payload.detail || "Raportările de conținut nu au putut fi încărcate.",
      response.status,
    );
  }

  return (await response.json()) as AdminContentReport[];
}
