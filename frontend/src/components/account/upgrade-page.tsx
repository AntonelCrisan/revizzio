"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function UpgradePage({
  plans,
  checkoutSessionId,
  checkoutStatus,
}: UpgradePageProps) {
  const router = useRouter();
  const { user, isLoading, setUser } = useAuth();
  const syncedCheckoutSessionRef = useRef<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(() => {
    if (checkoutStatus === "cancelled") {
      return "Plata a fost anulată. Planul tău nu a fost schimbat.";
    }
    if (checkoutStatus === "success" && checkoutSessionId) {
      return "Confirmăm plata cu Stripe și actualizăm planul...";
    }
    return null;
  });
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

    syncedCheckoutSessionRef.current = checkoutSessionId;
    syncCheckoutSession(checkoutSessionId)
      .then((updatedUser) => {
        if (!isMounted) return;
        setUser(updatedUser);
        setCheckoutMessage(
          `Plata a fost confirmată. Planul activ este ${updatedUser.current_plan?.name ?? "Start"}.`,
        );
        router.refresh();
      })
      .catch(() => {
        syncedCheckoutSessionRef.current = null;
        if (!isMounted) return;
        setCheckoutMessage(
          "Plata a fost înregistrată. Dacă planul nu apare imediat, Stripe îl va sincroniza în scurt timp.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, [checkoutSessionId, checkoutStatus, isLoading, router, setUser, user]);

  return (
    <AccountStaticShell activePage="upgrade">
      <section className="space-y-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-warning">
            Abonamentul tău
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight sm:text-5xl">
            Alege spațiul de studiu potrivit.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted">
            Planuri simple, flexibile și transparente în RON. Schimbi sau anulezi
            oricând dorești.
          </p>
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-xs text-muted">
            <span>Status cont:</span>
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="font-black text-content">
              {user?.current_plan?.name ?? "Start"} Activ
            </span>
            <span className="text-muted/45">|</span>
            <span>Anulare oricând</span>
          </div>
        </div>

        {checkoutMessage ? (
          <div className="mx-auto max-w-3xl rounded-2xl border border-success-border bg-success-soft px-5 py-4 text-center text-sm font-bold text-success">
            {checkoutMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {upgradePlans.map((plan) => {
            const isCurrentPlan = plan.slug === currentPlanSlug;

            return (
              <article
                key={plan.slug}
                className={`relative flex min-h-[28rem] flex-col rounded-[1.5rem] border p-7 shadow-sm ${
                  plan.highlighted
                    ? "border-action bg-action text-on-action shadow-2xl shadow-black/15 lg:-mt-4"
                    : "border-subtle bg-surface"
                }`}
              >
                {plan.highlighted ? (
                  <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-warning-soft px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-warning">
                    Recomandat
                  </span>
                ) : null}

                <p
                  className={`text-xs font-black uppercase tracking-[0.18em] ${
                    plan.highlighted ? "text-on-action/65" : "text-muted"
                  }`}
                >
                  {plan.name}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {plan.title}
                </h2>

                <p className="mt-7 flex flex-wrap items-end gap-x-2 gap-y-1">
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
                    className={`mt-3 w-fit rounded px-2 py-1 text-[10px] font-black ${
                      plan.highlighted
                        ? "bg-warning-soft text-warning"
                        : "bg-success-soft text-success"
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

                <div
                  className={`my-6 h-px ${
                    plan.highlighted ? "bg-on-action/15" : "bg-subtle"
                  }`}
                />

                <ul className="space-y-4 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span
                        className={`mt-0.5 shrink-0 ${
                          plan.highlighted ? "text-warning" : "text-success"
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
                      className="w-full rounded-xl border border-subtle bg-surface px-5 py-3 text-sm font-black text-content"
                    >
                      Plan actual
                    </button>
                  ) : plan.paid ? (
                    <Link
                      href={`/checkout/${plan.slug}`}
                      className={`inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-black transition ${
                        plan.highlighted
                          ? "bg-on-action text-action hover:bg-on-action/90"
                          : "bg-surface-hover text-content hover:bg-content hover:text-app"
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-default rounded-xl border border-subtle bg-surface px-5 py-3 text-sm font-black text-muted"
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
