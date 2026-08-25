"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CompanyData } from "@/lib/legal-api";

type FormState =
  | { status: "idle"; message: null; registrationNumber?: never }
  | { status: "submitting"; message: null; registrationNumber?: never }
  | { status: "success"; message: string; registrationNumber?: string }
  | { status: "error"; message: string; registrationNumber?: never };

type FormFieldErrors = Partial<Record<string, string>>;

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
const contentReportAllowedAttachmentExtensions = [
  ".doc",
  ".docx",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".rtf",
  ".txt",
  ".webp",
];
const contentReportMaxAttachmentFiles = 5;
const contentReportMaxAttachmentBytes = 10 * 1024 * 1024;

type SelectedContentReportAttachment = {
  id: string;
  file: File;
};

class ComplianceRequestError extends Error {
  fieldErrors: FormFieldErrors;

  constructor(message: string, fieldErrors: FormFieldErrors = {}) {
    super(message);
    this.name = "ComplianceRequestError";
    this.fieldErrors = fieldErrors;
  }
}

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
    detail?: unknown;
  };

  if (!response.ok) {
    throw new ComplianceRequestError(
      readApiError(body.detail, response.status),
      readApiFieldErrors(body.detail),
    );
  }

  return body;
}

async function postComplianceMultipart(endpoint: string, payload: FormData) {
  const response = await fetch(`/api/compliance/${endpoint}`, {
    method: "POST",
    headers: {
      "X-Reviss-Form-Intent": endpoint,
    },
    body: payload,
    cache: "no-store",
  });

  const body = (await response.json().catch(() => ({}))) as {
    message?: string;
    registration_number?: string;
    detail?: unknown;
  };

  if (!response.ok) {
    throw new ComplianceRequestError(
      readApiError(body.detail, response.status),
      readApiFieldErrors(body.detail),
    );
  }

  return body;
}

type ApiValidationError = {
  loc?: unknown;
  msg?: unknown;
  type?: unknown;
  ctx?: unknown;
};

const apiErrorFieldLabels: Record<string, string> = {
  attachments: "Documente",
  category: "Categorie",
  content_reference: "Conținut",
  declaration: "Declarație",
  description: "Descriere",
  email: "E-mail",
  form: "Formular",
  message: "Mesaj",
  name: "Nume",
  recaptcha_token: "Verificare anti-spam",
  report_type: "Tip",
  rights_evidence: "Dovezi",
  subject: "Subiect",
};

const apiErrorFieldNames: Record<string, string> = {
  attachments: "attachments",
  category: "category",
  content_reference: "contentReference",
  declaration: "declaration",
  description: "description",
  email: "email",
  message: "message",
  name: "name",
  report_type: "reportType",
  rights_evidence: "rightsEvidence",
  subject: "subject",
};

function readApiError(detail: unknown, statusCode?: number) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map(readValidationErrorItem)
      .filter(Boolean);

    if (messages.length > 0) {
      return messages.join(" ");
    }
  }

  if (detail && typeof detail === "object") {
    const message = readValidationErrorItem(detail);
    if (message) return message;
  }

  if (statusCode === 400) {
    return "Verifică formularul și încearcă din nou.";
  }
  if (statusCode === 403) {
    return "Solicitarea a fost blocată din motive de securitate. Reîncarcă pagina și încearcă din nou.";
  }
  if (statusCode === 422) {
    return "Verifică datele din formular. Unele câmpuri nu sunt completate corect.";
  }
  if (statusCode === 429) {
    return "Ai trimis prea multe solicitări într-un timp scurt. Încearcă din nou mai târziu.";
  }
  if (statusCode && statusCode >= 500) {
    return "Serverul nu poate procesa solicitarea momentan. Încearcă din nou după câteva minute.";
  }

  return "Solicitarea nu a putut fi trimisă.";
}

function readApiFieldErrors(detail: unknown): FormFieldErrors {
  if (!Array.isArray(detail)) {
    return {};
  }

  return detail.reduce<FormFieldErrors>((fieldErrors, item) => {
    if (!item || typeof item !== "object") {
      return fieldErrors;
    }

    const error = item as ApiValidationError;
    const fieldName = readValidationFieldName(error.loc);
    const message = readValidationErrorItem(error);
    if (fieldName && message) {
      fieldErrors[fieldName] = message;
    }
    return fieldErrors;
  }, {});
}

function readValidationErrorItem(item: unknown) {
  if (typeof item === "string" && item.trim()) {
    return item.trim();
  }
  if (!item || typeof item !== "object") {
    return null;
  }

  const error = item as ApiValidationError;
  const rawType = typeof error.type === "string" ? error.type : "";
  const rawMessage =
    typeof error.msg === "string" ? error.msg : "Valoare invalidă.";
  const message = normalizeApiErrorMessage(rawMessage);
  const fieldLabel = readValidationFieldLabel(error.loc);
  const prefix = fieldLabel ? `${fieldLabel}: ` : "";
  const context =
    error.ctx && typeof error.ctx === "object"
      ? (error.ctx as Record<string, unknown>)
      : {};
  const lowerMessage = message.toLowerCase();

  if (rawType === "missing") {
    return `${prefix}câmp obligatoriu lipsă.`;
  }

  if (rawType === "string_too_short") {
    const minLength = Number(context.min_length);
    return Number.isFinite(minLength)
      ? `${prefix}trebuie să aibă cel puțin ${minLength} caractere.`
      : `${prefix}textul este prea scurt.`;
  }

  if (rawType === "string_too_long") {
    const maxLength = Number(context.max_length);
    return Number.isFinite(maxLength)
      ? `${prefix}trebuie să aibă cel mult ${maxLength} caractere.`
      : `${prefix}textul este prea lung.`;
  }

  if (
    rawType.includes("email") ||
    lowerMessage.includes("email address") ||
    lowerMessage.includes("valid email")
  ) {
    return `${prefix || "E-mail: "}adresa de e-mail nu este validă.`;
  }

  if (rawType === "literal_error") {
    return `${prefix}alege o opțiune validă.`;
  }

  if (rawType.includes("bool") && fieldLabel === "Declarație") {
    return "Declarație: confirmarea este obligatorie.";
  }

  return `${prefix}${message}`;
}

function readValidationFieldLabel(loc: unknown) {
  if (!Array.isArray(loc)) return null;

  for (let index = loc.length - 1; index >= 0; index -= 1) {
    const segment = loc[index];
    if (typeof segment !== "string") continue;
    if (["body", "query", "path"].includes(segment)) continue;
    return apiErrorFieldLabels[segment] ?? segment.replace(/_/g, " ");
  }

  return null;
}

function readValidationFieldName(loc: unknown) {
  if (!Array.isArray(loc)) return null;

  for (let index = loc.length - 1; index >= 0; index -= 1) {
    const segment = loc[index];
    if (typeof segment !== "string") continue;
    if (["body", "query", "path"].includes(segment)) continue;
    return apiErrorFieldNames[segment] ?? null;
  }

  return null;
}

function normalizeApiErrorMessage(message: string) {
  return message
    .replace(/^Value error,\s*/i, "")
    .replace(/^Input should be\s*/i, "")
    .trim();
}

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function hasFieldErrors(fieldErrors: FormFieldErrors) {
  return Object.values(fieldErrors).some(Boolean);
}

function clearFieldError(
  setFieldErrors: React.Dispatch<React.SetStateAction<FormFieldErrors>>,
  fieldName: string,
) {
  setFieldErrors((currentErrors) => {
    if (!currentErrors[fieldName]) return currentErrors;
    const nextErrors = { ...currentErrors };
    delete nextErrors[fieldName];
    return nextErrors;
  });
}

function fieldClassName(baseClassName: string, error?: string) {
  if (!error) return baseClassName;
  return `${baseClassName} border-danger-border ring-2 ring-danger-soft`;
}

function validateRequiredText(
  value: string,
  {
    empty,
    minLength,
    min,
    maxLength,
    max,
  }: {
    empty: string;
    minLength?: number;
    min?: string;
    maxLength?: number;
    max?: string;
  },
) {
  if (!value) return empty;
  if (minLength !== undefined && value.length < minLength) {
    return min ?? `Introdu cel puțin ${minLength} caractere.`;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return max ?? `Introdu cel mult ${maxLength} caractere.`;
  }
  return null;
}

function validateOptionalText(
  value: string,
  { maxLength, max }: { maxLength: number; max: string },
) {
  if (value && value.length > maxLength) return max;
  return null;
}

function validateEmail(value: string) {
  if (!value) return "Introdu adresa de e-mail.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value)) {
    return "Introdu o adresă de e-mail validă.";
  }
  return null;
}

function validateContactFields(formData: FormData): FormFieldErrors {
  const errors: FormFieldErrors = {};
  const name = formValue(formData, "name");
  const email = formValue(formData, "email");
  const category = formValue(formData, "category");
  const subject = formValue(formData, "subject");
  const message = formValue(formData, "message");

  errors.name =
    validateRequiredText(name, {
      empty: "Introdu numele tău.",
      minLength: 2,
      min: "Numele trebuie să aibă cel puțin 2 caractere.",
      maxLength: 120,
      max: "Numele poate avea cel mult 120 de caractere.",
    }) ?? undefined;
  errors.email = validateEmail(email) ?? undefined;
  errors.category = category ? undefined : "Alege categoria mesajului.";
  errors.subject =
    validateRequiredText(subject, {
      empty: "Introdu subiectul mesajului.",
      minLength: 3,
      min: "Subiectul trebuie să aibă cel puțin 3 caractere.",
      maxLength: 160,
      max: "Subiectul poate avea cel mult 160 de caractere.",
    }) ?? undefined;
  errors.message =
    validateRequiredText(message, {
      empty: "Scrie mesajul.",
      minLength: 10,
      min: "Mesajul trebuie să aibă cel puțin 10 caractere.",
      maxLength: 5000,
      max: "Mesajul poate avea cel mult 5000 de caractere.",
    }) ?? undefined;

  return errors;
}

function validateContentReportFields(
  formData: FormData,
  attachmentFiles: File[],
): FormFieldErrors {
  const errors: FormFieldErrors = {};
  const name = formValue(formData, "name");
  const email = formValue(formData, "email");
  const reportType = formValue(formData, "reportType");
  const contentReference = formValue(formData, "contentReference");
  const description = formValue(formData, "description");
  const rightsEvidence = formValue(formData, "rightsEvidence");

  errors.name =
    validateRequiredText(name, {
      empty: "Introdu numele tău.",
      minLength: 2,
      min: "Numele trebuie să aibă cel puțin 2 caractere.",
      maxLength: 120,
      max: "Numele poate avea cel mult 120 de caractere.",
    }) ?? undefined;
  errors.email = validateEmail(email) ?? undefined;
  errors.reportType = reportType ? undefined : "Alege tipul sesizării.";
  errors.contentReference =
    validateRequiredText(contentReference, {
      empty: "Adaugă linkul sau identificatorul conținutului.",
      minLength: 3,
      min: "Conținutul trebuie să aibă cel puțin 3 caractere.",
      maxLength: 400,
      max: "Conținutul poate avea cel mult 400 de caractere.",
    }) ?? undefined;
  errors.description =
    validateRequiredText(description, {
      empty: "Descrie problema raportată.",
      minLength: 10,
      min: "Descrierea trebuie să aibă cel puțin 10 caractere.",
      maxLength: 5000,
      max: "Descrierea poate avea cel mult 5000 de caractere.",
    }) ?? undefined;
  errors.rightsEvidence =
    validateOptionalText(rightsEvidence, {
      maxLength: 5000,
      max: "Dovezile pot avea cel mult 5000 de caractere.",
    }) ?? undefined;
  errors.declaration =
    formData.get("declaration") === "on"
      ? undefined
      : "Confirmă declarația privind corectitudinea informațiilor.";
  errors.attachments =
    validateContentReportAttachments(attachmentFiles) ?? undefined;

  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <span
      id={id}
      role="alert"
      className="mt-2 block text-xs font-bold leading-5 text-danger"
    >
      {message}
    </span>
  );
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

function validateContentReportAttachments(files: File[]) {
  if (files.length > contentReportMaxAttachmentFiles) {
    return `Poți atașa cel mult ${contentReportMaxAttachmentFiles} documente.`;
  }

  for (const file of files) {
    const lowerName = file.name.toLowerCase();
    const isAllowedExtension = contentReportAllowedAttachmentExtensions.some(
      (extension) => lowerName.endsWith(extension),
    );
    if (!isAllowedExtension) {
      return "Atașează doar PDF, DOC, DOCX, TXT, RTF, JPG, PNG sau WEBP.";
    }
    if (file.size > contentReportMaxAttachmentBytes) {
      return `Documentul ${file.name} depășește limita de 10MB.`;
    }
  }

  return null;
}

function formatContentReportFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
}

function useRecaptcha(configuredSiteKey: string) {
  const initialRecaptchaSiteKey =
    configuredSiteKey.trim() || clientRecaptchaSiteKey;
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
  const [isRecaptchaReady, setIsRecaptchaReady] = useState(
    !effectiveRecaptchaSiteKey,
  );
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const recaptchaWidgetIdRef = useRef<number | null>(null);

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

  const resetRecaptcha = useCallback(() => {
    if (!effectiveRecaptchaSiteKey || !window.grecaptcha) return;
    window.grecaptcha.reset(recaptchaWidgetIdRef.current ?? undefined);
  }, [effectiveRecaptchaSiteKey]);

  const getRecaptchaToken = useCallback(() => {
    if (!effectiveRecaptchaSiteKey) return "";
    return (
      window.grecaptcha?.getResponse(
        recaptchaWidgetIdRef.current ?? undefined,
      ) ?? ""
    );
  }, [effectiveRecaptchaSiteKey]);

  const markScriptError = useCallback(() => {
    setIsRecaptchaReady(false);
    setRecaptchaError(
      "Scriptul reCAPTCHA nu s-a putut încărca. Încearcă din nou.",
    );
  }, []);

  return {
    siteKey: effectiveRecaptchaSiteKey,
    isResolvingConfig: isResolvingRecaptchaConfig,
    isMissing: isRecaptchaMissing,
    isReady: isRecaptchaReady,
    error: recaptchaError,
    containerRef: recaptchaContainerRef,
    render: renderRecaptcha,
    reset: resetRecaptcha,
    getToken: getRecaptchaToken,
    markScriptError,
  };
}

type ContactFormProps = {
  recaptchaSiteKey: string;
};

export function ContactForm({ recaptchaSiteKey }: ContactFormProps) {
  const recaptcha = useRecaptcha(recaptchaSiteKey);
  const [state, setState] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const isSubmitButtonDisabled =
    isContactSubmitting ||
    recaptcha.isMissing ||
    Boolean(recaptcha.siteKey && recaptcha.error);

  function handleAnotherMessage() {
    setIsContactSubmitting(false);
    setFieldErrors({});
    setState(initialState);
    recaptcha.reset();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isContactSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const nextFieldErrors = validateContactFields(formData);
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setState({
        status: "error",
        message: "Corectează câmpurile marcate înainte de trimitere.",
      });
      return;
    }
    setFieldErrors({});

    if (recaptcha.isMissing) {
      setState({
        status: "error",
        message:
          "reCAPTCHA nu este configurat pe frontend. Adaugă cheia publică și repornește aplicația.",
      });
      return;
    }

    if (recaptcha.error) {
      setState({
        status: "error",
        message: recaptcha.error,
      });
      return;
    }

    if (!recaptcha.isReady) {
      setState({
        status: "error",
        message: "Protecția anti-spam încă se încarcă. Încearcă din nou.",
      });
      return;
    }

    const recaptchaToken = recaptcha.siteKey ? recaptcha.getToken() : "";

    if (recaptcha.siteKey && !recaptchaToken) {
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
      recaptcha.reset();
      setFieldErrors({});
      setState({
        status: "success",
        message:
          response.message ||
          "Mesajul a fost trimis. Îți vom răspunde pe e-mail.",
        registrationNumber: response.registration_number,
      });
    } catch (error) {
      const serverFieldErrors =
        error instanceof ComplianceRequestError ? error.fieldErrors : {};
      if (hasFieldErrors(serverFieldErrors)) {
        setFieldErrors(serverFieldErrors);
      }
      setState({
        status: "error",
        message:
          hasFieldErrors(serverFieldErrors)
            ? "Corectează câmpurile marcate înainte de trimitere."
            : error instanceof Error
              ? error.message
              : "Mesajul nu a putut fi trimis.",
      });
      recaptcha.reset();
    } finally {
      setIsContactSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <div className="rounded-xl border border-subtle bg-surface">
        <ContactFormRow
          label="Nume"
          description="Cum te putem identifica."
        >
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Numele tău"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
            onInput={() => clearFieldError(setFieldErrors, "name")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.name,
            )}
          />
          <FieldError id="contact-name-error" message={fieldErrors.name} />
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
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "contact-email-error" : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "email")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.email,
            )}
          />
          <FieldError id="contact-email-error" message={fieldErrors.email} />
        </ContactFormRow>
        <ContactFormRow
          label="Categorie"
          description="Direcționăm mesajul corect."
        >
          <select
            name="category"
            required
            aria-invalid={Boolean(fieldErrors.category)}
            aria-describedby={
              fieldErrors.category ? "contact-category-error" : undefined
            }
            onChange={() => clearFieldError(setFieldErrors, "category")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.category,
            )}
          >
            <option value="">Alege categoria</option>
            <option value="suport">Suport</option>
            <option value="facturare">Facturare</option>
            <option value="confidentialitate">Confidențialitate</option>
            <option value="raportare_continut">Raportare conținut</option>
          </select>
          <FieldError
            id="contact-category-error"
            message={fieldErrors.category}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Subiect"
          description="Pe scurt, despre ce este vorba."
        >
          <input
            name="subject"
            required
            minLength={3}
            maxLength={160}
            placeholder="Ex: Ajutor cu abonamentul"
            aria-invalid={Boolean(fieldErrors.subject)}
            aria-describedby={
              fieldErrors.subject ? "contact-subject-error" : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "subject")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.subject,
            )}
          />
          <FieldError
            id="contact-subject-error"
            message={fieldErrors.subject}
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
            maxLength={5000}
            placeholder="Scrie mesajul aici..."
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={
              fieldErrors.message ? "contact-message-error" : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "message")}
            className={fieldClassName(
              contactFieldTextareaClassName,
              fieldErrors.message,
            )}
          />
          <FieldError id="contact-message-error" message={fieldErrors.message} />
        </ContactFormRow>
      </div>
      <ContactRecaptcha
        siteKey={recaptcha.siteKey}
        isResolvingConfig={recaptcha.isResolvingConfig}
        containerRef={recaptcha.containerRef}
        isReady={recaptcha.isReady}
        error={recaptcha.error}
        onScriptLoad={recaptcha.render}
        onScriptError={recaptcha.markScriptError}
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

type ContentReportFormProps = {
  recaptchaSiteKey: string;
};

export function ContentReportForm({
  recaptchaSiteKey,
}: ContentReportFormProps) {
  const recaptcha = useRecaptcha(recaptchaSiteKey);
  const [state, setState] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [isContentReportSubmitting, setIsContentReportSubmitting] =
    useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState<
    SelectedContentReportAttachment[]
  >([]);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const nextAttachmentIdRef = useRef(0);
  const isSubmitButtonDisabled =
    isContentReportSubmitting ||
    recaptcha.isMissing ||
    Boolean(recaptcha.siteKey && recaptcha.error);

  function handleAnotherReport() {
    setIsContentReportSubmitting(false);
    setSelectedAttachments([]);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
    setFieldErrors({});
    setState(initialState);
    recaptcha.reset();
  }

  function clearAttachmentInput() {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const incomingFiles = Array.from(event.target.files ?? []).filter(
      (file) => file.size > 0,
    );
    if (incomingFiles.length === 0) {
      clearAttachmentInput();
      return;
    }

    const firstInvalidFileMessage = incomingFiles
      .map((file) => validateContentReportAttachments([file]))
      .find((message): message is string => Boolean(message));
    const validIncomingFiles = incomingFiles.filter(
      (file) => !validateContentReportAttachments([file]),
    );
    const remainingSlots =
      contentReportMaxAttachmentFiles - selectedAttachments.length;
    const acceptedFiles = validIncomingFiles.slice(
      0,
      Math.max(0, remainingSlots),
    );
    const hasExceededLimit = validIncomingFiles.length > remainingSlots;

    if (firstInvalidFileMessage) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        attachments: firstInvalidFileMessage,
      }));
      setState({ status: "error", message: firstInvalidFileMessage });
    } else if (hasExceededLimit) {
      const message =
        `Poți atașa cel mult ${contentReportMaxAttachmentFiles} documente. ` +
        `Am adăugat ${acceptedFiles.length} din selecția curentă.`;
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        attachments: message,
      }));
      setState({
        status: "error",
        message,
      });
    } else {
      clearFieldError(setFieldErrors, "attachments");
      setState(initialState);
    }

    if (acceptedFiles.length === 0) {
      clearAttachmentInput();
      return;
    }

    setSelectedAttachments((currentAttachments) => [
      ...currentAttachments,
      ...acceptedFiles.map((file) => {
        nextAttachmentIdRef.current += 1;
        return {
          id: `${file.name}-${file.size}-${file.lastModified}-${nextAttachmentIdRef.current}`,
          file,
        };
      }),
    ]);
    clearAttachmentInput();
  }

  function removeAttachment(attachmentId: string) {
    setSelectedAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.id !== attachmentId),
    );
    clearFieldError(setFieldErrors, "attachments");
    setState(initialState);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isContentReportSubmitting) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const attachmentFiles = selectedAttachments.map(
      (attachment) => attachment.file,
    );
    const nextFieldErrors = validateContentReportFields(
      formData,
      attachmentFiles,
    );
    if (hasFieldErrors(nextFieldErrors)) {
      setFieldErrors(nextFieldErrors);
      setState({
        status: "error",
        message: "Corectează câmpurile marcate înainte de trimitere.",
      });
      return;
    }
    setFieldErrors({});

    if (recaptcha.isMissing) {
      setState({
        status: "error",
        message:
          "reCAPTCHA nu este configurat pe frontend. Adaugă cheia publică și repornește aplicația.",
      });
      return;
    }

    if (recaptcha.error) {
      setState({
        status: "error",
        message: recaptcha.error,
      });
      return;
    }

    if (!recaptcha.isReady) {
      setState({
        status: "error",
        message: "Protecția anti-spam încă se încarcă. Încearcă din nou.",
      });
      return;
    }

    const recaptchaToken = recaptcha.siteKey ? recaptcha.getToken() : "";

    if (recaptcha.siteKey && !recaptchaToken) {
      setState({
        status: "error",
        message: "Confirmă verificarea anti-spam înainte de trimitere.",
      });
      return;
    }

    setIsContentReportSubmitting(true);
    setState({ status: "submitting", message: null });
    try {
      const payload = new FormData();
      payload.set("name", String(formData.get("name") ?? ""));
      payload.set("email", String(formData.get("email") ?? ""));
      payload.set("report_type", String(formData.get("reportType") ?? ""));
      payload.set(
        "content_reference",
        String(formData.get("contentReference") ?? ""),
      );
      payload.set("description", String(formData.get("description") ?? ""));
      payload.set(
        "rights_evidence",
        String(formData.get("rightsEvidence") ?? ""),
      );
      payload.set("declaration", "true");
      payload.set("recaptcha_token", recaptchaToken);
      for (const file of attachmentFiles) {
        payload.append("attachments", file, file.name);
      }

      const response = await postComplianceMultipart("content-report", payload);
      form.reset();
      setSelectedAttachments([]);
      clearAttachmentInput();
      recaptcha.reset();
      setFieldErrors({});
      setState({
        status: "success",
        message:
          response.message ||
          "Sesizarea a fost înregistrată și va fi analizată.",
        registrationNumber: response.registration_number,
      });
    } catch (error) {
      const serverFieldErrors =
        error instanceof ComplianceRequestError ? error.fieldErrors : {};
      const message =
        error instanceof Error
          ? error.message
          : "Sesizarea nu a putut fi trimisă.";
      if (hasFieldErrors(serverFieldErrors)) {
        setFieldErrors(serverFieldErrors);
      } else if (
        message.includes("Documentul") ||
        message.includes("documente") ||
        message.includes("Atașează")
      ) {
        setFieldErrors((currentErrors) => ({
          ...currentErrors,
          attachments: message,
        }));
      }
      setState({
        status: "error",
        message:
          hasFieldErrors(serverFieldErrors) ||
          message.includes("Documentul") ||
          message.includes("documente") ||
          message.includes("Atașează")
            ? "Corectează câmpurile marcate înainte de trimitere."
            : message,
      });
      recaptcha.reset();
    } finally {
      setIsContentReportSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <div className="rounded-xl border border-subtle bg-surface">
        <ContactFormRow
          label="Nume"
          description="Cum te putem identifica."
        >
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Numele tău"
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={
              fieldErrors.name ? "content-report-name-error" : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "name")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.name,
            )}
          />
          <FieldError
            id="content-report-name-error"
            message={fieldErrors.name}
          />
        </ContactFormRow>
        <ContactFormRow
          label="E-mail"
          description="Aici îți trimitem confirmarea."
        >
          <input
            name="email"
            required
            type="email"
            placeholder="nume@email.ro"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={
              fieldErrors.email ? "content-report-email-error" : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "email")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.email,
            )}
          />
          <FieldError
            id="content-report-email-error"
            message={fieldErrors.email}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Tip"
          description="Alegem fluxul potrivit."
        >
          <select
            name="reportType"
            required
            aria-invalid={Boolean(fieldErrors.reportType)}
            aria-describedby={
              fieldErrors.reportType ? "content-report-type-error" : undefined
            }
            onChange={() => clearFieldError(setFieldErrors, "reportType")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.reportType,
            )}
          >
            <option value="">Alege tipul</option>
            <option value="drepturi_autor">Drepturi de autor</option>
            <option value="date_personale">Date personale</option>
            <option value="continut_incorect">Conținut incorect</option>
            <option value="altul">Alt motiv</option>
          </select>
          <FieldError
            id="content-report-type-error"
            message={fieldErrors.reportType}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Conținut"
          description="Link sau identificator."
        >
          <input
            name="contentReference"
            required
            minLength={3}
            maxLength={400}
            placeholder="URL, titlu proiect sau identificator"
            aria-invalid={Boolean(fieldErrors.contentReference)}
            aria-describedby={
              fieldErrors.contentReference
                ? "content-report-reference-error"
                : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "contentReference")}
            className={fieldClassName(
              contactFieldInputClassName,
              fieldErrors.contentReference,
            )}
          />
          <FieldError
            id="content-report-reference-error"
            message={fieldErrors.contentReference}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Descriere"
          description="Explică problema."
        >
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={5000}
            placeholder="Descrie ce trebuie analizat..."
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description
                ? "content-report-description-error"
                : undefined
            }
            onInput={() => clearFieldError(setFieldErrors, "description")}
            className={fieldClassName(
              contactFieldTextareaClassName,
              fieldErrors.description,
            )}
          />
          <FieldError
            id="content-report-description-error"
            message={fieldErrors.description}
          />
        </ContactFormRow>
        <ContactFormRow
          label="Dovezi"
          description="Linkuri, explicații și documente."
        >
          <div className="grid min-w-0 gap-3">
            <textarea
              name="rightsEvidence"
              maxLength={5000}
              placeholder="Linkuri sau explicații suplimentare..."
              aria-invalid={Boolean(fieldErrors.rightsEvidence)}
              aria-describedby={
                fieldErrors.rightsEvidence
                  ? "content-report-evidence-error"
                  : undefined
              }
              onInput={() => clearFieldError(setFieldErrors, "rightsEvidence")}
              className={fieldClassName(
                contactFieldTextareaClassName,
                fieldErrors.rightsEvidence,
              )}
            />
            <FieldError
              id="content-report-evidence-error"
              message={fieldErrors.rightsEvidence}
            />
            <div className="min-w-0 rounded-lg border border-dashed border-subtle bg-app px-3 py-3">
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept={contentReportAllowedAttachmentExtensions.join(",")}
                onChange={handleAttachmentChange}
                disabled={
                  selectedAttachments.length >= contentReportMaxAttachmentFiles
                }
                aria-label="Adaugă documente"
                aria-invalid={Boolean(fieldErrors.attachments)}
                aria-describedby={
                  fieldErrors.attachments
                    ? "content-report-attachments-error"
                    : undefined
                }
                className="sr-only"
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={
                    selectedAttachments.length >= contentReportMaxAttachmentFiles
                  }
                  className="inline-flex w-fit items-center justify-center rounded-full bg-action px-4 py-2 text-xs font-black text-on-action transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Adaugă documente
                </button>
                <span className="text-xs font-bold text-muted">
                  {selectedAttachments.length}/{contentReportMaxAttachmentFiles}{" "}
                  documente
                </span>
              </div>
              <span className="mt-3 block text-xs leading-5 text-muted">
                PDF, DOC, DOCX, TXT, RTF, JPG, PNG sau WEBP. 10MB fiecare.
              </span>
              <FieldError
                id="content-report-attachments-error"
                message={fieldErrors.attachments}
              />
              {selectedAttachments.length > 0 ? (
                <ul className="mt-3 grid gap-2">
                  {selectedAttachments.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-subtle bg-surface px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-bold text-content">
                          {attachment.file.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-semibold text-muted">
                          {formatContentReportFileSize(attachment.file.size)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="shrink-0 rounded-full border border-subtle px-3 py-1.5 text-xs font-black text-muted transition hover:bg-surface-hover hover:text-content"
                      >
                        Șterge
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </ContactFormRow>
        <ContactFormRow
          label="Declarație"
          description="Confirmare obligatorie."
          isLast
        >
          <span className="flex min-w-0 items-start gap-3 rounded-lg border border-subtle bg-app px-3 py-3 text-xs leading-5 text-muted">
            <input
              name="declaration"
              type="checkbox"
              required
              aria-invalid={Boolean(fieldErrors.declaration)}
              aria-describedby={
                fieldErrors.declaration
                  ? "content-report-declaration-error"
                  : undefined
              }
              onChange={() => clearFieldError(setFieldErrors, "declaration")}
              className="mt-0.5 h-4 w-4 shrink-0 accent-action"
            />
            <span className="min-w-0 break-words">
              Declar că informațiile furnizate sunt corecte și că solicitarea
              este făcută cu bună-credință.
            </span>
          </span>
          <FieldError
            id="content-report-declaration-error"
            message={fieldErrors.declaration}
          />
        </ContactFormRow>
      </div>
      <ContactRecaptcha
        siteKey={recaptcha.siteKey}
        isResolvingConfig={recaptcha.isResolvingConfig}
        containerRef={recaptcha.containerRef}
        isReady={recaptcha.isReady}
        error={recaptcha.error}
        onScriptLoad={recaptcha.render}
        onScriptError={recaptcha.markScriptError}
      />
      <FormStatus state={state} />
      {state.status === "success" ? (
        <button
          key="content-report-success-action"
          type="button"
          onClick={handleAnotherReport}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover sm:w-fit"
        >
          Trimite altă sesizare
        </button>
      ) : (
        <button
          key="content-report-submit-action"
          type="submit"
          disabled={isSubmitButtonDisabled}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60 sm:w-fit"
        >
          {isContentReportSubmitting ? "Se trimite..." : "Trimite sesizarea"}
        </button>
      )}
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
