export type ContactMessageCategory =
  | "suport"
  | "facturare"
  | "confidentialitate"
  | "raportare_continut";

export type AdminContactMessage = {
  id: string;
  reference: string;
  name: string;
  email: string;
  category: ContactMessageCategory;
  subject: string;
  message: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type ApiErrorPayload = {
  detail?: string;
};

export class AdminContactMessagesApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminContactMessagesApiError";
  }
}

export type ContactMessageFilters = {
  category?: ContactMessageCategory | "";
  search?: string;
  limit?: number;
};

export function contactMessagesQuery(filters: ContactMessageFilters = {}) {
  const params = new URLSearchParams();

  if (filters.category) params.set("category", filters.category);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getAdminContactMessages(
  filters: ContactMessageFilters = {},
): Promise<AdminContactMessage[]> {
  const response = await fetch(
    `/api/admin/contact-messages${contactMessagesQuery(filters)}`,
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
    throw new AdminContactMessagesApiError(
      payload.detail || "Mesajele de contact nu au putut fi încărcate.",
      response.status,
    );
  }

  return (await response.json()) as AdminContactMessage[];
}
