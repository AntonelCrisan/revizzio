"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type CompanyData,
  type CompanyDataUpdate,
  updateAdminCompanyData,
} from "@/lib/legal-api";

type AdminCompanyPageProps = {
  initialCompanyData: CompanyData;
};

const fieldLabels: Array<{ name: keyof CompanyDataUpdate; label: string }> = [
  { name: "name", label: "Denumire firma" },
  { name: "social_location", label: "Sediu social" },
  { name: "cui", label: "CUI" },
  { name: "register_number", label: "Nr. Registrul Comertului" },
  { name: "social_capital", label: "Capital social" },
  { name: "email", label: "E-mail contact" },
  { name: "privacy_email", label: "E-mail confidențialitate" },
  { name: "phone", label: "Telefon" },
  { name: "ai_provider", label: "Furnizor AI" },
  { name: "payment_provider", label: "Furnizor plati" },
  { name: "hosting_provider", label: "Furnizor hosting" },
];

function toCompanyUpdate(companyData: CompanyData): CompanyDataUpdate {
  return {
    name: companyData.name,
    social_location: companyData.social_location,
    cui: companyData.cui,
    register_number: companyData.register_number,
    social_capital: companyData.social_capital,
    email: companyData.email,
    privacy_email: companyData.privacy_email,
    phone: companyData.phone,
    ai_provider: companyData.ai_provider,
    payment_provider: companyData.payment_provider,
    hosting_provider: companyData.hosting_provider,
  };
}

export function AdminCompanyPage({ initialCompanyData }: AdminCompanyPageProps) {
  const [formData, setFormData] = useState<CompanyDataUpdate>(
    toCompanyUpdate(initialCompanyData),
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveCompanyData() {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const updatedCompanyData = await updateAdminCompanyData(formData);
      setFormData(toCompanyUpdate(updatedCompanyData));
      setStatusMessage("Datele firmei au fost salvate.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Datele firmei nu au putut fi salvate.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-6">
        <div className="rounded-[2rem] border border-subtle bg-surface p-6 sm:p-8">
          <Link
            href="/admin/settings"
            className="text-sm font-bold text-muted transition hover:text-content"
          >
            &lt;- Înapoi la setări admin
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Setări globale aplicație și firmă
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight">
            Datele firmei
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            Completeaza informatiile care apar in footer si in documentele
            juridice. Placeholder-ele din textele legale, precum {"{phone}"} sau
            {"{email}"}, citesc aceste valori.
          </p>
        </div>

        {statusMessage ? (
          <div className="rounded-2xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <form className="rounded-[2rem] border border-subtle bg-surface p-4 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {fieldLabels.map((field) => (
              <label key={field.name} className="block">
                <span className="text-sm font-bold text-content">{field.label}</span>
                <input
                  name={field.name}
                  value={formData[field.name]}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      [field.name]: event.target.value,
                    }))
                  }
                  className="mt-2 h-12 w-full rounded-2xl border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
                />
              </label>
            ))}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-subtle bg-app p-5">
            <p className="text-sm font-black">Preview footer</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              {formData.name} | {formData.cui} | {formData.register_number}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {formData.social_location}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              {formData.email} | {formData.phone}
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setFormData(toCompanyUpdate(initialCompanyData));
                setStatusMessage(null);
              }}
              className="rounded-2xl border border-subtle bg-app px-5 py-3 text-sm font-bold transition hover:bg-surface-hover"
            >
              Reseteaza
            </button>
            <button
              type="button"
              onClick={saveCompanyData}
              disabled={isSaving}
              className="rounded-2xl bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isSaving ? "Se salvează..." : "Salvează datele firmei"}
            </button>
          </div>
        </form>
      </section>
    </AccountStaticShell>
  );
}
