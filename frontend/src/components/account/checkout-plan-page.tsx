"use client";

import Link from "next/link";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { CheckoutDisclosure } from "@/components/legal/checkout-disclosure";
import type { SubscriptionPlan } from "@/lib/plans-api";

type CheckoutPlanPageProps = {
  plan: SubscriptionPlan;
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" />
    </svg>
  );
}

function formatPlanPrice(value: SubscriptionPlan["price_ron"]) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(".", ",");
}

function billingPeriod(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "lunară";
  if (normalized.includes("an")) return "anuală";
  return interval;
}

function billingNote(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "RON / lună";
  if (normalized.includes("an")) return "RON / an";
  return `RON / ${interval}`;
}

function paymentFrequency(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "Lunar, cu reînnoire automată";
  if (normalized.includes("an")) return "Anual, cu reînnoire automată";
  return `${interval}, cu reînnoire automată`;
}

function uniqueFeatures(plan: SubscriptionPlan) {
  const sortedFeatures = [...plan.features].sort(
    (first, second) => first.sort_order - second.sort_order,
  );
  const seen = new Set<string>();

  return [
    plan.material_limit,
    plan.ai_level,
    plan.storage,
    ...sortedFeatures.map((feature) => feature.label),
  ].filter((feature) => {
    const normalized = feature.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function CheckoutPlanPage({ plan }: CheckoutPlanPageProps) {
  const price = formatPlanPrice(plan.price_ron);
  const oldPrice = plan.old_price_ron ? formatPlanPrice(plan.old_price_ron) : "";
  const isFree = Number(plan.price_ron) === 0;
  const features = uniqueFeatures(plan);
  const period = billingPeriod(plan.billing_interval);

  return (
    <AccountStaticShell activePage="upgrade">
      <div className="space-y-5">
        <Link
          href="/upgrade"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-content"
        >
          <span aria-hidden="true">←</span>
          Înapoi la abonamente
        </Link>

        <section className="overflow-hidden rounded-[2rem] border border-subtle bg-surface">
          <div className="grid gap-0 lg:grid-cols-[1fr_0.85fr]">
            <div className="p-5 sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-muted">
                Confirmare abonament
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
                Verifică planul înainte de plată.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
                Ai aici sumarul planului, prețul, beneficiile și informațiile
                obligatorii înainte să continui către procesatorul de plată.
              </p>

              <div className="mt-8 rounded-[1.75rem] border border-subtle bg-app p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                      Plan ales
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-semibold">
                      {plan.name}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                      {plan.description}
                    </p>
                  </div>

                  {plan.discount_label ? (
                    <span className="rounded-full border border-success-border bg-success-soft px-3 py-1 text-xs font-black text-success">
                      {plan.discount_label}
                    </span>
                  ) : null}
                </div>

                <div className="mt-8 flex flex-wrap items-end gap-x-3 gap-y-2">
                  {oldPrice ? (
                    <span className="pb-2 text-lg font-black text-muted line-through">
                      {oldPrice}
                    </span>
                  ) : null}
                  <span className="font-serif text-6xl font-semibold leading-none">
                    {price}
                  </span>
                  <span className="pb-2 text-sm font-bold text-muted">
                    {isFree ? "RON gratuit" : billingNote(plan.billing_interval)}
                  </span>
                </div>

                <div className="my-6 h-px bg-subtle" />

                <ul className="grid gap-3 text-sm sm:grid-cols-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                        <CheckIcon />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="border-t border-subtle bg-app p-5 sm:p-8 lg:border-l lg:border-t-0">
              <CheckoutDisclosure
                planName={plan.name}
                price={price}
                period={period}
                paymentFrequency={paymentFrequency(plan.billing_interval)}
                className="bg-surface"
              />

              <div className="mt-5 rounded-[1.5rem] border border-subtle bg-surface p-4 text-sm leading-6 text-muted">
                <p className="font-black text-content">Ce urmează?</p>
                <p className="mt-2">
                  După confirmare vei fi trimis către pagina de plată. Planul
                  devine activ după finalizarea tranzacției.
                </p>
              </div>

              {isFree ? (
                <Link
                  href="/myaccount"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-content px-5 py-3 text-sm font-black text-app transition hover:opacity-90"
                >
                  Continuă în cont
                </Link>
              ) : (
                <Link
                  href={`/checkout/${plan.slug}/payment`}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-content px-5 py-3 text-sm font-black text-app transition hover:opacity-90"
                >
                  Continuă către plată
                </Link>
              )}
            </aside>
          </div>
        </section>
      </div>
    </AccountStaticShell>
  );
}
