"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSelect } from "@/components/language-select";
import { useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const menuItems = [
  { href: "#cum-functioneaza", labelKey: "marketing.nav.how" },
  { href: "#flashcards", labelKey: "marketing.nav.flashcards" },
  { href: "#beneficii", labelKey: "marketing.nav.benefits" },
  { href: "#abonamente", labelKey: "marketing.nav.pricing" },
  { href: "#intrebari", labelKey: "marketing.nav.questions" },
] as const;

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
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 border-b border-subtle/80 bg-surface/90 backdrop-blur-xl">
      <div className="mx-auto grid h-[4.5rem] max-w-7xl grid-cols-[1fr_auto] items-center px-4 sm:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-8 xl:px-8">
        <BrandLogo
          href="/"
          className="w-fit shrink-0 text-content transition hover:text-action"
          logoClassName="h-8 w-32 sm:h-9 sm:w-36"
        />

        <nav
          aria-label="Navigatie principala"
          className="hidden min-w-0 items-center justify-self-center rounded-2xl border border-subtle bg-app/70 p-1 xl:flex"
        >
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold text-muted transition hover:bg-surface hover:text-content 2xl:px-4"
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 justify-self-end">
          <LanguageSelect compact className="hidden shrink-0 sm:inline-flex" />
          {!isLoading && !user ? <ThemeToggle /> : null}
          {isLoading ? (
            <span className="hidden h-10 w-28 shrink-0 animate-pulse rounded-xl bg-surface-hover sm:block" />
          ) : user ? (
            <Link
              href="/myaccount"
              className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-action px-4 py-2.5 text-xs font-bold text-on-action transition hover:bg-action-hover sm:inline-flex"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-on-action/15 text-[9px]">
                {user.full_name.charAt(0).toUpperCase()}
              </span>
              {t("marketing.account")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content sm:inline-flex"
              >
                {t("marketing.login")}
              </Link>
              <Link
                href="/register"
                className="hidden shrink-0 whitespace-nowrap rounded-xl bg-action px-4 py-2.5 text-xs font-bold text-on-action transition hover:bg-action-hover sm:inline-flex"
              >
                {t("marketing.register")}
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={
              isOpen ? t("marketing.closeMenu") : t("marketing.openMenu")
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-subtle bg-surface text-content xl:hidden"
          >
            <MenuIcon open={isOpen} />
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`overflow-hidden border-subtle bg-surface transition-[max-height,border-color] duration-300 xl:hidden ${
          isOpen ? "max-h-96 border-t" : "max-h-0 border-t-transparent"
        }`}
      >
        <nav
          aria-label="Navigatie mobila"
          className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6"
        >
          <LanguageSelect className="mb-2 w-full sm:hidden" />
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="rounded-xl px-4 py-3 text-sm font-bold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              {t(item.labelKey)}
            </a>
          ))}
          {!isLoading ? (
            user ? (
              <Link
                href="/myaccount"
                onClick={() => setIsOpen(false)}
                className="mt-2 rounded-xl bg-action px-4 py-3 text-center text-xs font-bold text-on-action sm:hidden"
              >
                {t("marketing.goToAccount")}
              </Link>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-subtle pt-4 sm:hidden">
                <Link
                  href="/login"
                  className="rounded-xl border border-subtle bg-app px-4 py-3 text-center text-xs font-bold"
                >
                  {t("marketing.login")}
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-action px-4 py-3 text-center text-xs font-bold text-on-action"
                >
                  {t("marketing.register")}
                </Link>
              </div>
            )
          ) : null}
        </nav>
      </div>
    </header>
  );
}
