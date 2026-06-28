"use client";

import { AccountStaticShell } from "@/components/account/account-static-shell";
import { CheckoutDisclosure } from "@/components/legal/checkout-disclosure";

const plans = [
  {
    name: "Start",
    price: "0",
    note: "RON / lună",
    description: "Pentru primul curs și testarea fluxului.",
    cta: "Plan curent",
    paid: false,
    highlighted: false,
    features: [
      "3 materiale procesate lunar",
      "Flashcard-uri și quiz-uri de bază",
      "Istoric limitat al sesiunilor",
    ],
  },
  {
    name: "Focus",
    price: "29",
    note: "RON / lună",
    description: "Cel mai bun raport pentru studenți activi.",
    cta: "Alege Focus",
    paid: true,
    highlighted: true,
    features: [
      "30 materiale procesate lunar",
      "Repetiție inteligentă și strategii AI",
      "Analiza progresului pe fiecare proiect",
      "Prioritate la generare",
    ],
  },
  {
    name: "Pro",
    price: "59",
    note: "RON / lună",
    description: "Pentru sesiuni intense și mai multe materii.",
    cta: "Alege Pro",
    paid: true,
    highlighted: false,
    features: [
      "Materiale nelimitate rezonabil",
      "Planuri de învățare pe examene",
      "Export pentru rezumate si flashcard-uri",
      "Suport prioritar",
    ],
  },
];

export function UpgradePage() {
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
            Planul Focus este poziționat ca alegerea principală: suficient de
            puternic pentru utilizare reală, fără costul unui plan mare.
          </p>
          <span className="mt-6 inline-flex rounded-full border border-success-border bg-success-soft px-4 py-2 text-xs font-bold text-success">
            Poți schimba sau anula planul oricând
          </span>
        </div>

        <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3 lg:items-stretch">
          {plans.map((plan) => (
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
              <p className="mt-8 flex items-end gap-2">
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
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.paid ? (
                <CheckoutDisclosure
                  planName={plan.name}
                  price={plan.price}
                  className={`mt-6 ${
                    plan.highlighted
                      ? "border-on-action/15 bg-on-action/10 text-on-action/70 [&_a]:text-on-action [&_dt]:text-on-action [&_p]:text-on-action"
                      : ""
                  }`}
                />
              ) : null}

              <button
                type="button"
                className={`mt-auto rounded-full px-5 py-3 text-sm font-black transition ${
                  plan.highlighted
                    ? "bg-on-action text-action hover:bg-on-action/90"
                    : "border border-content bg-surface hover:bg-content hover:text-app"
                }`}
              >
                {plan.paid ? "Plătește și activează abonamentul" : plan.cta}
              </button>
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
