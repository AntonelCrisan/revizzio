"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { TablePagination } from "@/components/account/table-pagination";
import {
  type VisitorStats,
  type VisitorVisit,
  getAdminVisitorStats,
  getAdminVisitorVisits,
} from "@/lib/admin-audit-api";

type AdminVisitorVisitsPageProps = {
  initialVisits: VisitorVisit[];
  initialStats: VisitorStats | null;
};

const numberFormatter = new Intl.NumberFormat("ro-RO");
const VISITS_PAGE_SIZE = 15;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "necunoscut";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function truncateHash(hash: string) {
  return hash.length > 16 ? `${hash.slice(0, 16)}…` : hash;
}

function VisitorMetric({
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

export function AdminVisitorVisitsPage({
  initialVisits,
  initialStats,
}: AdminVisitorVisitsPageProps) {
  const [visits, setVisits] = useState(initialVisits);
  const [stats, setStats] = useState(initialStats);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const pageCount = Math.max(1, Math.ceil(visits.length / VISITS_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedVisits = useMemo(() => {
    const start = (safeCurrentPage - 1) * VISITS_PAGE_SIZE;
    return visits.slice(start, start + VISITS_PAGE_SIZE);
  }, [visits, safeCurrentPage]);

  async function refreshVisits() {
    setIsRefreshing(true);
    setErrorMessage("");

    try {
      const [nextVisits, nextStats] = await Promise.all([
        getAdminVisitorVisits({ limit: 200 }),
        getAdminVisitorStats().catch(() => null),
      ]);
      setVisits(nextVisits);
      setStats(nextStats);
      setCurrentPage(1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Vizitele nu au putut fi încărcate.",
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
              Trafic
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Vizitatori fără cont.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Vizite anonime pe platformă, identificate printr-un hash
              nereversibil, rotit zilnic. Utilizatorii autentificați nu sunt
              numărați aici.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshVisits}
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <VisitorMetric
            label="Azi"
            value={stats ? numberFormatter.format(stats.visitors_today) : "-"}
            detail="vizitatori unici azi"
          />
          <VisitorMetric
            label="Ultimele 7 zile"
            value={
              stats ? numberFormatter.format(stats.visitors_last_7_days) : "-"
            }
            detail="vizitatori unici"
          />
          <VisitorMetric
            label="Ultimele 30 de zile"
            value={
              stats
                ? numberFormatter.format(stats.visitors_last_30_days)
                : "-"
            }
            detail="vizitatori unici"
          />
          <VisitorMetric
            label="Total"
            value={
              stats ? numberFormatter.format(stats.total_visitors) : "-"
            }
            detail="de la activarea urmăririi"
          />
        </div>

        {errorMessage ? (
          <p className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm font-bold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-subtle bg-surface">
          <div className="data-table-scroll max-h-[34rem] overflow-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-subtle bg-surface text-[10px] font-black uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-5 py-4">Dată</th>
                  <th className="px-5 py-4">Pagină</th>
                  <th className="px-5 py-4">Hash vizitator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {paginatedVisits.map((visit) => (
                  <tr
                    key={visit.id}
                    className="align-top transition hover:bg-surface-hover/45"
                  >
                    <td className="whitespace-nowrap px-5 py-4 text-muted">
                      {formatDate(visit.created_at)}
                    </td>
                    <td className="max-w-[280px] break-words px-5 py-4 font-bold text-content">
                      {visit.path || "-"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-mono text-[11px] text-muted">
                      {truncateHash(visit.visitor_hash)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visits.length === 0 ? (
            <p className="border-t border-subtle p-5 text-sm text-muted">
              Nu există vizite înregistrate momentan.
            </p>
          ) : null}
          <TablePagination
            currentPage={safeCurrentPage}
            pageCount={pageCount}
            pageSize={VISITS_PAGE_SIZE}
            totalItems={visits.length}
            itemLabel="vizite"
            onPageChange={setCurrentPage}
          />
        </section>
      </section>
    </AccountStaticShell>
  );
}
