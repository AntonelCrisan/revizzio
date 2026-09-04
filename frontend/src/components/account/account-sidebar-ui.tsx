import type { ReactNode } from "react";

export const ACCOUNT_SIDEBAR_COLLAPSED_STORAGE_KEY =
  "revizzio-sidebar-collapsed";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function getAccountSidebarShellClass(
  isOpen: boolean,
  isCollapsed: boolean,
) {
  return cx(
    // `inset-y-0` already spans the viewport on mobile, so no height is
    // set there: `h-svh` is the small viewport height and stops matching
    // once the browser hides its URL bar mid-scroll. And the transition
    // names its properties, because `transition-all` animated that height
    // change and the bar visibly stretched while scrolling.
    "fixed inset-y-0 left-0 z-50 flex w-[min(84vw,272px)] flex-col overflow-hidden border-r border-subtle bg-sidebar text-content shadow-xl shadow-black/10 transition-[transform,width] duration-300 lg:sticky lg:top-0 lg:h-svh lg:flex-none lg:translate-x-0 lg:shadow-none",
    isOpen ? "translate-x-0" : "-translate-x-full",
    isCollapsed ? "lg:w-16" : "lg:w-[272px]",
  );
}

export function getAccountSidebarHeaderClass(isCollapsed: boolean) {
  return cx(
    "shrink-0 flex items-center justify-between px-4 py-4",
    isCollapsed && "lg:flex-col lg:items-center lg:justify-start lg:gap-2 lg:px-2",
  );
}

export function getAccountSidebarScrollClass(isCollapsed: boolean) {
  return cx(
    "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 [scrollbar-width:thin]",
    isCollapsed && "lg:px-2 lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden",
  );
}

export function getAccountSidebarActionClass(isCollapsed: boolean) {
  return cx(
    "group/sidebar-item relative mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-content px-3 text-sm font-semibold text-app shadow-sm shadow-black/10 transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/40",
    isCollapsed && "lg:mx-auto lg:w-10 lg:gap-0 lg:px-0",
  );
}

export function getAccountSidebarActionLabelClass(isCollapsed: boolean) {
  return cx(
    "whitespace-nowrap transition-[opacity,width] duration-200",
    isCollapsed && "lg:w-0 lg:overflow-hidden lg:opacity-0",
  );
}

export function getAccountSidebarItemClass(
  isActive: boolean,
  isCollapsed: boolean,
) {
  return cx(
    "group/sidebar-item relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold outline-none transition",
    isActive
      ? "bg-action-soft text-content shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]"
      : "text-content hover:bg-action-soft focus-visible:bg-action-soft",
    isCollapsed && "lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0",
  );
}

export function getAccountSidebarChildItemClass(isActive: boolean) {
  return cx(
    "flex items-center rounded-md px-2.5 py-1.5 text-sm transition",
    isActive
      ? "bg-action-soft font-semibold text-content"
      : "font-semibold text-muted hover:bg-action-soft hover:text-content",
  );
}

export function getAccountSidebarProjectClass(
  isActive: boolean,
  isCollapsed: boolean,
) {
  return cx(
    "group/sidebar-item relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left outline-none transition",
    isActive
      ? "bg-action-soft text-content"
      : "text-content hover:bg-action-soft focus-visible:bg-action-soft",
    isCollapsed && "lg:mx-auto lg:h-10 lg:w-10 lg:justify-center lg:gap-0 lg:px-0",
  );
}

export function getAccountSidebarLabelClass(isCollapsed: boolean) {
  return cx(
    "min-w-0 flex-1 whitespace-nowrap transition-[opacity,width] duration-200",
    isCollapsed && "lg:w-0 lg:flex-none lg:overflow-hidden lg:opacity-0",
  );
}

export function getAccountSidebarChevronClass(
  isOpen: boolean,
  isCollapsed: boolean,
) {
  return cx(
    "h-4 w-4 shrink-0 text-muted transition",
    isOpen && "rotate-90",
    isCollapsed && "lg:hidden",
  );
}

export function AccountSidebarTooltip({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  if (!enabled) {
    return null;
  }

  return (
    <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-[80] hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-subtle bg-content px-2.5 py-1.5 text-xs font-semibold text-app opacity-0 shadow-xl shadow-black/20 transition lg:group-hover/sidebar-item:block lg:group-hover/sidebar-item:opacity-100 lg:group-focus-visible/sidebar-item:block lg:group-focus-visible/sidebar-item:opacity-100">
      {children}
    </span>
  );
}