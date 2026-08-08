"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { TablePagination } from "@/components/account/table-pagination";
import type { AdminUser, AdminUserSession } from "@/lib/admin-users-api";

type AdminUserDetailPageProps = {
  user: AdminUser;
};

const SESSIONS_PAGE_SIZE = 8;

function formatDate(value: string | null) {
  if (!value) return "Niciodată";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "necunoscut";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function roleLabel(role: AdminUser["role"]) {
  return role === "admin" ? "Administrator" : "Utilizator";
}

function themeLabel(theme: AdminUser["theme_preference"]) {
  if (theme === "dark") return "Dark";
  if (theme === "light") return "Light";
  return "Sistem";
}

function sessionStatusClass(status: AdminUserSession["status"]) {
  if (status === "activă") {
    return "border-success-border bg-success-soft text-success";
  }
  if (status === "revocată") {
    return "border-danger-border bg-danger-soft text-danger";
  }
  return "border-subtle bg-app text-muted";
}

function statusBadgeClass(active: boolean) {
  return active
    ? "border-success-border bg-success-soft text-success"
    : "border-danger-border bg-danger-soft text-danger";
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid gap-1 py-3 text-sm sm:grid-cols-[13rem_1fr] sm:gap-5">
      <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </dt>
      <dd className="min-w-0 break-words font-semibold text-content">{value}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      <dl className="mt-4 divide-y divide-subtle border-y border-subtle">
        {children}
      </dl>
    </section>
  );
}

function UserMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-subtle bg-surface p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 font-serif text-2xl font-semibold leading-tight text-content">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

export function AdminUserDetailPage({ user }: AdminUserDetailPageProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(
    1,
    Math.ceil(user.sessions.length / SESSIONS_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedSessions = useMemo(() => {
    const start = (safeCurrentPage - 1) * SESSIONS_PAGE_SIZE;
    return user.sessions.slice(start, start + SESSIONS_PAGE_SIZE);
  }, [safeCurrentPage, user.sessions]);

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/settings/utilizatori"
              className="mb-5 flex w-fit items-center rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Utilizatori
            </Link>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Utilizator
            </p>
            <h1 className="mt-3 max-w-3xl break-words font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              {user.full_name || "Fără nume"}
            </h1>
            <p className="mt-3 break-all text-sm leading-6 text-muted">
              {user.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex rounded-full border border-action bg-action px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-on-action">
              {roleLabel(user.role)}
            </span>
            <span
              className={`inline-flex rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${statusBadgeClass(user.is_active)}`}
            >
              {user.is_active ? "Activ" : "Inactiv"}
            </span>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <UserMetric
            label="Rol"
            value={roleLabel(user.role)}
            detail="permisiune curentă"
          />
          <UserMetric
            label="Sesiuni active"
            value={String(user.active_sessions)}
            detail={`${user.total_sessions} sesiuni totale`}
          />
          <UserMetric
            label="Ultima activitate"
            value={formatDate(user.last_seen_at)}
            detail={themeLabel(user.theme_preference)}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <DetailSection title="Date cont">
            <DataRow label="ID utilizator" value={user.id} />
            <DataRow label="Nume" value={user.full_name || "Fără nume"} />
            <DataRow label="Email" value={user.email} />
            <DataRow label="Rol" value={roleLabel(user.role)} />
            <DataRow label="Status" value={user.is_active ? "Activ" : "Inactiv"} />
            <DataRow
              label="Tema preferată"
              value={themeLabel(user.theme_preference)}
            />
            <DataRow label="Creat la" value={formatDate(user.created_at)} />
            <DataRow label="Actualizat la" value={formatDate(user.updated_at)} />
          </DetailSection>

          <DetailSection title="Legal și consimțăminte">
            <DataRow
              label="Termeni acceptați"
              value={formatDate(user.terms_accepted_at)}
            />
            <DataRow label="Versiune termeni" value={user.terms_version} />
            <DataRow
              label="Newsletter"
              value={user.newsletter_consent ? "Acceptat" : "Neacceptat"}
            />
            <DataRow
              label="Newsletter acceptat la"
              value={formatDate(user.newsletter_consent_at)}
            />
          </DetailSection>
        </div>

        <section className="rounded-xl border border-subtle bg-surface p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
              Sesiuni
            </h2>
            <span className="text-xs font-bold text-muted">
              {user.sessions.length} înregistrări
            </span>
          </div>

          <dl className="mt-4 grid gap-0 divide-y divide-subtle border-y border-subtle md:grid-cols-2 md:divide-x md:divide-y-0">
            <DataRow label="Sesiuni totale" value={user.total_sessions} />
            <DataRow label="Sesiuni active" value={user.active_sessions} />
            <DataRow label="Ultima sesiune" value={formatDate(user.last_session_at)} />
            <DataRow
              label="Ultima activitate"
              value={formatDate(user.last_seen_at)}
            />
          </dl>

          <div className="data-table-scroll mt-5 max-h-[32rem] overflow-auto border-t border-subtle pt-5">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-subtle bg-surface text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Creată</th>
                  <th className="px-4 py-3">Expiră</th>
                  <th className="px-4 py-3">Revocată</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">User agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {paginatedSessions.map((session) => (
                  <tr key={session.id} className="transition hover:bg-surface-hover/45">
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${sessionStatusClass(session.status)}`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDate(session.created_at)}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDate(session.expires_at)}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDate(session.revoked_at)}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {session.ip_address ?? "Necunoscut"}
                    </td>
                    <td className="min-w-[420px] whitespace-normal break-words px-4 py-4 text-muted">
                      {session.user_agent ?? "Necunoscut"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {user.sessions.length === 0 ? (
            <p className="border-t border-subtle p-5 text-sm text-muted">
              Utilizatorul nu are sesiuni înregistrate.
            </p>
          ) : null}
          <TablePagination
            currentPage={safeCurrentPage}
            pageCount={pageCount}
            pageSize={SESSIONS_PAGE_SIZE}
            totalItems={user.sessions.length}
            itemLabel="sesiuni"
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
    </AccountStaticShell>
  );
}
