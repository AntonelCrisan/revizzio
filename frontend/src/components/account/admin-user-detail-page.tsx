"use client";

import Link from "next/link";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import type { AdminUser, AdminUserSession } from "@/lib/admin-users-api";

type AdminUserDetailPageProps = {
  user: AdminUser;
};

function formatDate(value: string | null) {
  if (!value) return "Niciodată";
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function roleLabel(role: AdminUser["role"]) {
  return role === "admin" ? "Admin" : "User";
}

function themeLabel(theme: AdminUser["theme_preference"]) {
  if (theme === "dark") return "Dark mode";
  if (theme === "light") return "Light mode";
  return "Sistem";
}

function statusClass(status: AdminUserSession["status"]) {
  if (status === "activă") return "text-success";
  if (status === "revocată") return "text-danger";
  return "text-muted";
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="grid gap-1 border-b border-subtle py-3 last:border-b-0 sm:grid-cols-[220px_1fr] sm:gap-5">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold text-content">{value}</dd>
    </div>
  );
}

export function AdminUserDetailPage({ user }: AdminUserDetailPageProps) {
  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-5">
        <div className="border-b border-subtle pb-5">
          <Link
            href="/admin/settings/utilizatori"
            className="text-sm font-bold text-muted transition hover:text-content"
          >
            ← Înapoi la utilizatori
          </Link>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {user.full_name}
              </h1>
              <p className="mt-2 break-all text-sm text-muted">{user.email}</p>
            </div>
            <div className="text-sm font-bold text-muted">
              {roleLabel(user.role)} · {user.is_active ? "Activ" : "Inactiv"}
            </div>
          </div>
        </div>

        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">
            Date cont
          </h2>
          <dl className="rounded-[1.25rem] border border-subtle bg-surface px-4">
            <DataRow label="ID utilizator" value={user.id} />
            <DataRow label="Nume" value={user.full_name} />
            <DataRow label="Email" value={user.email} />
            <DataRow label="Rol" value={roleLabel(user.role)} />
            <DataRow label="Status" value={user.is_active ? "Activ" : "Inactiv"} />
            <DataRow label="Tema preferată" value={themeLabel(user.theme_preference)} />
            <DataRow label="Creat la" value={formatDate(user.created_at)} />
            <DataRow label="Actualizat la" value={formatDate(user.updated_at)} />
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">
            Legal și consimțăminte
          </h2>
          <dl className="rounded-[1.25rem] border border-subtle bg-surface px-4">
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
          </dl>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-black uppercase tracking-[0.16em] text-muted">
            Sesiuni
          </h2>
          <dl className="mb-4 rounded-[1.25rem] border border-subtle bg-surface px-4">
            <DataRow label="Sesiuni totale" value={user.total_sessions} />
            <DataRow label="Sesiuni active" value={user.active_sessions} />
            <DataRow
              label="Ultima sesiune"
              value={formatDate(user.last_session_at)}
            />
            <DataRow
              label="Ultima activitate"
              value={formatDate(user.last_seen_at)}
            />
          </dl>

          <div className="overflow-hidden rounded-[1.25rem] border border-subtle bg-surface">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full border-collapse text-left text-sm">
                <thead className="border-b border-subtle bg-app text-xs font-black uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Creată</th>
                    <th className="px-4 py-3">Expiră</th>
                    <th className="px-4 py-3">Revocată</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">User agent</th>
                  </tr>
                </thead>
                <tbody>
                  {user.sessions.map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-subtle last:border-b-0"
                    >
                      <td className={`px-4 py-4 font-black ${statusClass(session.status)}`}>
                        {session.status}
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
                      <td className="min-w-[360px] whitespace-normal break-words px-4 py-4 text-muted">
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
          </div>
        </section>
      </section>
    </AccountStaticShell>
  );
}
