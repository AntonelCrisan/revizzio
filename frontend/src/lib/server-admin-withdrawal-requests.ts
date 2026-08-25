import "server-only";

import { cookies, headers } from "next/headers";
import {
  type AdminWithdrawalRequest,
  type WithdrawalRequestFilters,
  withdrawalRequestsQuery,
} from "@/lib/admin-withdrawal-requests-api";

export async function getServerAdminWithdrawalRequests(
  filters: WithdrawalRequestFilters = {},
): Promise<AdminWithdrawalRequest[] | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return null;
  }

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

  try {
    const response = await fetch(
      `${apiUrl}/api/admin/withdrawal-requests/${withdrawalRequestsQuery(
        filters,
      )}`,
      {
        method: "GET",
        headers: requestHeaders,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AdminWithdrawalRequest[];
  } catch {
    return null;
  }
}
