"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const menuItems = [
  { href: "#cum-functioneaza", label: "Cum funcționează" },
  { href: "#flashcards", label: "Flashcard-uri" },
  { href: "#beneficii", label: "Beneficii" },
  { href: "#abonamente", label: "Prețuri" },
  { href: "#intrebari", label: "Întrebări" },
];

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      {open ? (
        <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
      ) : (
        <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
      )}
    </svg>
  );
}

export function MarketingHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-subtle/80 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] max-w-7xl grid-cols-[1fr_auto] items-center px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-8">
        <BrandLogo
          href="/"
          className="w-fit text-content transition hover:text-action"
          logoClassName="h-8 w-32 sm:h-9 sm:w-36"
        />

        <nav
          aria-label="Navigație principală"
          className="hidden items-center gap-1 rounded-2xl border border-subtle bg-app/70 p-1 lg:flex"
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-xs font-bold text-muted transition hover:bg-surface hover:text-content xl:px-4"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {!isLoading && !user ? <ThemeToggle /> : null}
          {isLoading ? (
            <span className="hidden h-10 w-28 animate-pulse rounded-xl bg-surface-hover sm:block" />
          ) : user ? (
            <Link
              href="/myaccount"
              className="hidden items-center gap-2 rounded-xl bg-action px-4 py-2.5 text-xs font-bold text-on-action transition hover:bg-action-hover sm:inline-flex"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-on-action/15 text-[9px]">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
              Contul meu
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-xl px-4 py-2.5 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content sm:inline-flex"
              >
                Intră în cont
              </Link>
              <Link
                href="/register"
                className="hidden rounded-xl bg-action px-4 py-2.5 text-xs font-bold text-on-action transition hover:bg-action-hover sm:inline-flex"
              >
                Creează cont
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? "Închide meniul" : "Deschide meniul"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-subtle bg-surface text-content lg:hidden"
          >
            <MenuIcon open={isOpen} />
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`overflow-hidden border-subtle bg-surface transition-[max-height,border-color] duration-300 lg:hidden ${
          isOpen ? "max-h-96 border-t" : "max-h-0 border-t-transparent"
        }`}
      >
        <nav
          aria-label="Navigație mobilă"
          className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6"
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              {item.label}
            </a>
          ))}
          {!isLoading ? (
            user ? (
              <Link
                href="/myaccount"
                onClick={() => setIsOpen(false)}
                className="mt-2 rounded-xl bg-action px-4 py-3 text-center text-xs font-bold text-on-action sm:hidden"
              >
                Mergi la contul meu
              </Link>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-subtle pt-4 sm:hidden">
                <Link
                  href="/login"
                  className="rounded-xl border border-subtle bg-app px-4 py-3 text-center text-xs font-bold"
                >
                  Intră în cont
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-action px-4 py-3 text-center text-xs font-bold text-on-action"
                >
                  Creează cont
                </Link>
              </div>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
