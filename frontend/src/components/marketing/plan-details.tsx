import Link from "next/link";
import type { SubscriptionPlanPublic } from "@/lib/plans-api";
import { plansIndexPath } from "@/lib/seo";
import { PlanTryButton } from "@/components/marketing/plan-try-button";

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

export function formatPlanPrice(value: SubscriptionPlanPublic["price_ron"]) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);
  return Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(".", ",");
}

export function billingSuffix(interval: string) {
  const normalized = interval.trim().toLowerCase();
  if (normalized.includes("lun")) return "RON / lună";
  if (normalized.includes("an")) return "RON / an";
  return `RON / ${interval}`;
}

export function planFeatureLabels(plan: SubscriptionPlanPublic) {
  const sorted = [...plan.features].sort(
    (first, second) => first.sort_order - second.sort_order,
  );
  const seen = new Set<string>();

  return [plan.material_limit, ...sorted.map((feature) => feature.label)].filter(
    (feature) => {
      const normalized = feature.trim();
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    },
  );
}

/**
 * Limits shown publicly. Deliberately a curated set: internal accounting units
 * (AI credits, OCR pages, per-cycle page budget, project MB ceiling) and our
 * cost per cycle never reach this page -- they are not even fetched, since the
 * public API no longer returns them.
 */
function planLimitRows(plan: SubscriptionPlanPublic) {
  return [
    {
      label: "Proiecte active simultan",
      value: String(plan.active_project_slots),
    },
    { label: "Proiecte noi pe lună", value: String(plan.active_project_limit) },
    { label: "Materiale pe lună", value: String(plan.monthly_material_limit) },
    { label: "Fișiere pe proiect", value: String(plan.files_per_project_limit) },
    { label: "Mărime maximă fișier", value: `${plan.file_size_limit_mb} MB` },
    { label: "Pagini pe material", value: String(plan.estimated_page_limit) },
    {
      label: "Flashcard-uri generate inițial",
      value: String(plan.initial_flashcard_limit),
    },
    { label: "Întrebări pe quiz", value: String(plan.quiz_questions_per_quiz) },
    {
      label: "Quiz-uri pe proiect",
      value: String(plan.quizzes_per_project_limit),
    },
    {
      label: "Documente scanate (OCR)",
      value: plan.allow_scanned_documents ? "Incluse" : "Neincluse",
    },
    { label: "Chat AI pe proiect", value: plan.ai_chat_enabled ? "Inclus" : "Neinclus" },
  ];
}

/** True when the plan's own badge already says what the featured chip says. */
function badgeDuplicatesFeatured(badge: string | null) {
  return (badge ?? "").trim().toLowerCase() === "recomandat";
}

export function PlanDetails({ plan }: { plan: SubscriptionPlanPublic }) {
  const isFree = Number(plan.price_ron) === 0;
  const price = formatPlanPrice(plan.price_ron);
  const oldPrice = plan.old_price_ron ? formatPlanPrice(plan.old_price_ron) : "";
  const features = planFeatureLabels(plan);
  const limitRows = planLimitRows(plan);
  const ctaLabel = isFree ? "Începe gratuit" : `Încearcă planul ${plan.name}`;

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
      <nav aria-label="Navigare" className="text-sm font-bold text-muted">
        <Link href="/" className="transition hover:text-content">
          Acasă
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <Link href={plansIndexPath} className="transition hover:text-content">
          Abonamente
        </Link>
        <span aria-hidden="true" className="px-2">
          /
        </span>
        <span className="text-content">{plan.name}</span>
      </nav>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {plan.badge && !(plan.is_featured && badgeDuplicatesFeatured(plan.badge)) ? (
              <span className="inline-flex rounded-md border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                {plan.badge}
              </span>
            ) : null}
            {plan.is_featured ? (
              <span className="inline-flex rounded-md bg-action px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-on-action">
                Recomandat
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 max-w-3xl font-serif text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-5xl">
            {`Planul ${plan.name}`}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted sm:text-base">
            {plan.description}
          </p>

          <dl className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Materiale", value: plan.material_limit },
              { label: "Nivel AI", value: plan.ai_level },
              { label: "Istoric", value: plan.storage },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-subtle bg-surface p-4"
              >
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                  {item.label}
                </dt>
                <dd className="mt-2 text-sm font-bold leading-6 text-content">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Ce include</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-3 rounded-md border border-subtle bg-surface px-4 py-3 text-sm leading-6"
                >
                  <span className="mt-1 shrink-0 text-success">
                    <CheckIcon />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="font-serif text-2xl font-semibold">Limitele planului</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-sm">
                <tbody>
                  {limitRows.map((row) => (
                    <tr key={row.label} className="border-b border-subtle">
                      <th
                        scope="row"
                        className="py-3 pr-4 text-left font-medium text-muted"
                      >
                        {row.label}
                      </th>
                      <td className="py-3 text-right font-bold text-content">
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {plan.conditions ? (
            <section className="mt-10 rounded-md border border-subtle bg-surface p-5">
              <h2 className="text-sm font-black text-content">
                Condiții de utilizare
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted">{plan.conditions}</p>
            </section>
          ) : null}
        </div>

        <aside className="rounded-md border border-subtle bg-surface p-6 shadow-sm lg:sticky lg:top-6">
          <p className="flex flex-wrap items-end gap-x-2 gap-y-1">
            <span className="font-serif text-5xl font-semibold leading-none">
              {price}
            </span>
            <span className="pb-1 text-sm text-muted">
              {isFree ? "RON / permanent" : billingSuffix(plan.billing_interval)}
            </span>
          </p>

          {oldPrice ? (
            <p className="mt-2 text-xs font-bold text-muted line-through">
              {oldPrice} RON
            </p>
          ) : null}

          {plan.discount_label ? (
            <p className="mt-3 w-fit rounded-md border border-success-border bg-success-soft px-3 py-1 text-[10px] font-black text-success">
              {plan.discount_label}
            </p>
          ) : null}

          <div className="my-6 h-px bg-subtle" />

          <dl className="space-y-0 text-sm">
            {[
              ["Facturare", isFree ? "Fără plată" : "Reînnoire automată"],
              ["Monedă", "RON"],
              ["Anulare", "Oricând, din cont"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 border-b border-subtle py-3"
              >
                <dt className="text-muted">{label}</dt>
                <dd className="text-right text-xs font-black">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6">
            <PlanTryButton slug={plan.slug} label={ctaLabel} isFree={isFree} />
          </div>

          <p className="mt-5 text-center text-[10px] leading-5 text-muted">
            Plata se procesează securizat prin Stripe. Vezi{" "}
            <Link href="/termeni-si-conditii" className="underline">
              Termenii și Condițiile
            </Link>
            .
          </p>
        </aside>
      </div>
    </div>
  );
}
