"use client";

import { NotificationBell } from "@/components/account/notification-bell";
import { useRegisterAccountTopBar } from "@/components/account/account-topbar-presence";

/**
 * The phone header for the account pages.
 *
 * The menu toggle and the notification bell used to be two separate floating
 * cards pinned to opposite corners, drifting over whatever was underneath.
 * They now sit in one bar that spans the page and stays at the top while it
 * scrolls. Hidden from `lg` up, where the sidebar is always visible and the
 * bell floats in the corner.
 */
export function AccountMobileTopBar({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  useRegisterAccountTopBar();

  return (
    <header
      data-account-topbar=""
      // Below the drawer backdrop on purpose: when the menu is open the
      // overlay has to darken this bar and its bell too, instead of them
      // staying lit above it.
      className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-subtle bg-surface/95 px-3 py-2.5 backdrop-blur-xl lg:hidden"
    >
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-subtle bg-surface text-content transition hover:bg-surface-hover"
        aria-label="Deschide meniul"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <NotificationBell />
    </header>
  );
}
