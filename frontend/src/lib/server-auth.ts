import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth-api";

function sameOriginApiUrl(requestHeaders: Headers) {
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) {
    return null;
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

async function fetchAuthUser(
  url: string,
  requestHeaders: Headers,
): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${url}/api/auth/me`, {
      method: "GET",
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuthUser;
  } catch {
    return null;
  }
}

async function getServerAuthUser(): Promise<AuthUser | null> {
  const requestHeadersFromNext = await headers();
  const cookieHeader =
    requestHeadersFromNext.get("cookie") ?? (await cookies()).toString();
  const userAgent = requestHeadersFromNext.get("user-agent");
  const requestHeaders = new Headers();

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }

  const apiUrl = process.env.API_URL;
  if (apiUrl) {
    const backendUser = await fetchAuthUser(apiUrl, requestHeaders);
    if (backendUser) {
      return backendUser;
    }
  }

  const frontendUrl = sameOriginApiUrl(requestHeadersFromNext);
  if (frontendUrl) {
    return fetchAuthUser(frontendUrl, requestHeaders);
  }

  return null;
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login?next=/admin/settings");
  }

  if (user.role.trim().toLowerCase() !== "admin") {
    redirect("/myaccount");
  }

  return user;
}
