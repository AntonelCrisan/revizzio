"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { syncCheckoutSession } from "@/lib/payments-api";
import type { SubscriptionPlan } from "@/lib/plans-api";

type UpgradePageProps = {
  plans: SubscriptionPlan[];
  checkoutSessionId?: string;
  checkoutStatus?: string;
};

type UpgradePlan = {
  slug: string;
  name: string;
  title: string;
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

const CHECKOUT_SYNC_ATTEMPTS = 12;
const CHECKOUT_SYNC_INTERVAL_MS = 1500;

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

function billingSuffix(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "RON / lună";
  if (normalized.includes("an")) return "RON / an";
  return `RON / ${interval}`;
}

function planTitle(plan: SubscriptionPlan, index: number) {
  if (Number(plan.price_ron) === 0) return "Pentru început";
  if (plan.is_featured || index === 1) return "Studiu Activ";
  return "Fără Limite";
}

function planCta(plan: SubscriptionPlan) {
  if (Number(plan.price_ron) === 0) return "Plan gratuit inclus";
  if (plan.is_featured) return `Alege ${plan.name}`;
  return `Upgrade la ${plan.name}`;
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
    .map((plan, index) => {
      const isFree = Number(plan.price_ron) === 0;
      const sortedFeatures = [...plan.features].sort(
        (first, second) => first.sort_order - second.sort_order,
      );

      return {
        slug: plan.slug,
        name: plan.name,
        title: planTitle(plan, index),
        price: formatPlanPrice(plan.price_ron),
        oldPrice: plan.old_price_ron ? formatPlanPrice(plan.old_price_ron) : "",
        note: isFree ? "RON / permanent" : billingSuffix(plan.billing_interval),
        description: plan.description,
        discount: plan.discount_label ?? "",
        cta: planCta(plan),
        paid: !isFree,
        highlighted: plan.is_featured,
        features: uniqueFeatures([
          plan.material_limit,
          plan.ai_level,
          plan.storage,
          ...sortedFeatures.map((feature) => feature.label),
        ]).slice(0, 4),
      };
    });
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export function UpgradePage({
  plans,
  checkoutSessionId,
  checkoutStatus,
}: UpgradePageProps) {
  const router = useRouter();
  const { user, isLoading, setUser } = useAuth();
  const syncedCheckoutSessionRef = useRef<string | null>(null);
  const currentPlanSlug = user?.current_plan?.slug ?? "start";
  const upgradePlans = toUpgradePlans(plans);

  useEffect(() => {
    let isMounted = true;

    if (
      checkoutStatus !== "success" ||
      !checkoutSessionId ||
      isLoading ||
      !user ||
      syncedCheckoutSessionRef.current === checkoutSessionId
    ) {
      return () => {
        isMounted = false;
      };
    }

    const activeCheckoutSessionId = checkoutSessionId;

    async function syncCheckoutUntilConfirmed() {
      syncedCheckoutSessionRef.current = activeCheckoutSessionId;

      for (let attempt = 1; attempt <= CHECKOUT_SYNC_ATTEMPTS; attempt += 1) {
        try {
          const updatedUser = await syncCheckoutSession(activeCheckoutSessionId);
          if (!isMounted) return;

          setUser(updatedUser);
          router.refresh();
          return;
        } catch {
          if (!isMounted) return;

          if (attempt < CHECKOUT_SYNC_ATTEMPTS) {
            await wait(CHECKOUT_SYNC_INTERVAL_MS);
          }
        }
      }

      if (!isMounted) return;
      syncedCheckoutSessionRef.current = null;
    }

    void syncCheckoutUntilConfirmed();

    return () => {
      isMounted = false;
    };
  }, [checkoutSessionId, checkoutStatus, isLoading, router, setUser, user]);

  return (
    <AccountStaticShell activePage="upgrade">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Abonament
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Alege planul potrivit.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              Prețuri în RON, plan activ sincronizat prin Stripe.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-xs font-bold text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              <span className="text-content">
                {user?.current_plan?.name ?? "Start"}
              </span>
              activ
            </span>
            <Link
              href="/upgrade/facturi"
              className="inline-flex items-center rounded-full border border-subtle bg-surface px-4 py-2 text-xs font-bold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              Facturi
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {upgradePlans.map((plan) => {
            const isCurrentPlan = plan.slug === currentPlanSlug;
            const listBorderClass = plan.highlighted
              ? "divide-on-action/15 border-on-action/15"
              : "divide-subtle border-subtle";

            return (
              <article
                key={plan.slug}
                className={`relative flex min-h-[25rem] flex-col rounded-xl border p-6 ${
                  plan.highlighted
                    ? "border-action bg-action text-on-action"
                    : "border-subtle bg-surface text-content"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-xs font-black uppercase tracking-[0.18em] ${
                      plan.highlighted ? "text-on-action/65" : "text-muted"
                    }`}
                  >
                    {plan.name}
                  </p>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    {isCurrentPlan ? (
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                          plan.highlighted
                            ? "bg-on-action text-action"
                            : "bg-success-soft text-success"
                        }`}
                      >
                        Activ
                      </span>
                    ) : null}
                    {plan.highlighted ? (
                      <span className="rounded-full bg-on-action px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-action">
                        Recomandat
                      </span>
                    ) : null}
                  </div>
                </div>

                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {plan.title}
                </h2>

                <p className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                  <span className="font-serif text-5xl font-semibold leading-none">
                    {plan.price}
                  </span>
                  <span
                    className={`pb-1 text-sm font-medium ${
                      plan.highlighted ? "text-on-action/75" : "text-muted"
                    }`}
                  >
                    {plan.note}
                  </span>
                  {plan.oldPrice ? (
                    <span
                      className={`pb-1 text-xs font-bold line-through ${
                        plan.highlighted ? "text-on-action/45" : "text-muted"
                      }`}
                    >
                      {plan.oldPrice} RON
                    </span>
                  ) : null}
                </p>

                {plan.discount ? (
                  <p
                    className={`mt-3 w-fit rounded-full border px-3 py-1 text-[10px] font-black ${
                      plan.highlighted
                        ? "border-on-action/20 bg-on-action/10 text-on-action"
                        : "border-success-border bg-success-soft text-success"
                    }`}
                  >
                    {plan.discount}
                  </p>
                ) : null}

                <p
                  className={`mt-5 text-sm leading-6 ${
                    plan.highlighted ? "text-on-action/75" : "text-muted"
                  }`}
                >
                  {plan.description}
                </p>

                <ul
                  className={`mt-6 divide-y border-y text-sm ${listBorderClass}`}
                >
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3 py-3">
                      <span
                        className={`mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-on-action" : "text-success"
                        }`}
                      >
                        <CheckIcon />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  {isCurrentPlan ? (
                    <button
                      type="button"
                      className={`w-full rounded-full border px-5 py-3 text-sm font-black ${
                        plan.highlighted
                          ? "border-on-action/35 bg-on-action text-action"
                          : "border-subtle bg-surface-hover text-content"
                      }`}
                    >
                      Plan actual
                    </button>
                  ) : plan.paid ? (
                    <Link
                      href={`/checkout/${plan.slug}`}
                      className={`inline-flex w-full items-center justify-center rounded-full px-5 py-3 text-sm font-black transition ${
                        plan.highlighted
                          ? "bg-on-action text-action hover:bg-on-action/90"
                          : "bg-action text-on-action hover:bg-action-hover"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-default rounded-full border border-subtle bg-surface-hover px-5 py-3 text-sm font-black text-muted"
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </AccountStaticShell>
  );
}
