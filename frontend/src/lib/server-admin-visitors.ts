import "server-only";

import { cookies, headers } from "next/headers";
import type { VisitorStats, VisitorVisit } from "@/lib/admin-audit-api";

async function serverAdminHeaders(): Promise<Headers> {
  const requestHeaders = new Headers();
  const requestHeadersFromNext = await headers();
  const cookieHeader =
    requestHeadersFromNext.get("cookie") ?? (await cookies()).toString();
  const userAgent = requestHeadersFromNext.get("user-agent");

  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  if (userAgent) {
    requestHeaders.set("user-agent", userAgent);
  }

  return requestHeaders;
}

export async function getServerAdminVisitorStats(): Promise<VisitorStats | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  try {
    const response = await fetch(`${apiUrl}/api/admin/visitor-stats`, {
      method: "GET",
      headers: await serverAdminHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as VisitorStats;
  } catch {
    return null;
  }
}

export async function getServerAdminVisitorVisits(
  filters: { limit?: number } = {},
): Promise<VisitorVisit[] | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

  const params = new URLSearchParams();
  if (filters.limit) params.set("limit", String(filters.limit));
  const query = params.toString();

  try {
    const response = await fetch(
      `${apiUrl}/api/admin/visitor-visits${query ? `?${query}` : ""}`,
      {
        method: "GET",
        headers: await serverAdminHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as VisitorVisit[];
  } catch {
    return null;
  }
}
