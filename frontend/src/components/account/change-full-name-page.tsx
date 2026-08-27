"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthApiError, updateFullName } from "@/lib/auth-api";

const inputClassName =
  "h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted/70 focus:border-action focus:ring-4 focus:ring-action-soft";

function ArrowLeftIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m6-6-6 6 6 6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function ChangeFullNamePage() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const normalized = fullName.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) {
      setIsError(true);
      setMessage("Numele complet trebuie să aibă minimum 2 caractere.");
      return;
    }

    if (user && normalized === user.full_name) {
      setIsError(true);
      setMessage("Numele introdus este identic cu cel curent.");
      return;
    }

    setIsSubmitting(true);
    setIsError(false);
    setMessage(null);

    try {
      const updatedUser = await updateFullName(normalized);
      setUser(updatedUser);
      setFullName(updatedUser.full_name);
      setIsError(false);
      setMessage("Numele a fost actualizat.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof AuthApiError
          ? error.message
          : "Numele nu a putut fi actualizat momentan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AccountStaticShell activePage="settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-10 flex flex-col items-start gap-4">
              <Link
                href="/settings#security"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
              >
                <ArrowLeftIcon />
                Securitate
              </Link>
              <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                Nume
              </p>
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Schimbă numele.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Actualizează numele afișat pe contul tău Reviss.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-3xl overflow-hidden rounded-xl border border-subtle bg-surface"
          noValidate
        >
          <div className="grid gap-5 border-b border-subtle p-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted">
                Nume complet
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Vizibil pe contul și profilul tău.
              </p>
            </div>
            <label className="block min-w-0">
              <span className="sr-only">Nume complet</span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nume și prenume"
                className={inputClassName}
              />
            </label>
          </div>

          {message ? (
            <div
              role="status"
              className={`mx-5 mt-5 rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${
                isError
                  ? "border-danger-border bg-danger-soft text-danger"
                  : "border-success-border bg-success-soft text-success"
              }`}
            >
              {message}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:justify-end">
            <Link
              href="/settings#security"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-subtle bg-app px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover"
            >
              Înapoi la securitate
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? "Se salvează..." : "Salvează numele"}
              <ArrowRightIcon />
            </button>
          </div>
        </form>
      </section>
    </AccountStaticShell>
  );
}
