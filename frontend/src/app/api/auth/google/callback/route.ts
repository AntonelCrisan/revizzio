import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const STATE_COOKIE = "google_oauth_state";
const NEXT_COOKIE = "google_oauth_next";

function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/myaccount";
  }

  if (value.startsWith("/api/")) {
    return "/myaccount";
  }

  return value;
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const failureUrl = new URL("/login?error=google_oauth", url.origin);

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const nextPath = safeNextPath(cookieStore.get(NEXT_COOKIE)?.value);

  function redirectAndClear(target: URL): Response {
    const response = NextResponse.redirect(target);
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(NEXT_COOKIE);
    return response;
  }

  if (!code || !state || !storedState || state !== storedState) {
    return redirectAndClear(failureUrl);
  }

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return redirectAndClear(failureUrl);
  }

  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${apiUrl}/api/auth/google/callback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
  } catch {
    return redirectAndClear(failureUrl);
  }

  if (!backendResponse.ok) {
    return redirectAndClear(failureUrl);
  }

  const response = redirectAndClear(new URL(nextPath, url.origin));
  for (const setCookie of backendResponse.headers.getSetCookie()) {
    response.headers.append("set-cookie", setCookie);
  }

  return response;
}
