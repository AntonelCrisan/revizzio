"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { TablePagination } from "@/components/account/table-pagination";
import {
  type AuditLog,
  type AuditLogStatus,
  getAdminAuditLogs,
} from "@/lib/admin-audit-api";

type AdminAuditLogsPageProps = {
  initialLogs: AuditLog[];
};

const AUDIT_LOGS_PAGE_SIZE = 10;

const statusFilters: Array<{ value: AuditLogStatus | ""; label: string }> = [
  { value: "", label: "Toate" },
  { value: "success", label: "Succes" },
  { value: "failure", label: "Erori" },
];

const auditActionLabels: Record<string, string> = {
  "admin.subscription_plans.updated": "Planurile de abonament au fost actualizate",
  "admin.user.delete": "Utilizator sters",
  "admin.user.update": "Utilizator actualizat",
  "admin.user.verification_email_failed": "Email de verificare esuat",
  "admin.user.verification_email_requested": "Email de verificare trimis",
  "auth.email_verified_and_registered": "Email verificat si cont creat",
  "auth.email_verified_existing_user": "Email verificat pentru cont existent",
  "auth.logged_in": "Autentificare reusita",
  "auth.logged_out": "Delogare",
  "auth.login_blocked_pending_email_confirmation":
    "Autentificare blocata pana la confirmarea emailului",
  "auth.login_failed": "Autentificare esuata",
  "auth.logout_failed": "Delogare esuata",
  "auth.password_reset_completed": "Parola resetata",
  "auth.password_reset_duplicate_confirm_ignored":
    "Confirmare duplicata resetare parola ignorata",
  "auth.password_reset_email_failed": "Email resetare parola esuat",
  "auth.password_reset_requested": "Resetare parola solicitata",
  "auth.password_reset_requested_ignored": "Resetare parola ignorata",
  "auth.password_reset_request_ignored_active_token":
    "Resetare parola ignorata, token activ",
  "auth.register_failed": "Inregistrare esuata",
  "auth.registration_email_failed": "Email de confirmare inregistrare esuat",
  "auth.registration_verification_requested":
    "Email de confirmare inregistrare trimis",
  "stripe.checkout_session.created": "Checkout Stripe creat",
  "stripe.checkout_session.failed": "Checkout Stripe esuat",
  "stripe.customer.subscription.created": "Abonament Stripe creat",
  "stripe.customer.subscription.deleted": "Abonament Stripe anulat",
  "stripe.customer.subscription.updated": "Abonament Stripe actualizat",
  "stripe.invoice.paid": "Factura Stripe platita",
  "stripe.invoice.payment_failed": "Plata factura Stripe esuata",
  "stripe.webhook.failed": "Webhook Stripe esuat",
  "user.preferences.updated": "Preferinte utilizator actualizate",
};

function formatDate(value: string | null) {
  if (!value) return "Niciodată";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "necunoscut";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
    ? "border-success-border bg-success-soft text-success"
    : "border-danger-border bg-danger-soft text-danger";
}

function fallbackActionLabel(action: string) {
  return action
    .replace(/[_:.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (firstLetter) => firstLetter.toUpperCase());
}

function actionLabel(action: string) {
  return auditActionLabels[action] ?? fallbackActionLabel(action);
}

function resourceLabel(log: AuditLog) {
  if (!log.resource_type && !log.resource_id) return "-";
  if (!log.resource_id) return log.resource_type ?? "-";
  return `${log.resource_type ?? "resursă"} / ${log.resource_id}`;
}

function LogMetric({
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

export function AdminAuditLogsPage({ initialLogs }: AdminAuditLogsPageProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AuditLogStatus | "">("");
  const [action, setAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const actions = useMemo(
    () =>
      Array.from(new Set(logs.map((log) => log.action))).sort((first, second) =>
        actionLabel(first).localeCompare(actionLabel(second), "ro"),
      ),
    [logs],
  );
  const successCount = logs.filter((log) => log.status === "success").length;
  const failureCount = logs.filter((log) => log.status === "failure").length;
  const latestLog = logs[0] ?? null;

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesStatus = !status || log.status === status;
      const matchesAction = !action || log.action === action;
      const matchesSearch =
        !normalizedSearch ||
        actorLabel(log).toLowerCase().includes(normalizedSearch) ||
        log.action.toLowerCase().includes(normalizedSearch) ||
        actionLabel(log.action).toLowerCase().includes(normalizedSearch) ||
        resourceLabel(log).toLowerCase().includes(normalizedSearch) ||
        (log.ip_address ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesAction && matchesSearch;
    });
  }, [action, logs, search, status]);

  const pageCount = Math.max(
    1,
    Math.ceil(filteredLogs.length / AUDIT_LOGS_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * AUDIT_LOGS_PAGE_SIZE;
    return filteredLogs.slice(start, start + AUDIT_LOGS_PAGE_SIZE);
  }, [filteredLogs, safeCurrentPage]);

  async function refreshLogs() {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      setLogs(await getAdminAuditLogs({ limit: 200 }));
      setCurrentPage(1);
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
              Audit
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Jurnal activitate.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Evenimente administrative, acțiuni de cont și erori importante din
              platformă.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshLogs}
            disabled={isRefreshing}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4" />
            </svg>
            <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <LogMetric
            label="Evenimente"
            value={String(logs.length)}
            detail={`${filteredLogs.length} afișate`}
          />
          <LogMetric
            label="Succes"
            value={String(successCount)}
            detail={`${failureCount} erori`}
          />
          <LogMetric
            label="Ultimul log"
            value={formatDate(latestLog?.created_at ?? null)}
            detail={
              latestLog ? actionLabel(latestLog.action) : "fără evenimente"
            }
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="rounded-xl border border-subtle bg-surface p-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_18rem] xl:items-center">
            <label className="min-w-0">
              <span className="sr-only">Caută în jurnal</span>
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Caută după actor, acțiune, resursă sau IP..."
                className="h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => {
                const isActive = status === item.value;

                return (
                  <button
                    key={item.value || "all"}
                    type="button"
                    onClick={() => {
                      setStatus(item.value);
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

            <label className="min-w-0">
              <span className="sr-only">Filtrează după acțiune</span>
              <select
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setCurrentPage(1);
                }}
                className="h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm font-bold text-content outline-none transition focus:border-action"
              >
                <option value="">Toate acțiunile</option>
                {actions.map((currentAction) => (
                  <option key={currentAction} value={currentAction}>
                    {actionLabel(currentAction)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-subtle bg-surface">
          <div className="data-table-scroll max-h-[34rem] overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-subtle bg-surface text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-5 py-4">Dată</th>
                  <th className="px-5 py-4">Actor</th>
                  <th className="px-5 py-4">Acțiune</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Resursă</th>
                  <th className="px-5 py-4">IP</th>
                  <th className="px-5 py-4">Detalii</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="align-top transition hover:bg-surface-hover/45"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="max-w-[280px] break-words px-5 py-4 font-bold text-content">
                      {actorLabel(log)}
                    </td>
                    <td className="max-w-[300px] px-5 py-4">
                      <span className="block font-bold text-content">
                        {actionLabel(log.action)}
                      </span>
                      <span className="mt-1 block break-all font-mono text-[11px] text-muted">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${statusClass(
                          log.status,
                        )}`}
                      >
                        {statusLabel(log.status)}
                      </span>
                    </td>
                    <td className="max-w-[280px] break-words px-5 py-4 text-muted">
                      {resourceLabel(log)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {log.ip_address ?? "-"}
                    </td>
                    <td className="min-w-[300px] px-5 py-4">
                      <details>
                        <summary className="cursor-pointer text-xs font-black text-content">
                          Vezi detalii
                        </summary>
                        <pre className="data-table-scroll mt-3 max-h-72 overflow-auto rounded-lg border border-subtle bg-app p-3 text-xs leading-5 text-muted">
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
          <TablePagination
            currentPage={safeCurrentPage}
            pageCount={pageCount}
            pageSize={AUDIT_LOGS_PAGE_SIZE}
            totalItems={filteredLogs.length}
            itemLabel="loguri"
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
    </AccountStaticShell>
  );
}
