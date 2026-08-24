export type AdminUserSessionStatus = "activă" | "expirată" | "revocată";

export type AdminUserSession = {
  id: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  status: AdminUserSessionStatus;
  user_agent: string | null;
  ip_address: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
  terms_accepted_at: string;
  terms_version: string;
  newsletter_consent: boolean;
  newsletter_consent_at: string | null;
  theme_preference: "light" | "dark" | "system";
  total_sessions: number;
  active_sessions: number;
  last_session_at: string | null;
  last_seen_at: string | null;
  sessions: AdminUserSession[];
};

type ApiErrorPayload = {
  detail?: string;
};

type AdminUsersRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

export class AdminUsersApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminUsersApiError";
  }
}

async function adminUsersRequest<T>(
  path: string,
  options: AdminUsersRequestOptions = {},
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new AdminUsersApiError(
      payload.detail || "Utilizatorii nu au putut fi încărcați.",
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getAdminUsers(): Promise<AdminUser[]> {
  return adminUsersRequest<AdminUser[]>("users");
}

export function updateAdminUser(
  userId: string,
  payload: Partial<Pick<AdminUser, "role" | "is_active">>,
): Promise<AdminUser> {
  return adminUsersRequest<AdminUser>(`users/${userId}`, {
    method: "PATCH",
    body: payload,
  });
}

export function sendAdminUserVerificationEmail(
  userId: string,
): Promise<AdminUser> {
  return adminUsersRequest<AdminUser>(`users/${userId}/verification-email`, {
    method: "POST",
  });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await adminUsersRequest<void>(`users/${userId}`, {
    method: "DELETE",
  });
}
