"use client";

import { useState } from "react";
import { legalConfig } from "@/lib/legal-config";

type FormState =
  | { status: "idle"; message: null; registrationNumber?: never }
  | { status: "success"; message: string; registrationNumber?: string }
  | { status: "error"; message: string; registrationNumber?: never };

const initialState: FormState = { status: "idle", message: null };

const inputClassName =
  "mt-1.5 h-12 w-full rounded-2xl border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted/60 focus:border-action focus:ring-4 focus:ring-action-soft";

const textareaClassName =
  "mt-1.5 min-h-32 w-full resize-y rounded-2xl border border-subtle bg-app px-4 py-3 text-sm text-content outline-none transition placeholder:text-muted/60 focus:border-action focus:ring-4 focus:ring-action-soft";

async function postComplianceForm(endpoint: string, payload: object) {
  const response = await fetch(`/api/compliance/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Revizzio-Form-Intent": endpoint,
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
    <label className="block text-sm font-bold text-content">
      {label}
      {children}
    </label>
  );
}

function FormStatus({ state }: { state: FormState }) {
  if (state.status === "idle") return null;

  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${
        state.status === "success"
          ? "border-success-border bg-success-soft text-success"
          : "border-danger-border bg-danger-soft text-danger"
      }`}
    >
      <p>{state.message}</p>
      {state.registrationNumber ? (
        <p className="mt-1 text-xs">
          Număr de înregistrare: {state.registrationNumber}
        </p>
      ) : null}
    </div>
  );
}

export function ContactForm() {
  const [state, setState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    if (formData.get("antiSpam") !== "on") {
      setState({
        status: "error",
        message: "Confirmă protecția anti-spam înainte de trimitere.",
      });
      return;
    }

    setIsSubmitting(true);
    setState(initialState);
    try {
      const response = await postComplianceForm("contact", {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        message: String(formData.get("message") ?? ""),
        category: String(formData.get("category") ?? ""),
      });
      form.reset();
      setState({
        status: "success",
        message:
          response.message ||
          "Mesajul a fost trimis. Îți vom răspunde pe e-mail.",
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Mesajul nu a putut fi trimis.",
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
        <Field label="Categorie">
          <select name="category" required className={inputClassName}>
            <option value="">Alege categoria</option>
            <option value="suport">Suport</option>
            <option value="facturare">Facturare</option>
            <option value="confidentialitate">Confidențialitate</option>
            <option value="raportare_continut">Raportare conținut</option>
          </select>
        </Field>
        <Field label="Subiect">
          <input
            name="subject"
            required
            minLength={3}
            className={inputClassName}
          />
        </Field>
      </div>
      <Field label="Mesaj">
        <textarea
          name="message"
          required
          minLength={10}
          className={textareaClassName}
        />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-subtle bg-app p-4 text-xs leading-5 text-muted">
        <input
          name="antiSpam"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 accent-action"
        />
        Confirm că acest mesaj nu este spam și că informațiile trimise sunt
        corecte.
      </label>
      <FormStatus state={state} />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Se trimite..." : "Trimite mesajul"}
      </button>
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

export function CompanyDetailsCard() {
  return (
    <aside className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
        Date firmă
      </p>
      <dl className="mt-4 space-y-3 text-sm leading-6 text-muted">
        <div>
          <dt className="font-bold text-content">Operator</dt>
          <dd>{legalConfig.companyName}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Sediu social</dt>
          <dd>{legalConfig.registeredOffice}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">CUI</dt>
          <dd>{legalConfig.cui}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Nr. Registrul Comerțului</dt>
          <dd>{legalConfig.tradeRegisterNumber}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">E-mail</dt>
          <dd>{legalConfig.contactEmail}</dd>
        </div>
        <div>
          <dt className="font-bold text-content">Telefon</dt>
          <dd>{legalConfig.phone}</dd>
        </div>
      </dl>
    </aside>
  );
}
