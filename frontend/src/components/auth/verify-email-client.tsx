"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { AuthApiError, verifyEmail } from "@/lib/auth-api";

type VerifyEmailClientProps = {
  token?: string;
};

export function VerifyEmailClient({ token }: VerifyEmailClientProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [message, setMessage] = useState(
    token
      ? "Verificăm adresa de email..."
      : "Linkul de confirmare lipsește sau este incomplet.",
  );
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const hasVerified = useRef(false);

  useEffect(() => {
    if (hasVerified.current) return;
    hasVerified.current = true;

    if (!token) return;
    const verificationToken = token;

    async function confirmEmail() {
      try {
        const user = await verifyEmail(verificationToken);
        setUser(user);
        setStatus("success");
        setMessage("Email confirmat. Contul tău a fost creat.");
        window.setTimeout(() => router.replace("/myaccount"), 900);
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof AuthApiError
            ? error.message
            : "Nu am putut confirma emailul momentan.",
        );
      }
    }

    void confirmEmail();
  }, [router, setUser, token]);

  return (
    <div className="space-y-4">
      <div
        role="status"
        className={`rounded-2xl border px-4 py-4 text-sm font-semibold leading-6 ${
          status === "error"
            ? "border-danger-border bg-danger-soft text-danger"
            : status === "success"
              ? "border-success-border bg-success-soft text-success"
              : "border-info-border bg-info-soft text-info"
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              status === "loading"
                ? "animate-pulse border-info text-info"
                : "border-current"
            }`}
          >
            {status === "loading" ? "" : status === "success" ? "✓" : "!"}
          </span>
          <span>{message}</span>
        </div>
      </div>

      {status === "success" ? (
        <Link
          href="/myaccount"
          className="theme-shadow-action flex h-11 w-full items-center justify-center rounded-xl bg-action px-5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover"
        >
          Mergi în cont
        </Link>
      ) : null}

      {status === "error" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Link
            href="/register"
            className="flex h-11 items-center justify-center rounded-xl border border-subtle bg-surface px-5 text-sm font-bold text-content transition hover:border-action"
          >
            Creează cont din nou
          </Link>
          <Link
            href="/login"
            className="theme-shadow-action flex h-11 items-center justify-center rounded-xl bg-action px-5 text-sm font-bold text-on-action transition hover:-translate-y-0.5 hover:bg-action-hover"
          >
            Înapoi la autentificare
          </Link>
        </div>
      ) : null}
    </div>
  );
}
