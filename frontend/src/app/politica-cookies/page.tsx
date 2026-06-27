import type { Metadata } from "next";
import { CookieSettingsButton } from "@/components/legal/cookie-consent";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { cookieCategories, legalConfig } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: "Politica privind cookie-urile | Revizzio",
  description:
    "Informații despre categoriile de cookie-uri folosite de Revizzio și modul de administrare a consimțământului.",
};

export default function CookiePolicyPage() {
  return (
    <LegalPageShell
      eyebrow="Cookie-uri"
      title="Politica privind cookie-urile."
      description="Cookie-urile opționale nu sunt încărcate înainte de consimțământ. Poți accepta, respinge sau personaliza oricând preferințele."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <article className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <h2 className="font-serif text-3xl font-semibold">
            Categorii de cookie-uri
          </h2>
          <div className="mt-5 grid gap-3">
            {cookieCategories.map((category) => (
              <section
                key={category.id}
                className="rounded-2xl border border-subtle bg-app p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-black">{category.label}</h3>
                  {category.alwaysActive ? (
                    <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                      mereu active
                    </span>
                  ) : (
                    <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                      doar cu acord
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {category.description}
                </p>
              </section>
            ))}
          </div>
        </article>

        <aside className="h-fit rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            Preferințe
          </p>
          <p className="mt-3 text-sm leading-6 text-muted">
            Versiune consimțământ: {legalConfig.cookieConsentVersion}. Poți
            modifica acordul fără să ți se blocheze accesul la platformă.
          </p>
          <CookieSettingsButton className="mt-5 w-full rounded-full bg-action px-4 py-3 text-sm font-black text-on-action transition hover:bg-action-hover" />
        </aside>
      </div>
    </LegalPageShell>
  );
}
