import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { SiteFooter } from "@/components/legal/site-footer";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <>
      <main className="min-h-screen bg-app text-content">
        <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <BrandLogo
            href="/"
            className="text-content transition hover:text-action"
            logoClassName="h-9 w-36"
          />

          <Link
            href="/"
            className="rounded-full border border-subtle bg-surface px-4 py-2 text-xs font-bold text-muted shadow-sm transition hover:text-content"
          >
            Acasă
          </Link>
        </header>

        <section className="mx-auto max-w-6xl px-5 pb-16 pt-4 sm:px-8 lg:pb-24">
          <div className="rounded-[2rem] border border-subtle bg-surface px-5 py-7 theme-shadow-card sm:px-8 sm:py-9">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted">
              {eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted sm:text-base">
              {description}
            </p>
          </div>

          <div className="mt-6">{children}</div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
