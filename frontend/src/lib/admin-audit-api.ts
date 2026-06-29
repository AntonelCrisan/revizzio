export type AuditLogStatus = "success" | "failure";

export type AuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  status: AuditLogStatus;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AdminAuditApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminAuditApiError";
  }
}

type AuditLogFilters = {
  action?: string;
  actor?: string;
  status?: AuditLogStatus | "";
  limit?: number;
};

function auditQuery(filters: AuditLogFilters = {}) {
  const params = new URLSearchParams();

  if (filters.action) params.set("action", filters.action);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getAdminAuditLogs(
  filters: AuditLogFilters = {},
): Promise<AuditLog[]> {
  const response = await fetch(`/api/admin/audit-logs${auditQuery(filters)}`, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new AdminAuditApiError(
      payload.detail || "Jurnalul de activitate nu a putut fi încărcat.",
      response.status,
    );
  }

  return (await response.json()) as AuditLog[];
}
