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

type CompanyField = {
  name: keyof CompanyDataUpdate;
  label: string;
  placeholder: string;
};

const fieldGroups: Array<{
  title: string;
  detail: string;
  fields: CompanyField[];
}> = [
  {
    title: "Identitate firmă",
    detail: "Date juridice afișate în documente.",
    fields: [
      { name: "name", label: "Denumire firmă", placeholder: "Reviss SRL" },
      { name: "social_location", label: "Sediu social", placeholder: "Stradă, număr, oraș" },
      { name: "cui", label: "CUI", placeholder: "RO12345678" },
      {
        name: "register_number",
        label: "Nr. Registrul Comerțului",
        placeholder: "J12/1234/2026",
      },
      { name: "social_capital", label: "Capital social", placeholder: "200 RON" },
    ],
  },
  {
    title: "Contact",
    detail: "Canale publice pentru suport și confidențialitate.",
    fields: [
      { name: "email", label: "E-mail contact", placeholder: "contact@reviss.ro" },
      {
        name: "privacy_email",
        label: "E-mail confidențialitate",
        placeholder: "privacy@reviss.ro",
      },
      { name: "phone", label: "Telefon", placeholder: "+40 700 000 000" },
    ],
  },
  {
    title: "Furnizori",
    detail: "Nume afișate în politica publică.",
    fields: [
      { name: "ai_provider", label: "Furnizor AI", placeholder: "OpenAI" },
      { name: "payment_provider", label: "Furnizor plăți", placeholder: "Stripe" },
      { name: "hosting_provider", label: "Furnizor hosting", placeholder: "Vercel" },
    ],
  },
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "necunoscut";

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function CompanyMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-subtle bg-surface p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 font-serif text-2xl font-semibold leading-tight text-content">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 text-sm sm:grid-cols-[7rem_1fr]">
      <dt className="font-bold text-content">{label}</dt>
      <dd className="min-w-0 break-words text-muted">{value || "necompletat"}</dd>
    </div>
  );
}

export function AdminCompanyPage({ initialCompanyData }: AdminCompanyPageProps) {
  const initialFormData = toCompanyUpdate(initialCompanyData);
  const [savedFormData, setSavedFormData] =
    useState<CompanyDataUpdate>(initialFormData);
  const [formData, setFormData] = useState<CompanyDataUpdate>(initialFormData);
  const [lastModified, setLastModified] = useState(
    initialCompanyData.last_date_modified,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(savedFormData);

  async function saveCompanyData() {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const updatedCompanyData = await updateAdminCompanyData(formData);
      const updatedFormData = toCompanyUpdate(updatedCompanyData);
      setFormData(updatedFormData);
      setSavedFormData(updatedFormData);
      setLastModified(updatedCompanyData.last_date_modified);
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
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/admin/settings"
              className="mb-5 flex w-fit items-center rounded-full border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Setări admin
            </Link>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Date firmă
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Datele firmei.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              Completează informațiile folosite în footer, termeni și politica
              de confidențialitate.
            </p>
          </div>

          <span className="inline-flex w-fit rounded-full border border-subtle bg-surface px-5 py-3 text-sm font-bold text-content">
            Ultima modificare: {formatDate(lastModified)}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <CompanyMetric
            label="Identitate"
            value={formData.name || "Firmă"}
            detail={formData.cui || "CUI necompletat"}
          />
          <CompanyMetric
            label="Contact"
            value={formData.email || "E-mail"}
            detail={formData.phone || "telefon necompletat"}
          />
          <CompanyMetric
            label="Furnizori"
            value={formData.payment_provider || "Plăți"}
            detail={`${formData.ai_provider || "AI"} · ${formData.hosting_provider || "hosting"}`}
          />
        </div>

        {statusMessage ? (
          <div className="rounded-xl border border-info-border bg-info-soft px-5 py-4 text-sm font-bold text-info">
            {statusMessage}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form
            className="rounded-xl border border-subtle bg-surface"
            onSubmit={(event) => {
              event.preventDefault();
              if (!hasChanges || isSaving) return;
              void saveCompanyData();
            }}
          >
            {fieldGroups.map((group, index) => (
              <section
                key={group.title}
                className={`${index > 0 ? "border-t border-subtle" : ""} p-5`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="text-xs font-black uppercase tracking-[0.18em] text-muted">
                    {group.title}
                  </h2>
                  <span className="text-xs font-bold text-muted">
                    {group.detail}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <label key={field.name} className="block">
                      <span className="text-sm font-bold text-content">
                        {field.label}
                      </span>
                      <input
                        name={field.name}
                        value={formData[field.name]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            [field.name]: event.target.value,
                          }))
                        }
                        className="mt-2 h-12 w-full rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex flex-col gap-3 border-t border-subtle p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormData(savedFormData);
                  setStatusMessage(null);
                }}
                disabled={!hasChanges || isSaving}
                className="rounded-full border border-subtle bg-app px-5 py-3 text-sm font-bold text-content transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resetează
              </button>
              <button
                type="submit"
                disabled={!hasChanges || isSaving}
                className="rounded-full bg-action px-5 py-3 text-sm font-black text-on-action transition hover:bg-action-hover disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? "Se salvează..." : "Salvează datele"}
              </button>
            </div>
          </form>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Preview footer
              </p>
              <dl className="mt-4 divide-y divide-subtle border-y border-subtle">
                <PreviewRow label="Firmă" value={formData.name} />
                <PreviewRow label="CUI" value={formData.cui} />
                <PreviewRow label="Registru" value={formData.register_number} />
                <PreviewRow label="Sediu" value={formData.social_location} />
                <PreviewRow label="Contact" value={formData.email} />
                <PreviewRow label="Telefon" value={formData.phone} />
              </dl>
            </section>

            <section className="rounded-xl border border-subtle bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                Variabile legale
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["{name}", "{email}", "{phone}", "{cui}"].map((variable) => (
                  <code
                    key={variable}
                    className="rounded-full border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted"
                  >
                    {variable}
                  </code>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AccountStaticShell>
  );
}
