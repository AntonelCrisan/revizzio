"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanyData } from "@/lib/legal-api";

type FormState =
  | { status: "idle"; message: null; registrationNumber?: never }
  | { status: "submitting"; message: null; registrationNumber?: never }
  | { status: "success"; message: string; registrationNumber?: string }
  | { status: "error"; message: string; registrationNumber?: never };

const initialState: FormState = { status: "idle", message: null };

const inputClassName =
  "mt-2 h-12 w-full rounded-xl border border-subtle bg-app px-4 text-sm font-semibold text-content outline-none transition placeholder:text-muted/60 focus:border-action focus:ring-4 focus:ring-action-soft";

const textareaClassName =
  "mt-2 min-h-36 w-full resize-y rounded-xl border border-subtle bg-app px-4 py-3 text-sm font-semibold leading-6 text-content outline-none transition placeholder:text-muted/60 focus:border-action focus:ring-4 focus:ring-action-soft";

const contactFieldInputClassName =
  "h-11 w-full rounded-lg border border-subtle bg-app px-3 text-sm font-semibold text-content outline-none transition placeholder:text-muted/45 focus:border-action focus:ring-4 focus:ring-action-soft";

const contactFieldTextareaClassName =
  "min-h-36 w-full resize-y rounded-lg border border-subtle bg-app px-3 py-3 text-sm font-semibold leading-6 text-content outline-none transition placeholder:text-muted/45 focus:border-action focus:ring-4 focus:ring-action-soft";

const clientRecaptchaSiteKey =
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";

type RecaptchaClient = {
  ready?: (callback: () => void) => void;
  render: (
    container: HTMLElement,
    parameters: { sitekey: string; theme?: "light" | "dark" },
  ) => number;
  getResponse: (widgetId?: number) => string;
  reset: (widgetId?: number) => void;
};

declare global {
  interface Window {
    grecaptcha?: RecaptchaClient;
  }
}

async function postComplianceForm(endpoint: string, payload: object) {
  const response = await fetch(`/api/compliance/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Reviss-Form-Intent": endpoint,
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    registration_number?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(body.detail || "Solicitarea nu a putut fi trimisă.");
  }

  return body;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 text-sm font-bold text-content">
      {label}
      {children}
    </label>
  );
}

function FormStatus({ state }: { state: FormState }) {
  if (state.status === "idle" || state.status === "submitting") return null;

  return (
    <div
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-6 ${
        state.status === "success"
          ? "border-success-border bg-success-soft text-success"
          : "border-danger-border bg-danger-soft text-danger"
      }`}
    >
      <p className="break-words">{state.message}</p>
      {state.registrationNumber ? (
        <p className="mt-1 break-words text-xs">
          Număr de înregistrare: {state.registrationNumber}
        </p>
      ) : null}
    </div>
  );
}

function ContactFormRow({
  label,
  description,
  children,
  isLast = false,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <label
      className={`grid min-w-0 gap-3 px-5 py-4 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center ${
        isLast ? "" : "border-b border-subtle"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
        <span className="mt-1 hidden text-xs text-muted md:block">
          {description}
        </span>
      </span>
      {children}
    </label>
  );
}

function ContactRecaptcha({
  siteKey,
  isResolvingConfig,
  containerRef,
  isReady,
  error,
  onScriptLoad,
  onScriptError,
}: {
  siteKey: string;
  isResolvingConfig: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isReady: boolean;
  error: string | null;
  onScriptLoad: () => void;
  onScriptError: () => void;
}) {
  if (!siteKey) {
    return (
      <div className="rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
        {isResolvingConfig
          ? "Se verifică setările reCAPTCHA..."
          : "reCAPTCHA nu este configurat pe frontend."}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-subtle bg-surface p-5">
      <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)] md:items-center">
        <span className="min-w-0">
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-muted">
            Verificare
          </span>
          <span className="mt-1 hidden text-xs text-muted md:block">
            Protecție anti-spam.
          </span>
        </span>
        <div className="min-w-0">
          <Script
            src="https://www.google.com/recaptcha/api.js?render=explicit"
            strategy="afterInteractive"
            onLoad={onScriptLoad}
            onError={onScriptError}
          />
          <div className="min-h-[78px] overflow-hidden rounded-lg border border-subtle bg-app px-3 py-3">
            <div className="w-[304px] max-w-full origin-top-left scale-[0.9] sm:scale-100">
              <div ref={containerRef} />
            </div>
          </div>
          {!isReady || error ? (
            <span
              className={`mt-2 block text-xs font-bold leading-5 ${
                error ? "text-danger" : "text-muted"
              }`}
            >
              {error ?? "Se încarcă verificarea anti-spam..."}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type ContactFormProps = {
  recaptchaSiteKey: string;
};

export function ContactForm({ recaptchaSiteKey }: ContactFormProps) {
  const initialRecaptchaSiteKey =
    recaptchaSiteKey.trim() || clientRecaptchaSiteKey;
  const [runtimeRecaptchaSiteKey, setRuntimeRecaptchaSiteKey] = useState("");
  const [
    hasCheckedRuntimeRecaptchaConfig,
    setHasCheckedRuntimeRecaptchaConfig,
  ] = useState(Boolean(initialRecaptchaSiteKey));
  const effectiveRecaptchaSiteKey =
    initialRecaptchaSiteKey || runtimeRecaptchaSiteKey;
  const isResolvingRecaptchaConfig =
    !initialRecaptchaSiteKey && !hasCheckedRuntimeRecaptchaConfig;
  const isRecaptchaMissing =
    hasCheckedRuntimeRecaptchaConfig && !effectiveRecaptchaSiteKey;
  const [state, setState] = useState<FormState>(initialState);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(
    !effectiveRecaptchaSiteKey,
  );
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);
  const isSubmitButtonDisabled =
    isContactSubmitting ||
    isRecaptchaMissing ||
    Boolean(effectiveRecaptchaSiteKey && recaptchaError);

  useEffect(() => {
    if (initialRecaptchaSiteKey || hasCheckedRuntimeRecaptchaConfig) {
      return undefined;
    }

    let isCancelled = false;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch("/api/public-config", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          recaptcha_site_key?: string;
        };
        if (!isCancelled) {
          setRuntimeRecaptchaSiteKey(data.recaptcha_site_key?.trim() || "");
        }
      } catch {
        if (!isCancelled) {
          setRuntimeRecaptchaSiteKey("");
        }
      } finally {
        if (!isCancelled) {
          setHasCheckedRuntimeRecaptchaConfig(true);
        }
      }
    }

    void loadRuntimeConfig();

    return () => {
      isCancelled = true;
    };
  }, [hasCheckedRuntimeRecaptchaConfig, initialRecaptchaSiteKey]);

  const renderRecaptcha = useCallback(() => {
    if (!effectiveRecaptchaSiteKey) {
      setIsRecaptchaReady(true);
      return;
    }
    if (
      !recaptchaContainerRef.current ||
      !window.grecaptcha ||
      recaptchaWidgetIdRef.current !== null
    ) {
      return;
    }

    const renderWidget = () => {
      if (
        !recaptchaContainerRef.current ||
        !window.grecaptcha ||
        recaptchaWidgetIdRef.current !== null
      ) {
        return;
      }

      try {
        recaptchaWidgetIdRef.current = window.grecaptcha.render(
          recaptchaContainerRef.current,
          { sitekey: effectiveRecaptchaSiteKey },
        );
        setIsRecaptchaReady(true);
        setRecaptchaError(null);
      } catch {
        setIsRecaptchaReady(false);
        setRecaptchaError(
          "reCAPTCHA nu s-a putut încărca. Verifică domeniul și cheia site.",
        );
      }
    };

    if (window.grecaptcha.ready) {
      window.grecaptcha.ready(renderWidget);
    } else {
      renderWidget();
    }
  }, [effectiveRecaptchaSiteKey]);

  useEffect(() => {
    if (!effectiveRecaptchaSiteKey) {
      return undefined;
    }

    const tryRenderRecaptcha = () => {
      if (recaptchaWidgetIdRef.current === null) {
        setIsRecaptchaReady(false);
        setRecaptchaError(null);
      }
      renderRecaptcha();
      if (recaptchaWidgetIdRef.current !== null) {
        window.clearInterval(retryTimer);
      }
    };
    const initialTimer = window.setTimeout(tryRenderRecaptcha, 0);
    const retryTimer = window.setInterval(tryRenderRecaptcha, 500);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(retryTimer);
    };
  }, [effectiveRecaptchaSiteKey, renderRecaptcha]);

  function resetRecaptcha() {
    if (!effectiveRecaptchaSiteKey || !window.grecaptcha) return;
    window.grecaptcha.reset(recaptchaWidgetIdRef.current ?? undefined);
  }

  function handleAnotherMessage() {
    setIsContactSubmitting(false);
    setState(initialState);
    resetRecaptcha();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isContactSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (isRecaptchaMissing) {
      setState({
        status: "error",
        message:
          "reCAPTCHA nu este configurat pe frontend. Adaugă cheia publică și repornește aplicația.",
      });
      return;
    }

    if (recaptchaError) {
      setState({
        status: "error",
        message: recaptchaError,
      });
      return;
    }

    if (!isRecaptchaReady) {
      setState({
        status: "error",
        message: "Protecția anti-spam încă se încarcă. Încearcă din nou.",
      });
      return;
    }

    const recaptchaToken = effectiveRecaptchaSiteKey
      ? (window.grecaptcha?.getResponse(
          recaptchaWidgetIdRef.current ?? undefined,
        ) ?? "")
      : "";

    if (effectiveRecaptchaSiteKey && !recaptchaToken) {
      setState({
        status: "error",
        message: "Confirmă verificarea anti-spam înainte de trimitere.",
      });
      return;
    }

    setIsContactSubmitting(true);
    setState({ status: "submitting", message: null });
    try {
      const response = await postComplianceForm("contact", {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        message: String(formData.get("message") ?? ""),
        category: String(formData.get("category") ?? ""),
        recaptcha_token: recaptchaToken,
      });
      form.reset();
      resetRecaptcha();
      setState({
        status: "success",
        message:
          response.message ||
          "Mesajul a fost trimis. Îți vom răspunde pe e-mail.",
        registrationNumber: response.registration_number,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Mesajul nu a putut fi trimis.",
      });
      resetRecaptcha();
    } finally {
      setIsContactSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="rounded-xl border border-subtle bg-surface">
        <ContactFormRow
          label="Nume"
          description="Cum te putem identifica."
        >
          <input
            name="name"
            required
            minLength={2}
            placeholder="Numele tău"
            className={contactFieldInputClassName}
          />
        </ContactFormRow>
        <ContactFormRow
          label="E-mail"
          description="Aici îți trimitem răspunsul."
        >
          <input
            name="email"
            required
            type="email"
            placeholder="nume@email.ro"
            className={contactFieldInputClassName}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Categorie"
          description="Direcționăm mesajul corect."
        >
          <select
            name="category"
            required
            className={contactFieldInputClassName}
          >
            <option value="">Alege categoria</option>
            <option value="suport">Suport</option>
            <option value="facturare">Facturare</option>
            <option value="confidentialitate">Confidențialitate</option>
            <option value="raportare_continut">Raportare conținut</option>
          </select>
        </ContactFormRow>
        <ContactFormRow
          label="Subiect"
          description="Pe scurt, despre ce este vorba."
        >
          <input
            name="subject"
            required
            minLength={3}
            placeholder="Ex: Ajutor cu abonamentul"
            className={contactFieldInputClassName}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Mesaj"
          description="Include detaliile utile."
          isLast
        >
          <textarea
            name="message"
            required
            minLength={10}
            placeholder="Scrie mesajul aici..."
            className={contactFieldTextareaClassName}
          />
        </ContactFormRow>
      </div>
      <ContactRecaptcha
        siteKey={effectiveRecaptchaSiteKey}
        isResolvingConfig={isResolvingRecaptchaConfig}
        containerRef={recaptchaContainerRef}
        isReady={isRecaptchaReady}
        error={recaptchaError}
        onScriptLoad={renderRecaptcha}
        onScriptError={() => {
          setIsRecaptchaReady(false);
          setRecaptchaError(
            "Scriptul reCAPTCHA nu s-a putut încărca. Încearcă din nou.",
          );
        }}
      />
      <FormStatus state={state} />
      {state.status === "success" ? (
        <button
          key="contact-success-action"
          type="button"
          onClick={handleAnotherMessage}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover sm:w-fit"
        >
          Trimite alt mesaj
        </button>
      ) : (
        <button
          key="contact-submit-action"
          type="submit"
          disabled={isSubmitButtonDisabled}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60 sm:w-fit"
        >
          {isContactSubmitting ? "Se trimite..." : "Trimite mesajul"}
        </button>
      )}
    </form>
  );
}

export function WithdrawalForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (formData.get("confirmation") !== "on") {
      setState({
        status: "error",
        message: "Confirmă solicitarea de retragere înainte de trimitere.",
      });
      return;
    }

    setIsSubmitting(true);
    setState(initialState);
    try {
      const response = await postComplianceForm("withdrawal", {
        full_name: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        subscription_or_order: String(formData.get("subscription") ?? ""),
        order_number: String(formData.get("orderNumber") ?? ""),
        reason: String(formData.get("reason") ?? ""),
        confirmation: true,
      });
      form.reset();
      setState({
        status: "success",
        message:
          response.message ||
          "Solicitarea de retragere a fost înregistrată și confirmarea a fost pusă în coada de e-mail.",
        registrationNumber: response.registration_number,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Solicitarea nu a putut fi trimisă.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume complet">
          <input
            name="fullName"
            required
            minLength={2}
            className={inputClassName}
          />
        </Field>
        <Field label="E-mail asociat contului">
          <input
            name="email"
            required
            type="email"
            className={inputClassName}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Abonamentul sau comanda">
          <input
            name="subscription"
            required
            minLength={2}
            placeholder="Ex: Focus lunar"
            className={inputClassName}
          />
        </Field>
        <Field label="Numărul comenzii, dacă există">
          <input name="orderNumber" className={inputClassName} />
        </Field>
      </div>
      <Field label="Motiv opțional">
        <textarea name="reason" className={textareaClassName} />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-subtle bg-app p-4 text-xs leading-5 text-muted">
        <input
          name="confirmation"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 accent-action"
        />
        Confirm că doresc retragerea din contract pentru abonamentul sau comanda
        indicată.
      </label>
      <FormStatus state={state} />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Se înregistrează..." : "Confirmă retragerea"}
      </button>
    </form>
  );
}

export function ContentReportForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (formData.get("declaration") !== "on") {
      setState({
        status: "error",
        message: "Confirmă declarația privind corectitudinea informațiilor.",
      });
      return;
    }

    setIsSubmitting(true);
    setState(initialState);
    try {
      const response = await postComplianceForm("content-report", {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        report_type: String(formData.get("reportType") ?? ""),
        content_reference: String(formData.get("contentReference") ?? ""),
        description: String(formData.get("description") ?? ""),
        rights_evidence: String(formData.get("rightsEvidence") ?? ""),
        declaration: true,
      });
      form.reset();
      setState({
        status: "success",
        message:
          response.message ||
          "Sesizarea a fost înregistrată și va fi analizată.",
        registrationNumber: response.registration_number,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Sesizarea nu a putut fi trimisă.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nume">
          <input name="name" required minLength={2} className={inputClassName} />
        </Field>
        <Field label="E-mail">
          <input
            name="email"
            required
            type="email"
            className={inputClassName}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipul sesizării">
          <select name="reportType" required className={inputClassName}>
            <option value="">Alege tipul</option>
            <option value="drepturi_autor">Drepturi de autor</option>
            <option value="date_personale">Date personale</option>
            <option value="continut_incorect">Conținut incorect</option>
            <option value="altul">Alt motiv</option>
          </select>
        </Field>
        <Field label="Linkul sau identificatorul conținutului">
          <input
            name="contentReference"
            required
            minLength={3}
            className={inputClassName}
          />
        </Field>
      </div>
      <Field label="Descriere">
        <textarea
          name="description"
          required
          minLength={10}
          className={textareaClassName}
        />
      </Field>
      <Field label="Dovada drepturilor, opțional">
        <textarea name="rightsEvidence" className={textareaClassName} />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-subtle bg-app p-4 text-xs leading-5 text-muted">
        <input
          name="declaration"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 accent-action"
        />
        Declar că informațiile furnizate sunt corecte și că solicitarea este
        făcută cu bună-credință.
      </label>
      <FormStatus state={state} />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Se trimite..." : "Trimite sesizarea"}
      </button>
    </form>
  );
}

type CompanyDetailsCardProps = {
  companyData: CompanyData;
};

function displayCompanyValue(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue || /^\[[^\]]+\]$/.test(trimmedValue)) {
    return "-";
  }
  return trimmedValue;
}

export function CompanyDetailsCard({ companyData }: CompanyDetailsCardProps) {
  const rows = [
    ["Operator", displayCompanyValue(companyData.name)],
    ["Sediu social", displayCompanyValue(companyData.social_location)],
    ["CUI", displayCompanyValue(companyData.cui)],
    [
      "Nr. Registrul Comerțului",
      displayCompanyValue(companyData.register_number),
    ],
    ["E-mail", displayCompanyValue(companyData.email)],
    ["Telefon", displayCompanyValue(companyData.phone)],
  ];

  return (
    <aside className="h-fit rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
        Date firmă
      </p>
      <dl className="mt-4 grid min-w-0 gap-4 text-sm leading-6">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-bold text-content">{label}</dt>
            <dd className="mt-0.5 min-w-0 break-words text-muted">
              {value || "-"}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
