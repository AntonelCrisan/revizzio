"use client";

import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/account/notification-bell";
import { useAuth } from "@/components/auth/auth-provider";

// The home page renders its own MarketingHeader, which embeds a
// NotificationBell in-flow next to its own nav buttons/menu toggle — this
// fixed overlay would just sit on top of that header's buttons instead.
const PATHS_WITH_OWN_BELL = new Set(["/"]);

export function GlobalNotificationBell() {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading || !user || PATHS_WITH_OWN_BELL.has(pathname)) return null;

  return (
    <div className="fixed right-4 top-4 z-[100]">
      <NotificationBell />
    </div>
  );
}
