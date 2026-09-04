"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type AiCreditRate,
  type AiModelRate,
  getAdminCreditRates,
  getAdminModelRates,
  updateAdminCreditRates,
  updateAdminModelRates,
} from "@/lib/ai-rates-api";
import { toast } from "@/lib/toast-store";

const FEATURE_LABELS: Record<string, string> = {
  chat: "Chat AI",
  quiz: "Quiz",
  flashcards: "Flashcard-uri",
  summary: "Rezumat",
  explanation: "Explicații AI",
};

const FEATURE_ORDER = ["chat", "quiz", "flashcards", "summary", "explanation"];

const TIER_LABELS: Record<string, string> = {
  small: "Mic",
  medium: "Mediu",
  large: "Mare",
};

const TIER_ORDER = ["small", "medium", "large"];

export function AdminAiRatesPage() {
  const [creditRates, setCreditRates] = useState<AiCreditRate[]>([]);
  const [modelRates, setModelRates] = useState<AiModelRate[]>([]);
  const [newModelName, setNewModelName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCredits, setIsSavingCredits] = useState(false);
  const [isSavingModels, setIsSavingModels] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      try {
        const [credits, models] = await Promise.all([
          getAdminCreditRates(),
          getAdminModelRates(),
        ]);
        if (!isMounted) return;
        setCreditRates(credits);
        setModelRates(models);
      } catch (error) {
        if (!isMounted) return;
        toast.error(
          error instanceof Error
            ? error.message
            : "Ratele AI nu au putut fi încărcate.",
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateCreditRate(id: string, patch: Partial<AiCreditRate>) {
    setCreditRates((current) =>
      current.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)),
    );
  }

  function updateModelRate(id: string, patch: Partial<AiModelRate>) {
    setModelRates((current) =>
      current.map((rate) => (rate.id === id ? { ...rate, ...patch } : rate)),
    );
  }

  async function saveCreditRates() {
    setIsSavingCredits(true);
    try {
      const updated = await updateAdminCreditRates(
        creditRates.map((rate) => ({
          feature: rate.feature,
          size_tier: rate.size_tier,
          threshold_max: rate.threshold_max,
          credits: rate.credits,
        })),
      );
      setCreditRates(updated);
      toast.success("Pragurile de credite au fost salvate.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Pragurile de credite nu au putut fi salvate.",
      );
    } finally {
      setIsSavingCredits(false);
    }
  }

  async function saveModelRates() {
    setIsSavingModels(true);
    try {
      const payload = modelRates.map((rate) => ({
        model: rate.model,
        cost_per_1k_input_tokens: String(rate.cost_per_1k_input_tokens),
        cost_per_1k_output_tokens: String(rate.cost_per_1k_output_tokens),
      }));
      const trimmedNewModel = newModelName.trim();
      if (trimmedNewModel) {
        payload.push({
          model: trimmedNewModel,
          cost_per_1k_input_tokens: "0",
          cost_per_1k_output_tokens: "0",
        });
      }
      const updated = await updateAdminModelRates(payload);
      setModelRates(updated);
      setNewModelName("");
      toast.success("Prețurile per model au fost salvate.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Prețurile per model nu au putut fi salvate.",
      );
    } finally {
      setIsSavingModels(false);
    }
  }

  const sortedCreditRates = [...creditRates].sort((a, b) => {
    const featureDiff =
      FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature);
    if (featureDiff !== 0) return featureDiff;
    return TIER_ORDER.indexOf(a.size_tier) - TIER_ORDER.indexOf(b.size_tier);
  });

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7">
          <div className="min-w-0">
            <Link
              href="/admin/settings"
              className="mb-5 flex w-fit max-w-full items-center rounded-md border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Setări admin
            </Link>
            <p className="inline-flex max-w-full rounded-md border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              AI Credits
            </p>
            <h1 className="mt-3 max-w-3xl break-words font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Praguri și cost AI.
            </h1>
            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-muted">
              Controlează câte credite costă fiecare acțiune AI (după mărime)
              și prețul estimat per model, folosit pentru plafonul intern de
              cost. Fără valori aici, plafonul de cost rămâne inactiv.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Se încarcă...</p>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-subtle bg-surface">
              <div className="flex flex-col gap-1 border-b border-subtle p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                    Praguri de credite
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    „Prag&rdquo; e valoarea maximă (nr. pagini/întrebări/caractere,
                    după caz) pentru care se aplică nivelul respectiv. Lasă
                    gol pentru ultimul nivel (fără limită superioară).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveCreditRates()}
                  disabled={isSavingCredits}
                  className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-action px-5 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCredits ? "Se salvează..." : "Salvează pragurile"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-subtle text-left text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                      <th className="px-5 py-3">Funcție</th>
                      <th className="px-5 py-3">Nivel</th>
                      <th className="px-5 py-3">Prag</th>
                      <th className="px-5 py-3">Credite</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {sortedCreditRates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-5 py-3 font-semibold text-content">
                          {FEATURE_LABELS[rate.feature] ?? rate.feature}
                        </td>
                        <td className="px-5 py-3 text-muted">
                          {TIER_LABELS[rate.size_tier] ?? rate.size_tier}
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={1}
                            value={rate.threshold_max ?? ""}
                            placeholder="fără limită"
                            onChange={(event) =>
                              updateCreditRate(rate.id, {
                                threshold_max: event.target.value
                                  ? Number(event.target.value)
                                  : null,
                              })
                            }
                            className="h-10 w-32 rounded-lg border border-subtle bg-app px-3 text-sm text-content outline-none focus:border-action"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={0}
                            value={rate.credits}
                            onChange={(event) =>
                              updateCreditRate(rate.id, {
                                credits: Number(event.target.value) || 0,
                              })
                            }
                            className="h-10 w-24 rounded-lg border border-subtle bg-app px-3 text-sm text-content outline-none focus:border-action"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-subtle bg-surface">
              <div className="flex flex-col gap-1 border-b border-subtle p-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                    Cost per model ($/1000 tokeni)
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Folosit doar pentru plafonul intern de cost — la 0$, un
                    model nu contribuie niciodată la plafon.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void saveModelRates()}
                  disabled={isSavingModels}
                  className="inline-flex h-11 w-fit items-center justify-center rounded-md bg-action px-5 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingModels ? "Se salvează..." : "Salvează prețurile"}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-subtle text-left text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                      <th className="px-5 py-3">Model</th>
                      <th className="px-5 py-3">$/1K tokeni input</th>
                      <th className="px-5 py-3">$/1K tokeni output</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle">
                    {modelRates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-5 py-3 font-semibold text-content">
                          {rate.model}
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={0}
                            step="0.000001"
                            value={rate.cost_per_1k_input_tokens}
                            onChange={(event) =>
                              updateModelRate(rate.id, {
                                cost_per_1k_input_tokens: event.target.value,
                              })
                            }
                            className="h-10 w-32 rounded-lg border border-subtle bg-app px-3 text-sm text-content outline-none focus:border-action"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number"
                            min={0}
                            step="0.000001"
                            value={rate.cost_per_1k_output_tokens}
                            onChange={(event) =>
                              updateModelRate(rate.id, {
                                cost_per_1k_output_tokens: event.target.value,
                              })
                            }
                            className="h-10 w-32 rounded-lg border border-subtle bg-app px-3 text-sm text-content outline-none focus:border-action"
                          />
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={newModelName}
                          onChange={(event) => setNewModelName(event.target.value)}
                          placeholder="nume model nou"
                          className="h-10 w-full min-w-[10rem] rounded-lg border border-subtle bg-app px-3 text-sm text-content outline-none focus:border-action"
                        />
                      </td>
                      <td className="px-5 py-3 text-xs text-muted" colSpan={2}>
                        Se adaugă la 0$/0$ — editează după salvare.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AccountStaticShell>
  );
}
