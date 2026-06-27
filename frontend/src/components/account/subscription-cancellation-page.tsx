"use client";

import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";

type CancellationState =
  | { status: "idle"; message: null; activeUntil: string }
  | { status: "success"; message: string; activeUntil: string }
  | { status: "error"; message: string; activeUntil: string };

const activeUntil = "24 iulie 2026";

async function requestCancellation() {
  const response = await fetch("/api/compliance/subscription-cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Revizzio-Form-Intent": "subscription-cancel",
    },
    body: JSON.stringify({
      plan_name: "Focus",
      renewal_date: "2026-07-24",
      price: "29 RON",
    }),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    detail?: string;
    active_until?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail || "Anularea nu a putut fi procesată.");
  }

  return body;
}

export function SubscriptionCancellationPage() {
  const [state, setState] = useState<CancellationState>({
    status: "idle",
    message: null,
    activeUntil,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancelRenewal() {
    setIsSubmitting(true);
    setState({ status: "idle", message: null, activeUntil });
    try {
      const response = await requestCancellation();
      setState({
        status: "success",
        message:
          response.message ||
          "Reînnoirea automată a fost oprită. Accesul rămâne activ până la finalul perioadei plătite.",
        activeUntil: response.active_until || activeUntil,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Anularea nu a putut fi procesată.",
        activeUntil,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccountStaticShell activePage="upgrade">
      <section className="space-y-5">
        <div className="rounded-[2rem] border border-subtle bg-surface p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Abonament
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
            Anulare abonament.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            Poți opri reînnoirea automată direct din cont, fără să trimiți
            e-mail. Accesul rămâne activ până la finalul perioadei deja plătite.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <SubscriptionDetail label="Plan activ" value="Focus" />
              <SubscriptionDetail label="Preț" value="29 RON / lună" />
              <SubscriptionDetail
                label="Următoarea dată de facturare"
                value="24 iulie 2026"
              />
              <SubscriptionDetail
                label="Reînnoire automată"
                value={state.status === "success" ? "Oprită" : "Activă"}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-info-border bg-info-soft p-4 text-sm leading-6 text-info">
              Dacă oprești reînnoirea, accesul rămâne activ până la{" "}
              <strong>{state.activeUntil}</strong>. După această dată, planul
              revine la Start dacă nu reactivezi abonamentul.
            </div>

            {state.status !== "idle" ? (
              <div
                role="status"
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
                  state.status === "success"
                    ? "border-success-border bg-success-soft text-success"
                    : "border-danger-border bg-danger-soft text-danger"
                }`}
              >
                {state.message}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleCancelRenewal}
              disabled={isSubmitting || state.status === "success"}
              className="mt-5 rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Se procesează..."
                : state.status === "success"
                  ? "Reînnoire automată oprită"
                  : "Oprește reînnoirea automată"}
            </button>
          </section>

          <aside className="h-fit rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Ce se întâmplă după anulare
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <li>Nu vei mai fi taxat la următoarea dată de facturare.</li>
              <li>Materialele și progresul rămân în cont.</li>
              <li>Poți reactiva un plan oricând din pagina Upgrade.</li>
            </ul>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}

function SubscriptionDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-subtle bg-app p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
