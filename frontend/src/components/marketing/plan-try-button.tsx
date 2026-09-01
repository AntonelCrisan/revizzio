"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/auth-provider";

type PlanTryButtonProps = {
  slug: string;
  label: string;
  isFree: boolean;
};

/**
 * The only client-side piece of a plan detail page.
 *
 * Everything else on the page is server-rendered so crawlers get the full
 * content; this button just needs to know whether there is a session, to send
 * the visitor to checkout or through login first.
 */
export function PlanTryButton({ slug, label, isFree }: PlanTryButtonProps) {
  const { user, isLoading } = useAuth();

  const target = isFree ? "/myaccount" : `/checkout/${slug}`;
  const href = user
    ? target
    : isFree
      ? "/register"
      : `/login?next=${encodeURIComponent(target)}`;

  return (
    <>
      <Link
        href={href}
        aria-busy={isLoading}
        className="theme-shadow-action inline-flex w-full items-center justify-center gap-3 rounded-md bg-action px-6 py-3.5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover"
      >
        {label}
        <span aria-hidden="true">→</span>
      </Link>
      {!isLoading && !user ? (
        <p className="mt-3 text-center text-xs leading-5 text-muted">
          {isFree
            ? "Îți creezi contul în câțiva pași, fără card."
            : "Îți cerem întâi autentificarea, apoi continui direct spre plată."}
        </p>
      ) : null}
    </>
  );
}
