"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { type AdminUser, getAdminUsers } from "@/lib/admin-users-api";

type AdminUsersPageProps = {
  initialUsers: AdminUser[];
};

type UserFilter = "all" | "admin" | "user" | "active" | "inactive";

const userFilters: Array<{ value: UserFilter; label: string }> = [
  { value: "all", label: "Toți" },
  { value: "admin", label: "Admini" },
  { value: "user", label: "Utilizatori" },
  { value: "active", label: "Activi" },
  { value: "inactive", label: "Inactivi" },
];

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

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        active ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
      }`}
    >
      {children}
    </span>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
        role === "admin" ? "bg-action text-on-action" : "bg-subtle text-muted"
      }`}
    >
      {roleLabel(role)}
    </span>
  );
}

export function AdminUsersPage({ initialUsers }: AdminUsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.full_name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        user.id.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        user.role === filter ||
        (filter === "active" && user.is_active) ||
        (filter === "inactive" && !user.is_active);

      return matchesSearch && matchesFilter;
    });
  }, [filter, search, users]);

  const adminCount = users.filter((user) => user.role === "admin").length;
  const activeSessions = users.reduce(
    (total, user) => total + user.active_sessions,
    0,
  );

  async function refreshUsers() {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      setUsers(await getAdminUsers());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Utilizatorii nu au putut fi încărcați.",
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-subtle pb-5">
          <div>
            <Link
              href="/admin/settings"
              className="text-sm font-bold text-muted transition hover:text-content"
            >
              ← Înapoi la setări admin
            </Link>
            <h1 className="mt-5 font-serif text-3xl font-semibold leading-tight sm:text-4xl">
              Utilizatori
            </h1>
            <p className="mt-2 text-sm text-muted">
              {users.length} conturi · {adminCount} admini · {activeSessions}{" "}
              sesiuni active
            </p>
          </div>

          <button
            type="button"
            onClick={refreshUsers}
            disabled={isRefreshing}
            className="rounded-full bg-content px-5 py-3 text-sm font-black text-app transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefreshing ? "Se actualizează..." : "Actualizează"}
          </button>
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Caută utilizatori</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută după nume, email sau ID..."
              className="h-12 w-full rounded-2xl border border-subtle bg-surface px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
            />
          </label>

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as UserFilter)}
            className="h-12 rounded-2xl border border-subtle bg-surface px-4 text-sm font-bold text-content outline-none transition focus:border-action"
          >
            {userFilters.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-subtle bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-subtle bg-app text-xs font-black uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">Nume</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Creat</th>
                  <th className="px-4 py-3">Ultima sesiune</th>
                  <th className="px-4 py-3 text-right">Sesiuni active</th>
                  <th className="px-4 py-3 text-right">Acțiune</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-subtle last:border-b-0 hover:bg-surface-hover"
                  >
                    <td className="px-4 py-4 font-bold">{user.full_name}</td>
                    <td className="px-4 py-4 text-muted">{user.email}</td>
                    <td className="px-4 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge active={user.is_active}>
                        {user.is_active ? "Activ" : "Inactiv"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {formatDate(user.last_session_at)}
                    </td>
                    <td className="px-4 py-4 text-right font-bold">
                      {user.active_sessions}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/admin/settings/utilizatori/${user.id}`}
                        className="rounded-full border border-subtle px-4 py-2 text-xs font-black transition hover:border-action hover:bg-action hover:text-on-action"
                      >
                        Vezi
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 ? (
            <p className="border-t border-subtle p-5 text-sm text-muted">
              Nu am găsit utilizatori pentru filtrul ales.
            </p>
          ) : null}
        </div>
      </section>
    </AccountStaticShell>
  );
}
