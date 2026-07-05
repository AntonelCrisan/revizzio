"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { createCheckoutSession, PaymentsApiError } from "@/lib/payments-api";
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
  if (normalized.includes("lun")) return "Lunar";
  if (normalized.includes("an")) return "Anual";
  return interval;
}

function paymentFrequency(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "Lunar, reînnoire automată";
  if (normalized.includes("an")) return "Anual, reînnoire automată";
  return `${interval}, reînnoire automată`;
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

function paymentErrorMessage(error: unknown) {
  if (error instanceof PaymentsApiError) {
    if (error.status === 401) {
      return "Trebuie să fii autentificat ca să activezi un abonament.";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Plata nu a putut fi pornită momentan.";
}

export function CheckoutPlanPage({ plan }: CheckoutPlanPageProps) {
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const price = formatPlanPrice(plan.price_ron);
  const isFree = Number(plan.price_ron) === 0;
  const hasStripePrice = Boolean(plan.stripe_price_id);
  const canStartPayment = !isFree && hasStripePrice && !isStartingPayment;
  const features = uniqueFeatures(plan).slice(0, 4);
  const period = billingPeriod(plan.billing_interval);

  async function startPayment() {
    if (!canStartPayment) return;
    setIsStartingPayment(true);
    setErrorMessage(null);

    try {
      const checkoutSession = await createCheckoutSession(plan.slug);
      window.location.assign(checkoutSession.checkout_url);
    } catch (error) {
      setErrorMessage(paymentErrorMessage(error));
      setIsStartingPayment(false);
    }
  }

  return (
    <AccountStaticShell activePage="upgrade">
      <div className="grid gap-8 lg:grid-cols-[1fr_23rem] lg:items-start">
        <section>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 text-sm font-bold text-muted transition hover:text-content"
          >
            <span aria-hidden="true">←</span>
            Înapoi la abonamente
          </Link>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.22em] text-warning">
            Confirmare abonament
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Verifică planul înainte de plată.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Totul este transparent: planul ales, prețul și beneficiile incluse.
            Plata se face securizat prin Stripe.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-subtle bg-surface p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                {plan.discount_label ? (
                  <span className="rounded bg-warning-soft px-3 py-1 text-[10px] font-black uppercase text-warning">
                    {plan.discount_label}
                  </span>
                ) : null}
                <h2 className="mt-3 font-serif text-3xl font-semibold">
                  {plan.name}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
                  {plan.description}
                </p>
              </div>

              <p className="text-right">
                <span className="block font-serif text-5xl font-semibold leading-none">
                  {price}
                </span>
                <span className="text-sm text-muted">
                  {isFree ? "RON" : "RON / lună"}
                </span>
              </p>
            </div>

            <div className="my-6 h-px bg-subtle" />

            <ul className="grid gap-3 text-sm sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <span className="mt-0.5 text-success">
                    <CheckIcon />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <aside className="rounded-[1.5rem] border border-subtle bg-surface p-6 shadow-lg shadow-black/10 lg:sticky lg:top-6">
          <h2 className="text-lg font-black">Sumar Plată</h2>

          <dl className="mt-6 space-y-0 text-sm">
            {[
              ["Plan selectat", `${plan.name} (${period})`],
              ["Monedă plată", "RON"],
              ["TVA inclus", "Da, dacă este aplicabil"],
              ["Frecvență plată", paymentFrequency(plan.billing_interval)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-subtle py-4"
              >
                <dt className="text-muted">{label}</dt>
                <dd className="text-right text-xs font-black">{value}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-5">
              <dt className="font-black">Preț Total</dt>
              <dd className="text-lg font-black">{price} RON</dd>
            </div>
          </dl>

          <div className="rounded-2xl bg-app p-4 text-xs leading-6 text-muted">
            <p className="font-black text-content">Ce urmează?</p>
            <p className="mt-2">
              După plată, planul devine activ imediat. Îl poți schimba sau
              anula din cont.
            </p>
          </div>

          {!hasStripePrice && !isFree ? (
            <p className="mt-4 rounded-2xl border border-warning-border bg-warning-soft px-4 py-3 text-sm font-bold text-warning">
              Planul nu are încă un Stripe Price ID configurat în administrare.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
              {errorMessage}
            </p>
          ) : null}

          {isFree ? (
            <Link
              href="/myaccount"
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-content px-5 py-3 text-sm font-black text-app transition hover:opacity-90"
            >
              Continuă în cont
            </Link>
          ) : (
            <button
              type="button"
              onClick={startPayment}
              disabled={!canStartPayment}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-content px-5 py-3 text-sm font-black text-app transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isStartingPayment
                ? "Se pregătește checkout-ul..."
                : "Continuă către plată securizată →"}
            </button>
          )}

          <p className="mt-5 text-center text-[10px] leading-5 text-muted">
            Prin apăsarea butonului, ești de acord cu{" "}
            <Link href="/termeni-si-conditii" className="underline">
              Termenii și Condițiile
            </Link>
            . Informații despre retragere sunt în politica de contract.
          </p>
        </aside>
      </div>
    </AccountStaticShell>
  );
}
