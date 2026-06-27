export type ThemePreference = "light" | "dark" | "system";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  theme_preference: ThemePreference;
};

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string }>;
};

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

function extractErrorMessage(payload: ApiErrorPayload): string {
  if (typeof payload.detail === "string") {
    return payload.detail;
  }

  if (Array.isArray(payload.detail)) {
    const firstMessage = payload.detail.find((item) => item.msg)?.msg;
    if (firstMessage) return firstMessage;
  }

  return "A apărut o eroare. Te rugăm să încerci din nou.";
}

async function authRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/auth/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
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
    throw new AuthApiError(extractErrorMessage(payload), response.status);
  }

  return (await response.json()) as T;
}

export function getCurrentUser(): Promise<AuthUser> {
  return authRequest<AuthUser>("me");
}

export function login(payload: {
  email: string;
  password: string;
  remember: boolean;
}): Promise<AuthUser> {
  return authRequest<AuthUser>("login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function register(payload: {
  full_name: string;
  email: string;
  password: string;
  accepted_terms: boolean;
  newsletter_consent: boolean;
}): Promise<AuthUser> {
  return authRequest<AuthUser>("register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout(): Promise<{ message: string }> {
  return authRequest<{ message: string }>("logout", {
    method: "POST",
    body: "{}",
  });
}

export function updateThemePreference(
  themePreference: ThemePreference,
): Promise<AuthUser> {
  return authRequest<AuthUser>("me/preferences", {
    method: "PATCH",
    body: JSON.stringify({ theme_preference: themePreference }),
  });
}
