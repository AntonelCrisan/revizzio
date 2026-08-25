export type WithdrawalEmailStatus = "queued" | "sent" | "failed" | string;

export type AdminWithdrawalRequest = {
  id: string;
  registration_number: string;
  full_name: string;
  email: string;
  subscription_or_order: string;
  order_number: string | null;
  reason: string | null;
  confirmation: boolean;
  email_confirmation_status: WithdrawalEmailStatus;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AdminWithdrawalRequestsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminWithdrawalRequestsApiError";
  }
}

export type WithdrawalRequestFilters = {
  email_status?: string;
  search?: string;
  limit?: number;
};

export function withdrawalRequestsQuery(
  filters: WithdrawalRequestFilters = {},
) {
  const params = new URLSearchParams();

  if (filters.email_status?.trim()) {
    params.set("email_status", filters.email_status.trim());
  }
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getAdminWithdrawalRequests(
  filters: WithdrawalRequestFilters = {},
): Promise<AdminWithdrawalRequest[]> {
  const response = await fetch(
    `/api/admin/withdrawal-requests${withdrawalRequestsQuery(filters)}`,
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
    throw new AdminWithdrawalRequestsApiError(
      payload.detail || "Cererile de retragere nu au putut fi încărcate.",
      response.status,
    );
  }

  return (await response.json()) as AdminWithdrawalRequest[];
}
