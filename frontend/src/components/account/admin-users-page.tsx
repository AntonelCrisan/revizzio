"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { TablePagination } from "@/components/account/table-pagination";
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

const USERS_PAGE_SIZE = 10;

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

function StatusBadge({
  active,
  children,
}: {
  active: boolean;
  children: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        active
          ? "border-success-border bg-success-soft text-success"
          : "border-danger-border bg-danger-soft text-danger"
      }`}
    >
      {children}
    </span>
  );
}

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        role === "admin"
          ? "border-action bg-action text-on-action"
          : "border-subtle bg-app text-muted"
      }`}
    >
      {roleLabel(role)}
    </span>
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

export function AdminUsersPage({ initialUsers }: AdminUsersPageProps) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchableName = user.full_name || "";
      const matchesSearch =
        !normalizedSearch ||
        searchableName.toLowerCase().includes(normalizedSearch) ||
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
  const activeUsers = users.filter((user) => user.is_active).length;
  const activeSessions = users.reduce(
    (total, user) => total + user.active_sessions,
    0,
  );
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedUsers = useMemo(() => {
    const start = (safeCurrentPage - 1) * USERS_PAGE_SIZE;
    return filteredUsers.slice(start, start + USERS_PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

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
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/settings"
              className="mb-5 flex w-fit items-center rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Setări admin
            </Link>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Utilizatori
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Conturi platformă.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Caută conturi, verifică roluri și intră rapid în detaliile fiecărui
              utilizator.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshUsers}
            disabled={isRefreshing}
            className="inline-flex w-fit items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "Se actualizează..." : "Actualizează"}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <UserMetric
            label="Conturi"
            value={String(users.length)}
            detail={`${activeUsers} active`}
          />
          <UserMetric
            label="Administratori"
            value={String(adminCount)}
            detail="cu acces extins"
          />
          <UserMetric
            label="Sesiuni active"
            value={String(activeSessions)}
            detail="în acest moment"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="rounded-xl border border-subtle bg-surface p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label className="min-w-0">
              <span className="sr-only">Caută utilizatori</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Caută după nume, email sau ID..."
                className="h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {userFilters.map((item) => {
                const isActive = filter === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setFilter(item.value);
                      setCurrentPage(1);
                    }}
                    className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                      isActive
                        ? "border-action bg-action text-on-action"
                        : "border-subtle bg-app text-muted hover:bg-surface-hover hover:text-content"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-subtle bg-surface">
          <div className="data-table-scroll max-h-[34rem] overflow-auto">
            <table className="w-full min-w-[980px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-subtle bg-surface text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-5 py-4">Nume</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Rol</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Creat</th>
                  <th className="px-5 py-4">Ultima sesiune</th>
                  <th className="px-5 py-4 text-right">Sesiuni</th>
                  <th className="px-5 py-4 text-right">Acțiune</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-surface-hover/45"
                  >
                    <td className="px-5 py-4">
                      <span className="block font-black text-content">
                        {user.full_name || "Fără nume"}
                      </span>
                      <span className="mt-1 block max-w-56 truncate text-xs text-muted">
                        {user.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">{user.email}</td>
                    <td className="px-5 py-4">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge active={user.is_active}>
                        {user.is_active ? "Activ" : "Inactiv"}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {formatDate(user.last_session_at)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-content">
                      {user.active_sessions}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/settings/utilizatori/${user.id}`}
                        className="inline-flex rounded-full border border-subtle bg-app px-4 py-2 text-xs font-black text-content transition hover:border-action hover:bg-action hover:text-on-action"
                      >
                        Detalii
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
          <TablePagination
            currentPage={safeCurrentPage}
            pageCount={pageCount}
            pageSize={USERS_PAGE_SIZE}
            totalItems={filteredUsers.length}
            itemLabel="utilizatori"
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
    </AccountStaticShell>
  );
}
