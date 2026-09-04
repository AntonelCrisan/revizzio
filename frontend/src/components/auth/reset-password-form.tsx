"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AuthApiError, confirmPasswordReset } from "@/lib/auth-api";
import { toast } from "@/lib/toast-store";

type ResetPasswordFormProps = {
  token?: string;
};

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted/65 focus:border-action focus:ring-4 focus:ring-action-soft";

function ArrowIcon() {
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

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const submitLockRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Landing here without a token is a dead end, so say so straight away
  // rather than waiting for the visitor to fill the form and submit it.
  useEffect(() => {
    if (!token) {
      toast.error("Linkul de resetare lipsește sau este incomplet.");
    }
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || submitLockRef.current || isSuccess) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      toast.error("Parolele introduse nu coincid.");
      return;
    }

    submitLockRef.current = true;
    let completed = false;
    setIsSubmitting(true);

    try {
      const result = await confirmPasswordReset({ token, password });
      completed = true;
      formRef.current?.reset();
      setIsSuccess(true);
      toast.success(result.message);
    } catch (error) {
      submitLockRef.current = false;
      setIsSuccess(false);
      toast.error(
        error instanceof AuthApiError
          ? error.message
          : "Parola nu a putut fi actualizată momentan.",
      );
    } finally {
      if (!completed) {
        submitLockRef.current = false;
      }
      setIsSubmitting(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="text-sm font-bold text-content">
          Parolă nouă
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          disabled={!token || isSuccess}
          placeholder="Minimum 10 caractere"
          className={inputClassName}
        />
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="text-sm font-bold text-content"
        >
          Confirmă parola nouă
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          disabled={!token || isSuccess}
          placeholder="Repetă parola"
          className={inputClassName}
        />
      </div>

      {isSuccess ? (
        <Link
          href="/login"
          className="theme-shadow-action flex h-11 w-full items-center justify-center gap-3 rounded-md bg-action px-5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover"
        >
          Intră în cont
          <ArrowIcon />
        </Link>
      ) : (
        <button
          type="submit"
          disabled={!token || isSubmitting || isSuccess}
          className="theme-shadow-action flex h-11 w-full items-center justify-center gap-3 rounded-md bg-action px-5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
        >
          {isSubmitting ? "Se actualizează..." : "Setează parola nouă"}
          <ArrowIcon />
        </button>
      )}
    </form>
  );
}
