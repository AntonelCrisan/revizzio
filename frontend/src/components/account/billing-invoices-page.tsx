"use client";

import { useCallback, useEffect, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { useAuth } from "@/components/auth/auth-provider";
import {
  listSubscriptionInvoices,
  type SubscriptionInvoice,
} from "@/lib/payments-api";

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

export function BillingInvoicesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshInvoices = useCallback(() => {
    if (!user) return;

    setIsLoading(true);
    setErrorMessage(null);
    listSubscriptionInvoices()
      .then(setInvoices)
      .catch(() => {
        setErrorMessage("Facturile nu au putut fi încărcate momentan.");
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
        setErrorMessage(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage("Facturile nu au putut fi încărcate momentan.");
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
    <AccountStaticShell activePage="billing-invoices">
      <section className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-warning">
              Facturi
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
              Plăți recente.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
              Istoricul plăților procesate prin Stripe, cu link direct către
              factură și PDF.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshInvoices}
            className="rounded-xl border border-subtle bg-surface px-5 py-3 text-sm font-black transition hover:bg-surface-hover"
          >
            Reîncarcă lista
          </button>
        </div>

        <div className="overflow-hidden border-y border-subtle">
          {isLoading ? (
            <div className="py-6 text-sm font-semibold text-muted">
              Se încarcă facturile...
            </div>
          ) : errorMessage ? (
            <div className="py-6 text-sm font-semibold text-danger">
              {errorMessage}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-6 text-sm text-muted">
              Nu există încă facturi pentru contul tău.
            </div>
          ) : (
            <div className="divide-y divide-subtle">
              <div className="hidden grid-cols-[1.2fr_0.7fr_0.7fr_auto] gap-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-muted sm:grid">
                <span>Factură</span>
                <span>Valoare</span>
                <span>Status</span>
                <span className="text-right">Acțiuni</span>
              </div>

              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid gap-4 py-5 text-sm sm:grid-cols-[1.2fr_0.7fr_0.7fr_auto] sm:items-center"
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
                  <span className="w-fit rounded-full bg-success-soft px-3 py-1 text-xs font-black text-success">
                    {statusLabel(invoice.status)}
                  </span>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-content px-4 py-2 text-sm font-black text-app transition hover:opacity-90"
                      >
                        Vezi factura
                      </a>
                    ) : null}
                    {invoice.invoice_pdf_url ? (
                      <a
                        href={invoice.invoice_pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-subtle bg-surface px-4 py-2 text-sm font-black transition hover:bg-surface-hover"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AccountStaticShell>
  );
}
