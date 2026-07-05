"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";

type AccountPageId =
  | "dashboard"
  | "settings"
  | "upgrade"
  | "billing-invoices"
  | "admin-settings";
type SettingsSectionId =
  | "account"
  | "study"
  | "appearance"
  | "colors"
  | "notifications"
  | "security"
  | "privacy";
type SidebarGroupId = "settings" | "billing";

const settingsSectionChangeEvent = "revizzio:settings-section-change";

type AccountStaticShellProps = {
  activePage: AccountPageId;
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  page: AccountPageId;
  adminOnly?: boolean;
};

const navigationItems = [
  { href: "/myaccount", label: "Acasă", page: "dashboard" },
] satisfies NavigationItem[];

const adminNavigationItem = {
  href: "/admin/settings",
  label: "Setări admin",
  page: "admin-settings",
} satisfies NavigationItem;

const settingsItems = [
  { href: "/settings#account", label: "Cont", section: "account" },
  { href: "/settings#study", label: "Studiu", section: "study" },
  { href: "/settings#appearance", label: "Aspect", section: "appearance" },
  { href: "/settings#colors", label: "Culori", section: "colors" },
  {
    href: "/settings#notifications",
    label: "Notificări",
    section: "notifications",
  },
  { href: "/settings#security", label: "Securitate", section: "security" },
  { href: "/settings#privacy", label: "Date", section: "privacy" },
] satisfies Array<{
  href: string;
  label: string;
  section: SettingsSectionId;
}>;

const billingItems = [
  { href: "/upgrade", label: "Planuri", page: "upgrade" },
  { href: "/upgrade/facturi", label: "Facturi", page: "billing-invoices" },
] satisfies NavigationItem[];

function isSettingsSection(value: string): value is SettingsSectionId {
  return settingsItems.some((item) => item.section === value);
}

function Icon({
  children,
  className = "h-4 w-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      {children}
    </svg>
  );
}

function Logo() {
  return (
    <BrandLogo
      href="/"
      className="text-content transition hover:text-action"
      logoClassName="h-8 w-32"
    />
  );
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "EQ"
  );
}

function PageIcon({ page }: { page: AccountPageId }) {
  return (
    <Icon className="h-[18px] w-[18px]">
      {page === "dashboard" ? (
        <>
          <path d="M3 11l9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </>
      ) : null}
      {page === "settings" ? (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.08.08a2 2 0 1 1-2.83-2.83l.08-.08A1.7 1.7 0 0 0 10.6 15a1.7 1.7 0 0 0-1.88-.34l-.1.04a2 2 0 1 1-1.53-3.7l.1-.04A1.7 1.7 0 0 0 7.8 9a1.7 1.7 0 0 0-.6-1l-.08-.08a2 2 0 1 1 2.83-2.83l.08.08A1.7 1.7 0 0 0 12 4.6a1.7 1.7 0 0 0 1-.6l.08-.08a2 2 0 1 1 2.83 2.83l-.08.08A1.7 1.7 0 0 0 16.4 9a1.7 1.7 0 0 0 1.88.34l.1-.04a2 2 0 1 1 1.53 3.7l-.1.04A1.7 1.7 0 0 0 19.4 15z" />
        </>
      ) : null}
      {page === "admin-settings" ? (
        <>
          <path d="M12 3 20 6v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6l8-3z" />
          <path d="M9 12l2 2 4-4" />
        </>
      ) : null}
    </Icon>
  );
}

export function AccountStaticShell({
  activePage,
  children,
}: AccountStaticShellProps) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [openNavGroup, setOpenNavGroup] = useState<SidebarGroupId | null>(() => {
    if (activePage === "settings") return "settings";
    if (activePage === "upgrade" || activePage === "billing-invoices") {
      return "billing";
    }
    return null;
  });
  const [activeSettingsSection, setActiveSettingsSection] =
    useState<SettingsSectionId>("account");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function syncSettingsSection() {
      const nextSection = window.location.hash.replace("#", "");
      setActiveSettingsSection(
        isSettingsSection(nextSection) ? nextSection : "account",
      );
    }

    function syncSettingsSectionFromEvent(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const nextSection = event.detail;
      if (typeof nextSection !== "string" || !isSettingsSection(nextSection)) {
        return;
      }
      setActiveSettingsSection(nextSection);
    }

    const frame = window.requestAnimationFrame(syncSettingsSection);
    window.addEventListener("hashchange", syncSettingsSection);
    window.addEventListener(
      settingsSectionChangeEvent,
      syncSettingsSectionFromEvent,
    );
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncSettingsSection);
      window.removeEventListener(
        settingsSectionChangeEvent,
        syncSettingsSectionFromEvent,
      );
    };
  }, []);

  function handleSettingsItemClick(
    event: MouseEvent<HTMLAnchorElement>,
    section: SettingsSectionId,
  ) {
    if (activePage !== "settings") return;

    event.preventDefault();
    window.history.pushState(null, "", `#${section}`);
    setActiveSettingsSection(section);
    window.dispatchEvent(
      new CustomEvent(settingsSectionChangeEvent, { detail: section }),
    );
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  }

  if (isLoading || !user) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-app text-content">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-subtle border-t-action" />
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-app text-content lg:flex">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Închide meniul"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col border-r border-subtle bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:h-svh lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Meniu principal"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-content transition hover:bg-surface-hover lg:hidden"
            aria-label="Închide meniul"
          >
            <Icon className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          <Link
            href="/myaccount"
            className="mx-4 mb-4 flex items-center justify-center gap-2 rounded-full bg-content px-4 py-3 text-sm font-semibold text-app transition hover:opacity-90"
          >
            <Icon>
              <path d="M12 5v14M5 12h14" />
            </Icon>
            Proiect nou
          </Link>

          <nav className="space-y-1 px-2">
            {navigationItems.map((item) => {
              const isActive = item.page === activePage;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-success-soft text-success"
                      : "text-content hover:bg-surface-hover"
                  }`}
                >
                  <PageIcon page={item.page} />
                  {item.label}
                </Link>
              );
            })}

            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setOpenNavGroup((currentGroup) =>
                    currentGroup === "settings" ? null : "settings",
                  )
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activePage === "settings"
                    ? "bg-success-soft text-success"
                    : "text-content hover:bg-surface-hover"
                }`}
                aria-expanded={openNavGroup === "settings"}
              >
                <PageIcon page="settings" />
                <span className="min-w-0 flex-1">Setări</span>
                <Icon
                  className={`h-4 w-4 transition ${
                    openNavGroup === "settings" ? "rotate-90" : ""
                  }`}
                >
                  <path d="M9 18l6-6-6-6" />
                </Icon>
              </button>

              <div
                className={`ml-8 overflow-hidden transition-[max-height] duration-300 ${
                  openNavGroup === "settings" ? "max-h-80" : "max-h-0"
                }`}
              >
                <div className="mt-1 space-y-1">
                  {settingsItems.map((item) => {
                    const isActive =
                      activePage === "settings" &&
                      item.section === activeSettingsSection;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={(event) =>
                          handleSettingsItemClick(event, item.section)
                        }
                        className={`flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-success-soft text-success"
                            : "text-muted hover:bg-surface-hover hover:text-content"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

            {user.role === "admin" ? (
              <Link
                href={adminNavigationItem.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  activePage === adminNavigationItem.page
                    ? "bg-success-soft text-success"
                    : "text-content hover:bg-surface-hover"
                }`}
              >
                <PageIcon page={adminNavigationItem.page} />
                {adminNavigationItem.label}
              </Link>
            ) : null}

            <div className="pt-1">
              <button
                type="button"
                onClick={() =>
                  setOpenNavGroup((currentGroup) =>
                    currentGroup === "billing" ? null : "billing",
                  )
                }
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activePage === "upgrade" || activePage === "billing-invoices"
                    ? "bg-success-soft text-success"
                    : "text-content hover:bg-surface-hover"
                }`}
                aria-expanded={openNavGroup === "billing"}
              >
                <Icon className="h-[18px] w-[18px]">
                  <path d="M12 3l3.2 6.5 7.1 1-5.1 5 1.2 7-6.4-3.4-6.4 3.4 1.2-7-5.1-5 7.1-1L12 3z" />
                </Icon>
                <span className="min-w-0 flex-1">Abonament</span>
                <Icon
                  className={`h-4 w-4 transition ${
                    openNavGroup === "billing" ? "rotate-90" : ""
                  }`}
                >
                  <path d="M9 18l6-6-6-6" />
                </Icon>
              </button>
              <div
                className={`ml-8 overflow-hidden transition-[max-height] duration-300 ${
                  openNavGroup === "billing" ? "max-h-32" : "max-h-0"
                }`}
              >
                <div className="mt-1 space-y-1">
                  {billingItems.map((item) => {
                    const isActive = item.page === activePage;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-success-soft text-success"
                            : "text-muted hover:bg-surface-hover hover:text-content"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </nav>
        </div>

        <div className="border-t border-subtle p-3">
          <div className="flex items-center gap-3 rounded-2xl px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-subtle bg-success-soft text-xs font-bold text-success">
              {initials(user.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user.full_name}
              </span>
              <span className="block truncate text-xs text-muted">
                {user.email}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-hover hover:text-content disabled:cursor-wait disabled:opacity-60"
              aria-label="Ieși din cont"
            >
              <Icon>
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M21 19V5" />
              </Icon>
            </button>
          </div>
        </div>
      </aside>

      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl border border-subtle bg-surface/95 text-content shadow-lg shadow-black/10 backdrop-blur-xl transition hover:bg-surface-hover lg:hidden"
          aria-label="Deschide meniul"
        >
          <Icon className="h-5 w-5">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </Icon>
        </button>

        <main className="mx-auto max-w-6xl px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
