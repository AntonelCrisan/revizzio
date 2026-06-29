"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";

type SettingsCard = {
  title: string;
  href: string;
  icon: "document" | "shield" | "building" | "card" | "users" | "logs";
};

const legalCards: SettingsCard[] = [
  {
    title: "Termeni și condiții",
    href: "/admin/settings/termeni-si-conditii",
    icon: "document",
  },
  {
    title: "Politica de confidențialitate",
    href: "/admin/settings/politica-de-confidentialitate",
    icon: "shield",
  },
  {
    title: "Datele firmei",
    href: "/admin/settings/datele-firmei",
    icon: "building",
  },
];

const planCards: SettingsCard[] = [
  {
    title: "Planuri și abonamente",
    href: "/admin/settings/planuri",
    icon: "card",
  },
];

const userCards: SettingsCard[] = [
  {
    title: "Utilizatori",
    href: "/admin/settings/utilizatori",
    icon: "users",
  },
];

const monitoringCards: SettingsCard[] = [
  {
    title: "Jurnal activitate",
    href: "/admin/settings/loguri",
    icon: "logs",
  },
];

function SvgIcon({
  children,
  className = "h-5 w-5",
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

function SettingsIcon({ icon }: { icon: SettingsCard["icon"] }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-subtle bg-surface text-content transition group-hover:border-action/30 group-hover:bg-action group-hover:text-on-action">
      {icon === "document" ? (
        <SvgIcon>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </SvgIcon>
      ) : null}
      {icon === "shield" ? (
        <SvgIcon>
          <path d="M12 3 20 6v6c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V6z" />
          <path d="M9.5 12.5 11 14l3.5-4" />
        </SvgIcon>
      ) : null}
      {icon === "building" ? (
        <SvgIcon>
          <path d="M4 21h16M6 21V5l8-2v18M14 8h4v13" />
          <path d="M8 8h2M8 12h2M8 16h2M16 12h1M16 16h1" />
        </SvgIcon>
      ) : null}
      {icon === "card" ? (
        <SvgIcon>
          <path d="M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
          <path d="M2 11h20M6 15h4" />
        </SvgIcon>
      ) : null}
      {icon === "users" ? (
        <SvgIcon>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </SvgIcon>
      ) : null}
      {icon === "logs" ? (
        <SvgIcon>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </SvgIcon>
      ) : null}
    </span>
  );
}

function ArrowIcon() {
  return (
    <SvgIcon className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </SvgIcon>
  );
}

function SettingsGroup({
  title,
  cards,
}: {
  title: string;
  cards: SettingsCard[];
}) {
  return (
    <section className="rounded-[1.75rem] border border-subtle bg-surface p-4 sm:p-5">
      <h2 className="px-1 text-xs font-black uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-center gap-4 rounded-[1.35rem] border border-subtle bg-app p-4 transition hover:-translate-y-0.5 hover:border-action/30 hover:bg-surface-hover"
          >
            <SettingsIcon icon={card.icon} />
            <span className="min-w-0 flex-1 text-base font-black text-content">
              {card.title}
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition group-hover:bg-action group-hover:text-on-action">
              <ArrowIcon />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AdminSettingsPage() {
  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-4">
        <div className="rounded-[1.75rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Administrare
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
            Setări admin
          </h1>
        </div>

        <SettingsGroup title="Aplicație și firmă" cards={legalCards} />
        <SettingsGroup title="Planuri" cards={planCards} />
        <SettingsGroup title="Utilizatori și acces" cards={userCards} />
        <SettingsGroup title="Monitorizare" cards={monitoringCards} />
      </section>
    </AccountStaticShell>
  );
}
