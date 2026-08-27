"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { AuthApiError, changePassword } from "@/lib/auth-api";

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

function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.75 12s3.25-5.25 9.25-5.25S21.25 12 21.25 12 18 17.25 12 17.25 2.75 12 2.75 12Z"
      />
      <circle cx="12" cy="12" r="2.25" />
      {crossed ? <path strokeLinecap="round" d="m4 4 16 16" /> : null}
    </svg>
  );
}

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  onChange: (value: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="block min-w-0">
      <span className="sr-only">{label}</span>
      <span className="block">
        <span className="relative block">
          <input
            id={id}
            name={id}
            type={isVisible ? "text" : "password"}
            autoComplete={autoComplete}
            required
            minLength={autoComplete === "new-password" ? 10 : 1}
            maxLength={128}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={
              autoComplete === "new-password"
                ? "Minimum 10 caractere"
                : "Parola curentă"
            }
            className={`${inputClassName} pr-12`}
          />
          <button
            type="button"
            onClick={() => setIsVisible((visible) => !visible)}
            className="absolute bottom-0 right-0 flex h-12 w-12 items-center justify-center text-muted transition hover:text-content"
            aria-label={isVisible ? "Ascunde parola" : "Afișează parola"}
          >
            <EyeIcon crossed={isVisible} />
          </button>
        </span>
      </span>
    </label>
  );
}

function validateNewPassword(password: string) {
  if (password.length < 10) return "Parola nouă trebuie să aibă minimum 10 caractere.";
  if (password !== password.trim()) {
    return "Parola nouă nu poate începe sau termina cu spații.";
  }
  if (!/[a-zA-ZăâîșțĂÂÎȘȚ]/.test(password)) {
    return "Parola nouă trebuie să conțină cel puțin o literă.";
  }
  if (!/\d/.test(password)) {
    return "Parola nouă trebuie să conțină cel puțin o cifră.";
  }
  return null;
}

export function ChangePasswordPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitLockRef = useRef(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "success"
  >("idle");
  const isSubmitting = submitState === "submitting";
  const isSuccess = submitState === "success";

  function resetForAnotherChange() {
    formRef.current?.reset();
    setCurrentPassword("");
    setNewPassword("");
    setMessage(null);
    setIsError(false);
    setSubmitState("idle");
    submitLockRef.current = false;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitLockRef.current) return;

    if (!currentPassword) {
      setIsError(true);
      setSubmitState("idle");
      setMessage("Introdu parola curentă.");
      return;
    }

    if (currentPassword === newPassword) {
      setIsError(true);
      setSubmitState("idle");
      setMessage("Parola nouă trebuie să fie diferită de parola curentă.");
      return;
    }

    const validationMessage = validateNewPassword(newPassword);
    if (validationMessage) {
      setIsError(true);
      setSubmitState("idle");
      setMessage(validationMessage);
      return;
    }

    submitLockRef.current = true;
    setSubmitState("submitting");
    setIsError(false);
    setMessage(null);
    let didSucceed = false;

    try {
      const result = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      formRef.current?.reset();
      setCurrentPassword("");
      setNewPassword("");
      setIsError(false);
      didSucceed = true;
      setSubmitState("success");
      setMessage(result.message);
    } catch (error) {
      setIsError(true);
      setSubmitState("idle");
      setMessage(
        error instanceof AuthApiError
          ? error.message
          : "Parola nu a putut fi actualizată momentan.",
      );
    } finally {
      submitLockRef.current = false;
      if (!didSucceed) {
        setSubmitState("idle");
      }
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
                Parolă
              </p>
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Schimbă parola.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Actualizează parola contului. După salvare, celelalte sesiuni
              active sunt revocate automat.
            </p>
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="max-w-3xl overflow-hidden rounded-xl border border-subtle bg-surface"
          noValidate
        >
          <div className="grid gap-5 border-b border-subtle p-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted">
                Parola curentă
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Verificăm că ești tu.
              </p>
            </div>
            <PasswordField
              id="currentPassword"
              label="Parola curentă"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
          </div>

          <div className="grid gap-5 border-b border-subtle p-5 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-muted">
                Parola nouă
              </p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Minimum 10 caractere, cu literă și cifră.
              </p>
            </div>
            <PasswordField
              id="newPassword"
              label="Parola nouă"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
            />
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
              {isSuccess ? "Înapoi la securitate" : "Renunță"}
            </Link>
            {isSuccess ? (
              <button
                key="change-password-success-action"
                type="button"
                onClick={resetForAnotherChange}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover"
              >
                Schimbă din nou
                <ArrowRightIcon />
              </button>
            ) : (
              <button
                key="change-password-submit-action"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? "Se salvează..." : "Salvează parola"}
                <ArrowRightIcon />
              </button>
            )}
          </div>
        </form>
      </section>
    </AccountStaticShell>
  );
}
