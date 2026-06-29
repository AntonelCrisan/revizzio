import "server-only";

import { cookies, headers } from "next/headers";
import type { AuditLog, AuditLogStatus } from "@/lib/admin-audit-api";

type ServerAuditFilters = {
  action?: string;
  actor?: string;
  status?: AuditLogStatus;
  limit?: number;
};

function auditQuery(filters: ServerAuditFilters = {}) {
  const params = new URLSearchParams();

  if (filters.action) params.set("action", filters.action);
  if (filters.actor) params.set("actor", filters.actor);
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getServerAdminAuditLogs(
  filters: ServerAuditFilters = {},
): Promise<AuditLog[] | null> {
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
    const response = await fetch(
      `${apiUrl}/api/admin/audit-logs/${auditQuery(filters)}`,
      {
        method: "GET",
        headers: requestHeaders,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AuditLog[];
  } catch {
    return null;
  }
}
