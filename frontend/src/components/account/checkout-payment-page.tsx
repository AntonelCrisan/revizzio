"use client";

import Link from "next/link";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import type { SubscriptionPlan } from "@/lib/plans-api";

type CheckoutPaymentPageProps = {
  plan: SubscriptionPlan;
};

function formatPlanPrice(value: SubscriptionPlan["price_ron"]) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(".", ",");
}

export function CheckoutPaymentPage({ plan }: CheckoutPaymentPageProps) {
  const price = formatPlanPrice(plan.price_ron);

  return (
    <AccountStaticShell activePage="upgrade">
      <div className="mx-auto max-w-3xl space-y-5">
        <Link
          href={`/checkout/${plan.slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-content"
        >
          <span aria-hidden="true">←</span>
          Înapoi la confirmare
        </Link>

        <section className="rounded-[2rem] border border-subtle bg-surface p-5 text-center sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-soft text-success">
            <svg
              aria-hidden="true"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3 20 7v5c0 5-3.4 8.5-8 9-4.6-.5-8-4-8-9V7l8-4z" />
              <path d="M9.5 12.5 11 14l3.5-4" />
            </svg>
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-muted">
            Plată securizată
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">
            Activează planul {plan.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
            Aici conectăm procesatorul de plată. Pentru moment pagina confirmă
            că fluxul ajunge corect după ecranul cu informații înainte de plată.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-[1.5rem] border border-subtle bg-app p-5 text-left">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Plan
                </p>
                <p className="mt-1 text-lg font-black">{plan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                  Total
                </p>
                <p className="mt-1 text-lg font-black">{price} RON</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mt-8 inline-flex w-full max-w-md items-center justify-center rounded-full bg-content px-5 py-3 text-sm font-black text-app opacity-70"
            disabled
          >
            Procesatorul de plată va fi conectat aici
          </button>
        </section>
      </div>
    </AccountStaticShell>
  );
}
