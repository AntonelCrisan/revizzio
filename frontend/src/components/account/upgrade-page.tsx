"use client";

import Link from "next/link";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import type { SubscriptionPlan } from "@/lib/plans-api";

type UpgradePageProps = {
  plans: SubscriptionPlan[];
};

type UpgradePlan = {
  slug: string;
  name: string;
  price: string;
  oldPrice: string;
  note: string;
  description: string;
  discount: string;
  cta: string;
  paid: boolean;
  highlighted: boolean;
  features: string[];
};

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
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

function billingNote(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "RON / lună";
  if (normalized.includes("an")) return "RON / an";
  return `RON / ${interval}`;
}

function uniqueFeatures(features: string[]) {
  const seen = new Set<string>();
  return features.filter((feature) => {
    const normalized = feature.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function toUpgradePlans(plans: SubscriptionPlan[]): UpgradePlan[] {
  return [...plans]
    .filter((plan) => plan.is_visible)
    .sort((first, second) => first.sort_order - second.sort_order)
    .map((plan) => {
      const price = formatPlanPrice(plan.price_ron);
      const isFree = Number(plan.price_ron) === 0;
      const sortedFeatures = [...plan.features].sort(
        (first, second) => first.sort_order - second.sort_order,
      );

      return {
        slug: plan.slug,
        name: plan.name,
        price,
        oldPrice: plan.old_price_ron ? formatPlanPrice(plan.old_price_ron) : "",
        note: isFree ? "RON gratuit" : billingNote(plan.billing_interval),
        description: plan.description,
        discount: plan.discount_label ?? "",
        cta: isFree ? "Plan curent" : "Plătește și activează abonamentul",
        paid: !isFree,
        highlighted: plan.is_featured,
        features: uniqueFeatures([
          plan.material_limit,
          plan.ai_level,
          plan.storage,
          ...sortedFeatures.map((feature) => feature.label),
        ]),
      };
    });
}

export function UpgradePage({ plans }: UpgradePageProps) {
  const upgradePlans = toUpgradePlans(plans);

  return (
    <AccountStaticShell activePage="upgrade">
      <section className="overflow-hidden rounded-[2rem] border border-subtle bg-surface">
        <div className="relative bg-action px-6 py-8 text-center text-on-action sm:px-8 sm:py-12">
          <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-on-action/10" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-action/60">
            Abonament
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Mai mult spațiu pentru cursuri. Mai puțin haos în sesiune.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-on-action/70">
            Planul recomandat este poziționat ca alegerea principală: suficient
            de puternic pentru utilizare reală, fără costul unui plan mare.
          </p>
          <span className="mt-6 inline-flex rounded-full border border-success-border bg-success-soft px-4 py-2 text-xs font-bold text-success">
            Poți schimba sau anula planul oricând
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3 lg:items-stretch">
          {upgradePlans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-[1.75rem] border p-5 transition ${
                plan.highlighted
                  ? "border-action bg-action text-on-action shadow-2xl shadow-black/20 lg:-mt-5 lg:mb-5"
                  : "border-subtle bg-app"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute right-5 top-5 rounded-full bg-on-action px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-action">
                  Recomandat
                </span>
              ) : null}

              <p
                className={`text-xs font-bold uppercase tracking-[0.18em] ${
                  plan.highlighted ? "text-on-action/60" : "text-muted"
                }`}
              >
                {plan.name}
              </p>

              <p className="mt-8 flex flex-wrap items-end gap-x-2 gap-y-1">
                {plan.oldPrice ? (
                  <span
                    className={`pb-2 text-lg font-black line-through ${
                      plan.highlighted ? "text-on-action/45" : "text-muted"
                    }`}
                  >
                    {plan.oldPrice}
                  </span>
                ) : null}
                <span className="font-serif text-6xl font-semibold leading-none">
                  {plan.price}
                </span>
                <span
                  className={`pb-2 text-sm font-bold ${
                    plan.highlighted ? "text-on-action/65" : "text-muted"
                  }`}
                >
                  {plan.note}
                </span>
              </p>

              {plan.discount ? (
                <p
                  className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-black ${
                    plan.highlighted
                      ? "bg-on-action/12 text-on-action"
                      : "border border-success-border bg-success-soft text-success"
                  }`}
                >
                  {plan.discount}
                </p>
              ) : null}

              <p
                className={`mt-4 text-sm leading-6 ${
                  plan.highlighted ? "text-on-action/70" : "text-muted"
                }`}
              >
                {plan.description}
              </p>

              <div
                className={`my-6 h-px ${
                  plan.highlighted ? "bg-on-action/15" : "bg-subtle"
                }`}
              />

              <ul className="space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                        plan.highlighted
                          ? "bg-on-action/15 text-on-action"
                          : "bg-success-soft text-success"
                      }`}
                    >
                      <CheckIcon />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.paid ? (
                <Link
                  href={`/checkout/${plan.slug}`}
                  className={`mt-auto inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition ${
                    plan.highlighted
                      ? "bg-on-action text-action hover:bg-on-action/90"
                      : "border border-content bg-surface hover:bg-content hover:text-app"
                  }`}
                >
                  {plan.cta}
                </Link>
              ) : (
                <button
                  type="button"
                  className="mt-auto rounded-full border border-content bg-surface px-5 py-3 text-sm font-black transition hover:bg-content hover:text-app"
                >
                  {plan.cta}
                </button>
              )}
            </article>
          ))}
        </div>

        <div className="border-t border-subtle bg-app px-5 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Generare rapidă", "Pachetele se creează în câteva momente."],
              ["Datele rămân ale tale", "Materialele sunt legate de contul tău."],
              [
                "Gândit pentru studenți",
                "Prețuri în RON, simple de înțeles și comparat.",
              ],
            ].map(([title, description]) => (
              <div key={title} className="rounded-2xl bg-surface p-4">
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AccountStaticShell>
  );
}
