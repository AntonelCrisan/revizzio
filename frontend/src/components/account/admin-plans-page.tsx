"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
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
  conditions: string;
  activeProjectLimit: string;
  monthlyMaterialLimit: string;
  filesPerProjectLimit: string;
  fileSizeLimitMb: string;
  projectSizeLimitMb: string;
  estimatedPageLimit: string;
  initialFlashcardLimit: string;
  quizGroupsPerComplexity: string;
  quizQuestionsPerQuiz: string;
  allowScannedDocuments: boolean;
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

function normalizeInteger(value: string, fallback: number, minimum: number) {
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, parsed);
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
    conditions: plan.conditions,
    activeProjectLimit: String(plan.active_project_limit),
    monthlyMaterialLimit: String(plan.monthly_material_limit),
    filesPerProjectLimit: String(plan.files_per_project_limit),
    fileSizeLimitMb: String(plan.file_size_limit_mb),
    projectSizeLimitMb: String(plan.project_size_limit_mb),
    estimatedPageLimit: String(plan.estimated_page_limit),
    initialFlashcardLimit: String(plan.initial_flashcard_limit),
    quizGroupsPerComplexity: String(plan.quiz_groups_per_complexity),
    quizQuestionsPerQuiz: String(plan.quiz_questions_per_quiz),
    allowScannedDocuments: plan.allow_scanned_documents,
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
    conditions: plan.conditions,
    active_project_limit: normalizeInteger(plan.activeProjectLimit, 1, 0),
    monthly_material_limit: normalizeInteger(plan.monthlyMaterialLimit, 3, 0),
    files_per_project_limit: normalizeInteger(plan.filesPerProjectLimit, 2, 1),
    file_size_limit_mb: normalizeInteger(plan.fileSizeLimitMb, 10, 1),
    project_size_limit_mb: normalizeInteger(plan.projectSizeLimitMb, 20, 1),
    estimated_page_limit: normalizeInteger(plan.estimatedPageLimit, 25, 1),
    initial_flashcard_limit: normalizeInteger(plan.initialFlashcardLimit, 20, 1),
    quiz_groups_per_complexity: normalizeInteger(
      plan.quizGroupsPerComplexity,
      1,
      1,
    ),
    quiz_questions_per_quiz: normalizeInteger(plan.quizQuestionsPerQuiz, 8, 3),
    allow_scanned_documents: plan.allowScannedDocuments,
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
        className="mt-2 h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
      />
    </label>
  );
}

function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group -mx-3 grid w-[calc(100%+1.5rem)] gap-3 rounded-lg px-3 py-4 text-left transition hover:bg-surface-hover sm:grid-cols-[1fr_auto] sm:items-center"
    >
      <span className="min-w-0">
        <span className="block text-sm font-black text-content">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{detail}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked ? "bg-action" : "bg-surface-hover"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function PlanMetric({
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

function EditorSection({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-subtle p-5 first:border-t-0">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
          {title}
        </h3>
        <span className="text-xs font-bold text-muted">{detail}</span>
      </div>
      {children}
    </section>
  );
}

function PlanPreview({ plan }: { plan: AdminPlanDraft }) {
  return (
    <article
      className={`rounded-xl border p-5 ${
        plan.isFeatured
          ? "border-action bg-action text-on-action"
          : "border-subtle bg-surface text-content"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-[10px] font-black uppercase tracking-[0.18em] ${
              plan.isFeatured ? "text-on-action/65" : "text-muted"
            }`}
          >
            {plan.badge || "Plan"}
          </p>
          <h3 className="mt-2 font-serif text-3xl font-semibold leading-tight">
            {plan.name || "Plan nou"}
          </h3>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
            plan.isVisible
              ? plan.isFeatured
                ? "border-on-action/30 bg-on-action text-action"
                : "border-success-border bg-success-soft text-success"
              : plan.isFeatured
                ? "border-on-action/20 text-on-action/70"
                : "border-subtle bg-app text-muted"
          }`}
        >
          {plan.isVisible ? "vizibil" : "ascuns"}
        </span>
      </div>

      <p className="mt-7 flex flex-wrap items-end gap-2">
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
          className={`mt-3 w-fit rounded-full border px-3 py-1 text-xs font-black ${
            plan.isFeatured
              ? "border-on-action/20 bg-on-action/10 text-on-action"
              : "border-success-border bg-success-soft text-success"
          }`}
        >
          {plan.discount}
        </p>
      ) : null}

      <p
        className={`mt-4 text-sm leading-6 ${
          plan.isFeatured ? "text-on-action/72" : "text-muted"
        }`}
      >
        {plan.description || "Descrierea planului apare aici."}
      </p>

      {plan.conditions ? (
        <p
          className={`mt-4 border-t pt-4 text-xs leading-5 ${
            plan.isFeatured
              ? "border-on-action/15 text-on-action/62"
              : "border-subtle text-muted"
          }`}
        >
          {plan.conditions}
        </p>
      ) : null}

      <ul
        className={`mt-5 divide-y ${
          plan.isFeatured ? "divide-on-action/15" : "divide-subtle"
        } border-y ${plan.isFeatured ? "border-on-action/15" : "border-subtle"}`}
      >
        {[plan.materialLimit, plan.aiLevel, plan.storage, ...plan.options]
          .filter(Boolean)
          .slice(0, 7)
          .map((option) => (
            <li key={option} className="flex gap-3 py-3 text-sm">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  plan.isFeatured
                    ? "bg-on-action/12 text-on-action"
                    : "bg-success-soft text-success"
                }`}
              >
                ✓
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
    const initialDrafts = initialPlans.map(toDraftPlan);
    const featuredPlan = initialDrafts.find((plan) => plan.isFeatured);
    if (featuredPlan) return planDraftKey(featuredPlan);
    if (initialDrafts[0]) return planDraftKey(initialDrafts[0]);
    return "missing-plan";
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedPlan =
    plans.find((plan) => planDraftKey(plan) === selectedPlanId) ?? plans[0];
  const visiblePlans = plans.filter((plan) => plan.isVisible).length;
  const featuredPlan = plans.find((plan) => plan.isFeatured);
  const stripeConfiguredPlans = plans.filter((plan) => plan.stripePriceId).length;

  function updateSelectedPlan(update: Partial<AdminPlanDraft>) {
    if (!selectedPlan) return;

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
    if (!selectedPlan) return;

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
    if (!selectedPlan) return;

    updateSelectedPlan({
      options: selectedPlan.options.map((option, optionIndex) =>
        optionIndex === index ? value : option,
      ),
    });
  }

  function addOption() {
    if (!selectedPlan) return;

    updateSelectedPlan({
      options: [...selectedPlan.options, "Opțiune nouă inclusă"],
    });
  }

  function removeOption(index: number) {
    if (!selectedPlan) return;

    updateSelectedPlan({
      options: selectedPlan.options.filter((_, optionIndex) => optionIndex !== index),
    });
  }

  async function saveConfiguration() {
    if (!selectedPlan) return;

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

  if (!selectedPlan) {
    return (
      <AccountStaticShell activePage="admin-settings">
        <section className="space-y-7">
          <Link
            href="/admin/settings"
            className="flex w-fit items-center rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
          >
            ← Setări admin
          </Link>
          <div className="rounded-xl border border-warning-border bg-warning-soft p-5 text-sm font-bold text-warning">
            Nu există planuri configurate momentan.
          </div>
        </section>
      </AccountStaticShell>
    );
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
              Abonamente
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Administrare planuri.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Configurează prețuri, reduceri, vizibilitate, Stripe și beneficiile
              afișate în aplicație.
            </p>
          </div>

          <button
            type="button"
            onClick={saveConfiguration}
            disabled={isSaving}
            className="inline-flex w-fit items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? "Se salvează..." : "Salvează"}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <PlanMetric
            label="Planuri"
            value={String(plans.length)}
            detail={`${visiblePlans} vizibile`}
          />
          <PlanMetric
            label="Recomandat"
            value={featuredPlan?.name ?? "Niciunul"}
            detail="afișat ca alegere principală"
          />
          <PlanMetric
            label="Stripe"
            value={`${stripeConfiguredPlans}/${plans.length}`}
            detail="cu Price ID configurat"
          />
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_22rem]">
          <aside className="rounded-xl border border-subtle bg-surface p-5 xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                  Planuri
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-content">
                  Lista activă
                </h2>
              </div>
              <span className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted">
                {plans.length}
              </span>
            </div>

            <div className="mt-4 divide-y divide-subtle border-y border-subtle">
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
                    className={`group -mx-3 grid w-[calc(100%+1.5rem)] gap-2 rounded-lg px-3 py-4 text-left transition hover:bg-surface-hover ${
                      isSelected ? "bg-action-soft" : ""
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="min-w-0 font-black text-content">
                        {plan.name}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-muted">
                        {plan.price} RON
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{plan.slug}</span>
                      {plan.isFeatured ? (
                        <span className="rounded-full border border-success-border bg-success-soft px-2 py-0.5 font-bold text-success">
                          recomandat
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-xl border border-subtle bg-surface">
            <EditorSection
              title="Editor plan"
              detail={`${selectedPlan.slug} · ${selectedPlan.price || "0"} RON`}
            >
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
                  label="Reducere afișată"
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
                  label="Limită materiale"
                  value={selectedPlan.materialLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ materialLimit: value })
                  }
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
              </div>

              <label className="mt-4 block">
                <span className="text-sm font-bold text-content">Descriere</span>
                <textarea
                  value={selectedPlan.description}
                  onChange={(event) =>
                    updateSelectedPlan({ description: event.target.value })
                  }
                  className="mt-2 min-h-28 w-full resize-y rounded-lg border border-subtle bg-app p-4 text-sm leading-6 text-content outline-none transition placeholder:text-muted focus:border-action"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-sm font-bold text-content">Condiții plan</span>
                <textarea
                  value={selectedPlan.conditions}
                  onChange={(event) =>
                    updateSelectedPlan({ conditions: event.target.value })
                  }
                  className="mt-2 min-h-24 w-full resize-y rounded-lg border border-subtle bg-app p-4 text-sm leading-6 text-content outline-none transition placeholder:text-muted focus:border-action"
                  placeholder="Ex: Limite lunare, utilizare individuală, condiții de generare."
                />
              </label>
            </EditorSection>

            <EditorSection title="Limite" detail="proiecte, materiale și generare">
              <div className="grid gap-4 md:grid-cols-3">
                <TextField
                  label="Proiecte active"
                  value={selectedPlan.activeProjectLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ activeProjectLimit: value })
                  }
                  placeholder="10"
                />
                <TextField
                  label="Materiale / lună"
                  value={selectedPlan.monthlyMaterialLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ monthlyMaterialLimit: value })
                  }
                  placeholder="30"
                />
                <TextField
                  label="Fișiere / proiect"
                  value={selectedPlan.filesPerProjectLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ filesPerProjectLimit: value })
                  }
                  placeholder="10"
                />
                <TextField
                  label="MB / fișier"
                  value={selectedPlan.fileSizeLimitMb}
                  onChange={(value) =>
                    updateSelectedPlan({ fileSizeLimitMb: value })
                  }
                  placeholder="50"
                />
                <TextField
                  label="MB / proiect"
                  value={selectedPlan.projectSizeLimitMb}
                  onChange={(value) =>
                    updateSelectedPlan({ projectSizeLimitMb: value })
                  }
                  placeholder="200"
                />
                <TextField
                  label="Pagini estimate"
                  value={selectedPlan.estimatedPageLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ estimatedPageLimit: value })
                  }
                  placeholder="200"
                />
                <TextField
                  label="Flashcarduri inițiale"
                  value={selectedPlan.initialFlashcardLimit}
                  onChange={(value) =>
                    updateSelectedPlan({ initialFlashcardLimit: value })
                  }
                  placeholder="40"
                />
                <TextField
                  label="Seturi quiz / nivel"
                  value={selectedPlan.quizGroupsPerComplexity}
                  onChange={(value) =>
                    updateSelectedPlan({ quizGroupsPerComplexity: value })
                  }
                  placeholder="3"
                />
                <TextField
                  label="Întrebări / quiz"
                  value={selectedPlan.quizQuestionsPerQuiz}
                  onChange={(value) =>
                    updateSelectedPlan({ quizQuestionsPerQuiz: value })
                  }
                  placeholder="12"
                />
              </div>
              <div className="mt-5 divide-y divide-subtle border-y border-subtle">
                <Toggle
                  label="Documente scanate / OCR"
                  detail="Permite încărcarea PDF-urilor fără text extractibil. Recomandat doar pentru planurile superioare."
                  checked={selectedPlan.allowScannedDocuments}
                  onChange={(checked) =>
                    updateSelectedPlan({ allowScannedDocuments: checked })
                  }
                />
              </div>
            </EditorSection>

            <EditorSection title="Stripe" detail="produs și preț checkout">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  label="Stripe Product ID"
                  value={selectedPlan.stripeProductId}
                  onChange={(value) =>
                    updateSelectedPlan({ stripeProductId: value })
                  }
                  placeholder="prod_..."
                />
                <TextField
                  label="Stripe Price ID"
                  value={selectedPlan.stripePriceId}
                  onChange={(value) => updateSelectedPlan({ stripePriceId: value })}
                  placeholder="price_..."
                />
              </div>
            </EditorSection>

            <EditorSection title="Publicare" detail="stare în aplicație">
              <div className="divide-y divide-subtle border-y border-subtle">
                <Toggle
                  label="Plan vizibil în aplicație"
                  detail="Apare în homepage, upgrade și checkout."
                  checked={selectedPlan.isVisible}
                  onChange={(checked) => updateSelectedPlan({ isVisible: checked })}
                />
                <Toggle
                  label="Marchează ca recomandat"
                  detail="Doar un plan poate fi recomandat simultan."
                  checked={selectedPlan.isFeatured}
                  onChange={updateFeaturedStatus}
                />
              </div>
            </EditorSection>

            <EditorSection title="Opțiuni incluse" detail="beneficii afișate public">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-muted">
                  Aceste rânduri apar în cardurile de preț și în pagina de abonament.
                </p>
                <button
                  type="button"
                  onClick={addOption}
                  className="w-fit rounded-full border border-subtle bg-app px-4 py-2 text-sm font-bold text-content transition hover:bg-surface-hover"
                >
                  Adaugă opțiune
                </button>
              </div>

              <div className="divide-y divide-subtle border-y border-subtle">
                {selectedPlan.options.map((option, index) => (
                  <div
                    key={`${selectedPlan.id}-${index}`}
                    className="grid gap-2 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <input
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                      className="h-12 min-w-0 rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition focus:border-action"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="h-12 rounded-full border border-subtle bg-app px-4 text-sm font-black text-muted transition hover:bg-surface-hover hover:text-content"
                      aria-label="Șterge opțiunea"
                    >
                      Șterge
                    </button>
                  </div>
                ))}
              </div>
            </EditorSection>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <PlanPreview plan={selectedPlan} />

            <section className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Câmpuri backend
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
            </section>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}
