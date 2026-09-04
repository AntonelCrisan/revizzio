"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { TablePagination } from "@/components/account/table-pagination";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "@/lib/toast-store";
import {
  listSubscriptionInvoices,
  type SubscriptionInvoice,
} from "@/lib/payments-api";
import { InvoicesPageSkeletonBody } from "@/components/account/account-page-skeletons";

const INVOICES_PAGE_SIZE = 8;

function formatInvoiceAmount(invoice: SubscriptionInvoice) {
  const amount = invoice.amount_paid || invoice.amount_due;
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: invoice.currency || "RON",
  }).format(amount / 100);
}

function formatInvoiceDate(value: string | null) {
  if (!value) return "În așteptare";
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "Plătită";
  if (normalized === "open") return "Deschisă";
  if (normalized === "draft") return "Draft";
  if (normalized === "void") return "Anulată";
  if (normalized === "uncollectible") return "Neîncasabilă";
  return status || "Necunoscut";
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") {
    return "border-success-border bg-success-soft text-success";
  }
  if (normalized === "open" || normalized === "draft") {
    return "border-warning-border bg-warning-soft text-warning";
  }
  if (normalized === "void" || normalized === "uncollectible") {
    return "border-danger-border bg-danger-soft text-danger";
  }
  return "border-subtle bg-surface-hover text-muted";
}

export function BillingInvoicesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasLoadFailed, setHasLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pageCount = Math.max(
    1,
    Math.ceil(invoices.length / INVOICES_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, pageCount);
  const paginatedInvoices = useMemo(() => {
    const start = (safeCurrentPage - 1) * INVOICES_PAGE_SIZE;
    return invoices.slice(start, start + INVOICES_PAGE_SIZE);
  }, [invoices, safeCurrentPage]);

  const refreshInvoices = useCallback(() => {
    if (!user) return;

    setIsLoading(true);
    setHasLoadFailed(false);
    listSubscriptionInvoices()
      .then(setInvoices)
      .catch(() => {
        setHasLoadFailed(true);
        toast.error("Facturile nu au putut fi încărcate momentan.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (isAuthLoading || !user) return;
    let isMounted = true;

    listSubscriptionInvoices()
      .then((nextInvoices) => {
        if (!isMounted) return;
        setInvoices(nextInvoices);
        setHasLoadFailed(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setHasLoadFailed(true);
        toast.error("Facturile nu au putut fi încărcate momentan.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, user]);

  return (
    <AccountStaticShell activePage="billing-invoices"
      loadingBody={<InvoicesPageSkeletonBody />}>
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-md border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Facturi
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Istoric plăți.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Facturile Stripe pentru abonamentul tău.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/upgrade"
              className="inline-flex items-center rounded-md border border-subtle bg-surface px-4 py-2 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              Planuri
            </Link>
            <button
              type="button"
              onClick={refreshInvoices}
              className="rounded-md border border-subtle bg-surface px-4 py-2 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              Reîncarcă
            </button>
          </div>
        </div>

        <div className="overflow-hidden border-y border-subtle">
          {isLoading ? (
            <div className="py-6 text-sm font-semibold text-muted">
              Se încarcă facturile...
            </div>
          ) : hasLoadFailed ? (
            <div className="py-6 text-sm font-semibold text-danger">
              Lista nu a putut fi încărcată. Apasă „Reîncarcă” ca să încerci
              din nou.
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-6 text-sm text-muted">
              Nu există încă facturi pentru contul tău.
            </div>
          ) : (
            <div className="data-table-scroll max-h-[34rem] overflow-auto divide-y divide-subtle">
              <div className="hidden grid-cols-[1.25fr_0.65fr_0.65fr_auto] gap-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-muted sm:grid">
                <span>Factură</span>
                <span>Valoare</span>
                <span>Status</span>
                <span className="text-right">Acțiuni</span>
              </div>

              {paginatedInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid gap-4 py-5 text-sm transition hover:bg-surface-hover/45 sm:grid-cols-[1.25fr_0.65fr_0.65fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-base font-black tracking-tight">
                      {invoice.number ?? invoice.stripe_invoice_id}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatInvoiceDate(invoice.paid_at ?? invoice.created_at)}
                    </p>
                  </div>
                  <p className="text-base font-black">
                    {formatInvoiceAmount(invoice)}
                  </p>
                  <span
                    className={`w-fit rounded-md border px-3 py-1 text-xs font-black ${statusClass(
                      invoice.status,
                    )}`}
                  >
                    {statusLabel(invoice.status)}
                  </span>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-action px-4 py-2 text-sm font-black text-on-action transition hover:bg-action-hover"
                      >
                        Vezi factura
                      </a>
                    ) : null}
                    {invoice.invoice_pdf_url ? (
                      <a
                        href={invoice.invoice_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-subtle bg-surface px-4 py-2 text-sm font-black transition hover:bg-surface-hover"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && !hasLoadFailed ? (
            <TablePagination
              currentPage={safeCurrentPage}
              pageCount={pageCount}
              pageSize={INVOICES_PAGE_SIZE}
              totalItems={invoices.length}
              itemLabel="facturi"
              onPageChange={setCurrentPage}
            />
          ) : null}
        </div>
      </section>
    </AccountStaticShell>
  );
}
