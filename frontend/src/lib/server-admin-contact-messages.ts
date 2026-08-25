import "server-only";

import { cookies, headers } from "next/headers";
import {
  contactMessagesQuery,
  type AdminContactMessage,
  type ContactMessageFilters,
} from "@/lib/admin-contact-messages-api";

export async function getServerAdminContactMessages(
  filters: ContactMessageFilters = {},
): Promise<AdminContactMessage[] | null> {
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
      `${apiUrl}/api/admin/contact-messages/${contactMessagesQuery(filters)}`,
      {
        method: "GET",
        headers: requestHeaders,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as AdminContactMessage[];
  } catch {
    return null;
  }
}
