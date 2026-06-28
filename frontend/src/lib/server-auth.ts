import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth-api";

async function getServerAuthUser(): Promise<AuthUser | null> {
  const apiUrl = process.env.API_URL;

  if (!apiUrl) {
    return null;
  }

  const cookieHeader = (await cookies()).toString();
  const userAgent = (await headers()).get("user-agent");
  const requestHeaders = new Headers();

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }

  try {
    const response = await fetch(`${apiUrl}/api/auth/me`, {
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

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await getServerAuthUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/myaccount");
  }

  return user;
}
