"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type AuditLog,
  type AuditLogStatus,
  getAdminAuditLogs,
} from "@/lib/admin-audit-api";

type AdminAuditLogsPageProps = {
  initialLogs: AuditLog[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actorLabel(log: AuditLog) {
  if (log.actor_name && log.actor_email) {
    return `${log.actor_name} <${log.actor_email}>`;
  }
  return log.actor_email || log.actor_name || "Sistem";
}

function statusLabel(status: AuditLogStatus) {
  return status === "success" ? "Succes" : "Eroare";
}

function statusClass(status: AuditLogStatus) {
  return status === "success"
    ? "bg-success-soft text-success"
    : "bg-danger-soft text-danger";
}

function resourceLabel(log: AuditLog) {
  if (!log.resource_type && !log.resource_id) return "-";
  if (!log.resource_id) return log.resource_type ?? "-";
  return `${log.resource_type ?? "resursă"} / ${log.resource_id}`;
}

export function AdminAuditLogsPage({ initialLogs }: AdminAuditLogsPageProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AuditLogStatus | "">("");
  const [action, setAction] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesStatus = !status || log.status === status;
      const matchesAction = !action || log.action === action;
      const matchesSearch =
        !normalizedSearch ||
        actorLabel(log).toLowerCase().includes(normalizedSearch) ||
        log.action.toLowerCase().includes(normalizedSearch) ||
        resourceLabel(log).toLowerCase().includes(normalizedSearch) ||
        (log.ip_address ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesAction && matchesSearch;
    });
  }, [action, logs, search, status]);

  async function refreshLogs() {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      setLogs(await getAdminAuditLogs({ limit: 200 }));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Jurnalul de activitate nu a putut fi încărcat.",
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
              Jurnal activitate
            </h1>
            <p className="mt-2 text-sm text-muted">
              Ultimele {logs.length} evenimente administrative și de cont.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshLogs}
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

        <div className="grid gap-3 lg:grid-cols-[1fr_220px_260px]">
          <label>
            <span className="sr-only">Caută în jurnal</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Caută după actor, acțiune, resursă sau IP..."
              className="h-12 w-full rounded-2xl border border-subtle bg-surface px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as AuditLogStatus | "")}
            className="h-12 rounded-2xl border border-subtle bg-surface px-4 text-sm font-bold text-content outline-none transition focus:border-action"
          >
            <option value="">Toate statusurile</option>
            <option value="success">Succes</option>
            <option value="failure">Eroare</option>
          </select>

          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="h-12 rounded-2xl border border-subtle bg-surface px-4 text-sm font-bold text-content outline-none transition focus:border-action"
          >
            <option value="">Toate acțiunile</option>
            {actions.map((currentAction) => (
              <option key={currentAction} value={currentAction}>
                {currentAction}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-subtle bg-surface">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
              <thead className="border-b border-subtle bg-app text-xs font-black uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th className="px-4 py-3">Dată</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Acțiune</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Resursă</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Detalii</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-subtle align-top last:border-b-0 hover:bg-surface-hover"
                  >
                    <td className="whitespace-nowrap px-4 py-4 text-muted">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="max-w-[260px] break-words px-4 py-4 font-bold">
                      {actorLabel(log)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-mono text-xs">
                      {log.action}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${statusClass(
                          log.status,
                        )}`}
                      >
                        {statusLabel(log.status)}
                      </span>
                    </td>
                    <td className="max-w-[260px] break-words px-4 py-4 text-muted">
                      {resourceLabel(log)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-muted">
                      {log.ip_address ?? "-"}
                    </td>
                    <td className="min-w-[280px] px-4 py-4">
                      <details>
                        <summary className="cursor-pointer text-xs font-black text-content">
                          Vezi
                        </summary>
                        <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-app p-3 text-xs leading-5 text-muted">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 ? (
            <p className="border-t border-subtle p-5 text-sm text-muted">
              Nu există loguri pentru filtrele alese.
            </p>
          ) : null}
        </div>
      </section>
    </AccountStaticShell>
  );
}
