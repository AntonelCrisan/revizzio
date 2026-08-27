export type AccountDeletionRequestStatus =
  | "pending"
  | "completed"
  | "cancelled";

export type AdminAccountDeletionRequest = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  status: AccountDeletionRequestStatus;
  resolved_by_user_id: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AdminAccountDeletionRequestsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminAccountDeletionRequestsApiError";
  }
}

export type AccountDeletionRequestFilters = {
  request_status?: AccountDeletionRequestStatus | "";
  search?: string;
  limit?: number;
};

export function accountDeletionRequestsQuery(
  filters: AccountDeletionRequestFilters = {},
) {
  const params = new URLSearchParams();

  if (filters.request_status?.trim()) {
    params.set("request_status", filters.request_status.trim());
  }
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

async function adminAccountDeletionRequestsRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
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
    throw new AdminAccountDeletionRequestsApiError(
      payload.detail || "Solicitările de ștergere nu au putut fi încărcate.",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getAdminAccountDeletionRequests(
  filters: AccountDeletionRequestFilters = {},
): Promise<AdminAccountDeletionRequest[]> {
  return adminAccountDeletionRequestsRequest<AdminAccountDeletionRequest[]>(
    `account-deletion-requests${accountDeletionRequestsQuery(filters)}`,
  );
}

export function deleteAccountFromDeletionRequest(
  requestId: string,
): Promise<AdminAccountDeletionRequest> {
  return adminAccountDeletionRequestsRequest<AdminAccountDeletionRequest>(
    `account-deletion-requests/${requestId}/user`,
    { method: "DELETE" },
  );
}
