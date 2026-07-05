"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type SubscriptionPlan,
  type SubscriptionPlanUpdate,
  updateAdminPlans,
} from "@/lib/plans-api";

type AdminPlanDraft = {
  id: string | null;
  name: string;
  slug: string;
  price: string;
  oldPrice: string;
  discount: string;
  interval: string;
  badge: string;
  description: string;
  materialLimit: string;
  aiLevel: string;
  storage: string;
  stripeProductId: string;
  stripePriceId: string;
  isVisible: boolean;
  isFeatured: boolean;
  options: string[];
};

type AdminPlansPageProps = {
  initialPlans: SubscriptionPlan[];
};

function moneyToDraft(value: string | number | null) {
  if (value === null) return "";
  const stringValue = String(value);
  return stringValue.endsWith(".00") ? stringValue.slice(0, -3) : stringValue;
}

function normalizeMoney(value: string) {
  const normalized = value.trim().replace(",", ".");
  return normalized || "0";
}

function optionalText(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function optionalUuid(value: string | null) {
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  )
    ? value
    : null;
}

function toDraftPlan(plan: SubscriptionPlan): AdminPlanDraft {
  return {
    id: optionalUuid(plan.id),
    name: plan.name,
    slug: plan.slug,
    price: moneyToDraft(plan.price_ron),
    oldPrice: moneyToDraft(plan.old_price_ron),
    discount: plan.discount_label ?? "",
    interval: plan.billing_interval,
    badge: plan.badge ?? "",
    description: plan.description,
    materialLimit: plan.material_limit,
    aiLevel: plan.ai_level,
    storage: plan.storage,
    stripeProductId: plan.stripe_product_id ?? "",
    stripePriceId: plan.stripe_price_id ?? "",
    isVisible: plan.is_visible,
    isFeatured: plan.is_featured,
    options: [...plan.features]
      .sort((first, second) => first.sort_order - second.sort_order)
      .map((feature) => feature.label),
  };
}

function toPlanUpdate(
  plan: AdminPlanDraft,
  sortOrder: number,
): SubscriptionPlanUpdate {
  return {
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    price_ron: normalizeMoney(plan.price),
    old_price_ron: optionalText(plan.oldPrice)
      ? normalizeMoney(plan.oldPrice)
      : null,
    discount_label: optionalText(plan.discount),
    billing_interval: plan.interval,
    badge: optionalText(plan.badge),
    description: plan.description,
    material_limit: plan.materialLimit,
    ai_level: plan.aiLevel,
    storage: plan.storage,
    stripe_product_id: optionalText(plan.stripeProductId),
    stripe_price_id: optionalText(plan.stripePriceId),
    is_visible: plan.isVisible,
    is_featured: plan.isFeatured,
    sort_order: sortOrder,
    features: plan.options
      .map((option) => option.trim())
      .filter(Boolean)
      .map((label, index) => ({
        label,
        sort_order: index,
      })),
  };
}

function planDraftKey(plan: AdminPlanDraft) {
  return plan.id ?? plan.slug;
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-content">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-2xl border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-subtle bg-app px-4 py-3 text-left transition hover:bg-surface-hover focus:outline-none focus-visible:border-action focus-visible:ring-2 focus-visible:ring-action/20"
    >
      <span className="min-w-0 text-sm font-bold leading-5">{label}</span>
      <span
        className={`relative h-8 w-14 shrink-0 rounded-full transition ${
          checked ? "bg-action" : "bg-subtle"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function PlanPreview({ plan }: { plan: AdminPlanDraft }) {
  return (
    <article
      className={`rounded-[1.75rem] border p-5 ${
        plan.isFeatured
          ? "border-action bg-action text-on-action shadow-2xl shadow-black/20"
          : "border-subtle bg-app"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-[11px] font-black uppercase tracking-[0.18em] ${
              plan.isFeatured ? "text-on-action/60" : "text-muted"
            }`}
          >
            {plan.badge || "plan"}
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold">{plan.name}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            plan.isVisible
              ? plan.isFeatured
                ? "bg-on-action text-action"
                : "bg-success-soft text-success"
              : "bg-subtle text-muted"
          }`}
        >
          {plan.isVisible ? "activ" : "ascuns"}
        </span>
      </div>

      <p className="mt-7 flex items-end gap-2">
        {plan.oldPrice ? (
          <span
            className={`pb-2 text-sm font-bold line-through ${
              plan.isFeatured ? "text-on-action/45" : "text-muted"
            }`}
          >
            {plan.oldPrice}
          </span>
        ) : null}
        <span className="font-serif text-6xl font-semibold leading-none">
          {plan.price || "0"}
        </span>
        <span
          className={`pb-2 text-sm font-bold ${
            plan.isFeatured ? "text-on-action/65" : "text-muted"
          }`}
        >
          RON / {plan.interval || "lună"}
        </span>
      </p>

      {plan.discount ? (
        <p
          className={`mt-3 w-fit rounded-full px-3 py-1 text-xs font-black ${
            plan.isFeatured
              ? "bg-on-action/15 text-on-action"
              : "bg-success-soft text-success"
          }`}
        >
          {plan.discount}
        </p>
      ) : null}

      <p
        className={`mt-4 text-sm leading-6 ${
          plan.isFeatured ? "text-on-action/70" : "text-muted"
        }`}
      >
        {plan.description}
      </p>

      <div
        className={`my-5 h-px ${
          plan.isFeatured ? "bg-on-action/15" : "bg-subtle"
        }`}
      />

      <ul className="space-y-3 text-sm">
        {[plan.materialLimit, plan.aiLevel, plan.storage, ...plan.options]
          .filter(Boolean)
          .map((option) => (
            <li key={option} className="flex gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  plan.isFeatured
                    ? "bg-on-action/15 text-on-action"
                    : "bg-success-soft text-success"
                }`}
              >
                +
              </span>
              <span>{option}</span>
            </li>
          ))}
      </ul>
    </article>
  );
}

export function AdminPlansPage({ initialPlans }: AdminPlansPageProps) {
  const [plans, setPlans] = useState(() => initialPlans.map(toDraftPlan));
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    const featuredPlan = plans.find((plan) => plan.isFeatured);
    if (featuredPlan) return planDraftKey(featuredPlan);
    if (plans[0]) return planDraftKey(plans[0]);
    return "missing-plan";
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlan =
    plans.find((plan) => planDraftKey(plan) === selectedPlanId) ?? plans[0];

  function updateSelectedPlan(update: Partial<AdminPlanDraft>) {
    setStatusMessage(null);
    const selectedKey = planDraftKey(selectedPlan);
    setPlans((currentPlans) =>
      currentPlans.map((plan) =>
        planDraftKey(plan) === selectedKey ? { ...plan, ...update } : plan,
      ),
    );
    if (!selectedPlan.id && update.slug) {
      setSelectedPlanId(update.slug);
    }
  }

  function updateFeaturedStatus(checked: boolean) {
    setStatusMessage(null);
    const selectedKey = planDraftKey(selectedPlan);
    setPlans((currentPlans) =>
      currentPlans.map((plan) => ({
        ...plan,
        isFeatured: planDraftKey(plan) === selectedKey ? checked : false,
      })),
    );
  }

  function updateOption(index: number, value: string) {
    updateSelectedPlan({
      options: selectedPlan.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    });
  }

  function addOption() {
    updateSelectedPlan({
      options: [...selectedPlan.options, "Opțiune nouă inclusă"],
    });
  }

  function removeOption(index: number) {
    updateSelectedPlan({
      options: selectedPlan.options.filter((_, optionIndex) => optionIndex !== index),
    });
  }

  async function saveConfiguration() {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const selectedSlug = selectedPlan.slug;
      const updatedPlans = await updateAdminPlans(plans.map(toPlanUpdate));
      const updatedDrafts = updatedPlans.map(toDraftPlan);
      const updatedSelectedPlan = updatedDrafts.find(
        (plan) => plan.slug === selectedSlug,
      );
      setPlans(updatedDrafts);
      setSelectedPlanId(
        updatedSelectedPlan
          ? planDraftKey(updatedSelectedPlan)
          : updatedDrafts[0]
            ? planDraftKey(updatedDrafts[0])
            : "missing-plan",
      );
      setStatusMessage("Planurile au fost salvate în baza de date.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Planurile nu au putut fi salvate.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-subtle bg-surface p-6 sm:p-8">
          <Link
            href="/admin/settings"
            className="text-sm font-bold text-muted transition hover:text-content"
          >
            &lt;- Înapoi la setări admin
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Plan și administrare plan
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
            Administrare abonamente
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Configurează planurile vândute în aplicație: preț, reduceri, limită
            de materiale, nivel AI și opțiunile incluse.
          </p>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[18rem_1fr_22rem]">
          <aside className="rounded-[2rem] border border-subtle bg-surface p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Planuri
                </p>
                <h2 className="mt-1 text-lg font-black">Lista planuri</h2>
              </div>
              <span className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted">
                {plans.length}
              </span>
            </div>

            <div className="space-y-2">
              {plans.map((plan) => {
                const isSelected = planDraftKey(plan) === selectedPlanId;
                return (
                  <button
                    key={planDraftKey(plan)}
                    type="button"
                    onClick={() => {
                      setSelectedPlanId(planDraftKey(plan));
                      setStatusMessage(null);
                    }}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-action bg-action text-on-action"
                        : "border-subtle bg-app hover:bg-surface-hover"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-black">{plan.name}</span>
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? "text-on-action/70" : "text-muted"
                        }`}
                      >
                        {plan.price} RON
                      </span>
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        isSelected ? "text-on-action/65" : "text-muted"
                      }`}
                    >
                      {plan.isFeatured ? "Plan recomandat" : plan.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-subtle bg-surface p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Editor plan
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold">
                  {selectedPlan.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={saveConfiguration}
                disabled={isSaving}
                className="w-fit rounded-2xl bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? "Se salvează..." : "Salvează configurația"}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="Nume plan"
                value={selectedPlan.name}
                onChange={(value) => updateSelectedPlan({ name: value })}
              />
              <TextField
                label="Slug intern"
                value={selectedPlan.slug}
                onChange={(value) => updateSelectedPlan({ slug: value })}
              />
              <TextField
                label="Preț lunar"
                value={selectedPlan.price}
                onChange={(value) => updateSelectedPlan({ price: value })}
                placeholder="29"
              />
              <TextField
                label="Preț vechi / comparație"
                value={selectedPlan.oldPrice}
                onChange={(value) => updateSelectedPlan({ oldPrice: value })}
                placeholder="39"
              />
              <TextField
                label="Reducere afisata"
                value={selectedPlan.discount}
                onChange={(value) => updateSelectedPlan({ discount: value })}
                placeholder="25% reducere lansare"
              />
              <TextField
                label="Interval facturare"
                value={selectedPlan.interval}
                onChange={(value) => updateSelectedPlan({ interval: value })}
                placeholder="lunar"
              />
              <TextField
                label="Badge"
                value={selectedPlan.badge}
                onChange={(value) => updateSelectedPlan({ badge: value })}
                placeholder="recomandat"
              />
              <TextField
                label="Limita materiale"
                value={selectedPlan.materialLimit}
                onChange={(value) => updateSelectedPlan({ materialLimit: value })}
              />
              <TextField
                label="Nivel AI"
                value={selectedPlan.aiLevel}
                onChange={(value) => updateSelectedPlan({ aiLevel: value })}
              />
              <TextField
                label="Stocare / istoric"
                value={selectedPlan.storage}
                onChange={(value) => updateSelectedPlan({ storage: value })}
              />
              <TextField
                label="Stripe Product ID"
                value={selectedPlan.stripeProductId}
                onChange={(value) => updateSelectedPlan({ stripeProductId: value })}
                placeholder="prod_..."
              />
              <TextField
                label="Stripe Price ID"
                value={selectedPlan.stripePriceId}
                onChange={(value) => updateSelectedPlan({ stripePriceId: value })}
                placeholder="price_..."
              />
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-bold text-content">Descriere</span>
              <textarea
                value={selectedPlan.description}
                onChange={(event) =>
                  updateSelectedPlan({ description: event.target.value })
                }
                className="mt-2 min-h-28 w-full resize-y rounded-[1.5rem] border border-subtle bg-app p-4 text-sm leading-6 text-content outline-none transition placeholder:text-muted focus:border-action"
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Plan vizibil în aplicație"
                checked={selectedPlan.isVisible}
                onChange={(checked) => updateSelectedPlan({ isVisible: checked })}
              />
              <Toggle
                label="Marchează ca recomandat"
                checked={selectedPlan.isFeatured}
                onChange={updateFeaturedStatus}
              />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-subtle bg-app p-4">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black">Optiuni incluse</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Aceste beneficii apar în cardurile de preț și în pagina de
                    abonament.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="w-fit rounded-2xl border border-subtle bg-surface px-4 py-2 text-sm font-bold transition hover:bg-surface-hover"
                >
                  Adaugă opțiune
                </button>
              </div>

              <div className="space-y-3">
                {selectedPlan.options.map((option, index) => (
                  <div key={`${selectedPlan.id}-${index}`} className="flex gap-2">
                    <input
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                      className="h-12 min-w-0 flex-1 rounded-2xl border border-subtle bg-surface px-4 text-sm text-content outline-none transition focus:border-action"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="h-12 rounded-2xl border border-subtle bg-surface px-4 text-sm font-black text-muted transition hover:bg-surface-hover hover:text-content"
                      aria-label="Șterge opțiunea"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <PlanPreview plan={selectedPlan} />

            <div className="rounded-[1.5rem] border border-subtle bg-surface p-5">
              <p className="text-sm font-black">Campuri pentru backend</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Pentru funcțional, schema ar trebui să aibă planuri, prețuri,
                reduceri, beneficii și status de publicare. UI-ul este deja gândit
                după aceste câmpuri.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["plans", "prices", "discounts", "features", "visibility"].map(
                  (item) => (
                    <code
                      key={item}
                      className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted"
                    >
                      {item}
                    </code>
                  ),
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}
