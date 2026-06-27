import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { CookieSettingsButton } from "@/components/legal/cookie-consent";
import {
  footerGeneratedContentDisclaimer,
  legalConfig,
  legalLinks,
  supportLinks,
} from "@/lib/legal-config";

export function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const anpcLinks = [
    {
      href: legalConfig.anpcSalUrl,
      imagePath: legalConfig.anpcSalImagePath,
      alt: "ANPC Soluționarea Alternativă a Litigiilor",
      label: "ANPC SAL",
    },
    {
      href: legalConfig.anpcSolUrl,
      imagePath: legalConfig.anpcSolImagePath,
      alt: "Soluționarea Online a Litigiilor",
      label: "ANPC SOL",
    },
  ] as const;

  return (
    <footer className="border-t border-subtle bg-surface">
      <div className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 sm:pt-14">
        <div className="grid gap-10 border-b border-subtle pb-10 lg:grid-cols-[1.1fr_1.9fr]">
          <div>
            <BrandLogo
              href="/"
              className="w-fit text-content transition hover:text-action"
              logoClassName="h-9 w-36"
            />
            <p className="mt-5 max-w-sm text-sm leading-7 text-muted">
              Transformă materialele de studiu în flashcard-uri generate automat.
            </p>
            <p className="mt-4 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-xs font-semibold leading-5 text-warning">
              {footerGeneratedContentDisclaimer}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-muted">
                Linkuri juridice
              </p>
              <ul className="mt-5 space-y-3">
                {legalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted transition hover:text-content"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton className="text-left text-sm font-bold text-muted underline decoration-subtle underline-offset-4 transition hover:text-content" />
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-muted">
                Asistență
              </p>
              <ul className="mt-5 space-y-3">
                {supportLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-muted transition hover:text-content"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-muted">
                Datele firmei
              </p>
              <dl className="mt-5 space-y-2 text-xs leading-5 text-muted">
                <div>
                  <dt className="sr-only">Denumire firmă</dt>
                  <dd className="font-bold text-content">{legalConfig.companyName}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">Sediu social</dt>
                  <dd>{legalConfig.registeredOffice}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">CUI</dt>
                  <dd>{legalConfig.cui}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">Nr. Registrul Comerțului</dt>
                  <dd>{legalConfig.tradeRegisterNumber}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">Capital social</dt>
                  <dd>{legalConfig.shareCapital}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">E-mail</dt>
                  <dd>{legalConfig.contactEmail}</dd>
                </div>
                <div>
                  <dt className="font-bold text-content">Telefon</dt>
                  <dd>{legalConfig.phone}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="text-xs leading-6 text-muted">
            <p>
              © {currentYear} {legalConfig.companyName}. Toate drepturile
              rezervate.
            </p>
            <p>{footerGeneratedContentDisclaimer}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:justify-end">
            {anpcLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group block text-center transition duration-200 hover:-translate-y-0.5"
              >
                <span className="block rounded-[1.35rem] bg-transparent p-0.5 transition group-hover:drop-shadow-md">
                  <Image
                    src={link.imagePath}
                    alt={link.alt}
                    width={500}
                    height={124}
                    className="h-auto w-52 object-contain sm:w-56"
                  />
                </span>
                <span className="sr-only">{link.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
