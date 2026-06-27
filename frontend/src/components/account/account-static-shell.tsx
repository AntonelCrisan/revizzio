"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";

type AccountPageId = "dashboard" | "settings" | "upgrade";

type AccountStaticShellProps = {
  activePage: AccountPageId;
  children: ReactNode;
};

const navigationItems = [
  { href: "/myaccount", label: "Dashboard", page: "dashboard" },
  { href: "/settings", label: "Setari", page: "settings" },
  { href: "/upgrade", label: "Upgrade", page: "upgrade" },
] satisfies Array<{
  href: string;
  label: string;
  page: AccountPageId;
}>;

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

export function AccountStaticShell({
  activePage,
  children,
}: AccountStaticShellProps) {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          aria-label="Inchide meniul"
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
            aria-label="Inchide meniul"
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
                  <Icon className="h-[18px] w-[18px]">
                    {item.page === "dashboard" ? (
                      <>
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                      </>
                    ) : null}
                    {item.page === "settings" ? (
                      <>
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6l-.08.08a2 2 0 1 1-2.83-2.83l.08-.08A1.7 1.7 0 0 0 10.6 15a1.7 1.7 0 0 0-1.88-.34l-.1.04a2 2 0 1 1-1.53-3.7l.1-.04A1.7 1.7 0 0 0 7.8 9a1.7 1.7 0 0 0-.6-1l-.08-.08a2 2 0 1 1 2.83-2.83l.08.08A1.7 1.7 0 0 0 12 4.6a1.7 1.7 0 0 0 1-.6l.08-.08a2 2 0 1 1 2.83 2.83l-.08.08A1.7 1.7 0 0 0 16.4 9a1.7 1.7 0 0 0 1.88.34l.1-.04a2 2 0 1 1 1.53 3.7l-.1.04A1.7 1.7 0 0 0 19.4 15z" />
                      </>
                    ) : null}
                    {item.page === "upgrade" ? (
                      <>
                        <path d="M12 3l3.2 6.5 7.1 1-5.1 5 1.2 7-6.4-3.4-6.4 3.4 1.2-7-5.1-5 7.1-1L12 3z" />
                      </>
                    ) : null}
                  </Icon>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mx-4 my-5 h-px bg-subtle" />

          <div className="mx-4 rounded-2xl border border-subtle bg-app p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-[0.08em]">PLAN START</p>
              <span className="text-[11px] text-muted">gratuit</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full w-2/3 rounded-full bg-success" />
            </div>
            <p className="mt-2 text-xs text-muted">
              2 din 3 materiale procesate luna aceasta
            </p>
            <Link
              href="/upgrade"
              className="mt-3 flex items-center justify-center rounded-full border border-content px-3 py-2 text-xs font-bold transition hover:bg-content hover:text-app"
            >
              Upgrade plan
            </Link>
          </div>
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
              aria-label="Iesi din cont"
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

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-subtle bg-app/95 px-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-content transition hover:bg-surface-hover lg:hidden"
              aria-label="Deschide meniul"
            >
              <Icon className="h-5 w-5">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </Icon>
            </button>
            <Logo />
          </div>

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-subtle bg-success-soft text-xs font-bold text-success">
              {initials(user.full_name)}
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
