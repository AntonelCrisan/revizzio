import "server-only";

import { cookies, headers } from "next/headers";
import type { AdminUser } from "@/lib/admin-users-api";

export async function getServerAdminUsers(): Promise<AdminUser[] | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  const requestHeaders = new Headers();
  const cookieHeader = (await cookies()).toString();
  const userAgent = (await headers()).get("user-agent");

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }

  try {
    const response = await fetch(`${apiUrl}/api/admin/users/`, {
      method: "GET",
      headers: requestHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AdminUser[];
  } catch {
    return null;
  }
}

export async function getServerAdminUser(
  userId: string,
): Promise<AdminUser | null> {
  const users = await getServerAdminUsers();
  return users?.find((user) => user.id === userId) ?? null;
}
