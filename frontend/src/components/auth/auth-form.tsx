"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  AuthApiError,
  login,
  register,
} from "@/lib/auth-api";

type AuthFormProps = {
  mode: "login" | "register" | "forgot-password";
};

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted/65 focus:border-action focus:ring-4 focus:ring-action-soft";

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
      {crossed ? (
        <path strokeLinecap="round" d="m4 4 16 16" />
      ) : null}
    </svg>
  );
}

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

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const isRegister = mode === "register";
  const isForgotPassword = mode === "forgot-password";
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (
      isRegister &&
      formData.get("password") !== formData.get("confirmPassword")
    ) {
      setIsError(true);
      setMessage("Parolele introduse nu coincid.");
      return;
    }

    if (isForgotPassword) {
      setIsError(false);
      setMessage(
        "Dacă adresa există în platformă, vei primi în scurt timp un link pentru resetarea parolei.",
      );
      return;
    }

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    setIsSubmitting(true);
    setIsError(false);
    setMessage(null);

    try {
      const user = isRegister
        ? await register({
            full_name: String(formData.get("name") ?? ""),
            email,
            password,
            accepted_terms: formData.get("terms") === "on",
            newsletter_consent: formData.get("newsletter") === "on",
          })
        : await login({
            email,
            password,
            remember: formData.get("remember") === "on",
          });

      setUser(user);
      router.replace("/myaccount");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof AuthApiError
          ? error.message
          : "Serviciul de autentificare nu este disponibil momentan.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isRegister ? (
        <div>
          <label htmlFor="name" className="text-sm font-bold text-content">
            Nume complet
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Andrei Mureșan"
            className={inputClassName}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="text-sm font-bold text-content">
          Adresă de email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="student@universitate.ro"
          className={inputClassName}
        />
      </div>

      {!isForgotPassword ? (
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-bold text-content">
              Parolă
            </label>
            {!isRegister ? (
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-muted transition hover:text-content"
              >
                Ai uitat parola?
              </Link>
            ) : null}
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={8}
              placeholder={isRegister ? "Minimum 8 caractere" : "Parola ta"}
              className={`${inputClassName} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center text-muted transition hover:text-content"
              aria-label={showPassword ? "Ascunde parola" : "Afișează parola"}
            >
              <EyeIcon crossed={showPassword} />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-info-border bg-info-soft px-4 py-3 text-xs leading-5 text-info">
          Îți vom trimite un link securizat. Acesta va putea fi folosit o singură
          dată și va expira automat.
        </div>
      )}

      {isRegister ? (
        <div>
          <label
            htmlFor="confirmPassword"
            className="text-sm font-bold text-content"
          >
            Confirmă parola
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmation ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repetă parola"
              className={`${inputClassName} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmation((visible) => !visible)}
              className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center text-muted transition hover:text-content"
              aria-label={
                showConfirmation ? "Ascunde parola" : "Afișează parola"
              }
            >
              <EyeIcon crossed={showConfirmation} />
            </button>
          </div>
        </div>
      ) : null}

      {!isForgotPassword && !isRegister ? (
        <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
          <input
            name="remember"
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-subtle accent-action"
          />
          <span>Păstrează-mă conectat pe acest dispozitiv.</span>
        </label>
      ) : null}

      {isRegister ? (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
            <input
              name="terms"
              type="checkbox"
              required
              className="mt-0.5 h-4 w-4 rounded border-subtle accent-action"
            />
            <span>
              Am citit și accept{" "}
              <Link
                href="/termeni-si-conditii"
                className="font-bold text-content underline decoration-subtle underline-offset-4"
              >
                Termenii și condițiile
              </Link>
              .
            </span>
          </label>

          <p className="rounded-xl border border-info-border bg-info-soft px-4 py-3 text-xs leading-5 text-info">
            Informațiile despre prelucrarea datelor sunt disponibile în{" "}
            <Link
              href="/politica-de-confidentialitate"
              className="font-bold underline underline-offset-4"
            >
              Politica de confidențialitate
            </Link>
            .
          </p>

          <label className="flex cursor-pointer items-start gap-3 text-xs leading-5 text-muted">
            <input
              name="newsletter"
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-subtle accent-action"
            />
            <span>Doresc să primesc noutăți și oferte prin e-mail.</span>
          </label>
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-semibold leading-5 ${
            isError
              ? "border-danger-border bg-danger-soft text-danger"
              : "border-info-border bg-info-soft text-info"
          }`}
        >
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="theme-shadow-action flex h-11 w-full items-center justify-center gap-3 rounded-xl bg-action px-5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 disabled:hover:translate-y-0"
      >
        {isSubmitting
          ? "Se procesează..."
          : isForgotPassword
          ? "Trimite linkul de resetare"
          : isRegister
            ? "Creează contul"
            : "Intră în cont"}
        <ArrowIcon />
      </button>
    </form>
  );
}
