"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import {
  type CompanyData,
  type CompanyDataUpdate,
  updateAdminCompanyData,
} from "@/lib/legal-api";
import { toast } from "@/lib/toast-store";

type AdminCompanyPageProps = {
  initialCompanyData: CompanyData;
  initialLoadError?: string | null;
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
      {
        name: "ai_provider",
        label: "Furnizor AI",
        placeholder: "Serviciu de generare",
      },
      { name: "payment_provider", label: "Furnizor plăți", placeholder: "Stripe" },
      { name: "hosting_provider", label: "Furnizor hosting", placeholder: "Vercel" },
    ],
  },
  {
    title: "Social media",
    detail: "Linkuri afișate în secțiunea „Urmărește-ne” de pe /contact.",
    fields: [
      {
        name: "social_facebook_url",
        label: "Facebook",
        placeholder: "https://facebook.com/reviss",
      },
      {
        name: "social_instagram_url",
        label: "Instagram",
        placeholder: "https://instagram.com/reviss",
      },
      {
        name: "social_tiktok_url",
        label: "TikTok",
        placeholder: "https://tiktok.com/@reviss",
      },
      {
        name: "social_linkedin_url",
        label: "LinkedIn",
        placeholder: "https://linkedin.com/company/reviss",
      },
      {
        name: "social_youtube_url",
        label: "YouTube",
        placeholder: "https://youtube.com/@reviss",
      },
      {
        name: "social_x_url",
        label: "X (Twitter)",
        placeholder: "https://x.com/reviss",
      },
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
    social_facebook_url: companyData.social_facebook_url,
    social_instagram_url: companyData.social_instagram_url,
    social_tiktok_url: companyData.social_tiktok_url,
    social_linkedin_url: companyData.social_linkedin_url,
    social_youtube_url: companyData.social_youtube_url,
    social_x_url: companyData.social_x_url,
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
    <article className="min-w-0 rounded-xl border border-subtle bg-surface p-5">
      <p className="break-words text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 min-w-0 break-words font-serif text-xl font-semibold leading-tight text-content sm:text-2xl">
        {value}
      </p>
      <p className="mt-2 min-w-0 break-words text-sm leading-6 text-muted">
        {detail}
      </p>
    </article>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
      <dt className="min-w-0 break-words font-bold text-content">{label}</dt>
      <dd className="min-w-0 break-words text-muted">{value || "necompletat"}</dd>
    </div>
  );
}

type CompanySaveState = "idle" | "saving" | "saved";

function saveButtonText(
  saveState: CompanySaveState,
  hasChanges: boolean,
  justSaved: boolean,
) {
  if (saveState === "saving") return "Se salvează...";
  if (justSaved || !hasChanges) return "Salvat";
  return "Salvează datele";
}

function saveButtonClassName(
  hasChanges: boolean,
  isSaving: boolean,
  justSaved: boolean,
) {
  const baseClassName =
    "inline-flex min-h-12 w-full min-w-0 items-center justify-center rounded-md px-5 py-3 text-center text-sm font-black leading-tight transition disabled:cursor-not-allowed sm:w-auto";

  if ((justSaved || !hasChanges) && !isSaving) {
    return `${baseClassName} border border-success-border bg-success-soft text-success disabled:opacity-100`;
  }

  return `${baseClassName} bg-action text-on-action hover:bg-action-hover disabled:opacity-60`;
}

export function AdminCompanyPage({
  initialCompanyData,
  initialLoadError = null,
}: AdminCompanyPageProps) {
  const router = useRouter();
  const initialFormData = toCompanyUpdate(initialCompanyData);
  const [savedFormData, setSavedFormData] =
    useState<CompanyDataUpdate>(initialFormData);
  const [formData, setFormData] = useState<CompanyDataUpdate>(initialFormData);
  const [lastModified, setLastModified] = useState(
    initialCompanyData.last_date_modified,
  );
  const [saveState, setSaveState] = useState<CompanySaveState>("idle");
  const [justSaved, setJustSaved] = useState(false);
  const isSaving = saveState === "saving";
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(savedFormData);
  const isSubmitDisabled = !hasChanges || isSaving || justSaved;
  const saveButtonLabel = saveButtonText(saveState, hasChanges, justSaved);
  const saveButtonStyles = saveButtonClassName(hasChanges, isSaving, justSaved);

  // The server component hands over a load failure as a prop, so it is raised
  // once the page is on screen rather than rendered as a banner above the form.
  useEffect(() => {
    if (initialLoadError) {
      toast.error(initialLoadError);
    }
  }, [initialLoadError]);

  function updateField(name: keyof CompanyDataUpdate, value: string) {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    if (saveState === "saved") {
      setSaveState("idle");
    }
    if (justSaved) {
      setJustSaved(false);
    }
  }

  async function saveCompanyData() {
    setSaveState("saving");
    try {
      const updatedCompanyData = await updateAdminCompanyData(formData);
      const updatedFormData = toCompanyUpdate(updatedCompanyData);
      setFormData(updatedFormData);
      setSavedFormData(updatedFormData);
      setLastModified(updatedCompanyData.last_date_modified);
      toast.success("Datele firmei au fost salvate.");
      setSaveState("saved");
      setJustSaved(true);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Datele firmei nu au putut fi salvate.",
      );
      setSaveState("idle");
      setJustSaved(false);
    }
  }

  return (
    <AccountStaticShell activePage="admin-settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link
              href="/admin/settings"
              className="mb-5 flex w-fit max-w-full items-center rounded-md border border-subtle bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:bg-surface-hover hover:text-content"
            >
              ← Setări admin
            </Link>
            <p className="inline-flex max-w-full rounded-md border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              Date firmă
            </p>
            <h1 className="mt-3 max-w-3xl break-words font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              Datele firmei.
            </h1>
            <p className="mt-3 max-w-2xl break-words text-sm leading-6 text-muted">
              Completează informațiile folosite în footer, termeni și politica
              de confidențialitate.
            </p>
          </div>

          <span className="inline-flex w-fit max-w-full rounded-md border border-subtle bg-surface px-5 py-3 text-sm font-bold leading-tight text-content">
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

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <form
            className="min-w-0 overflow-hidden rounded-xl border border-subtle bg-surface"
            onSubmit={(event) => {
              event.preventDefault();
              if (isSubmitDisabled) return;
              void saveCompanyData();
            }}
          >
            {fieldGroups.map((group, index) => (
              <section
                key={group.title}
                className={`${index > 0 ? "border-t border-subtle" : ""} p-5`}
              >
                <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <h2 className="min-w-0 break-words text-xs font-black uppercase tracking-[0.18em] text-muted">
                    {group.title}
                  </h2>
                  <span className="min-w-0 break-words text-xs font-bold text-muted sm:text-right">
                    {group.detail}
                  </span>
                </div>

                <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <label key={field.name} className="block min-w-0">
                      <span className="block min-w-0 break-words text-sm font-bold text-content">
                        {field.label}
                      </span>
                      <input
                        name={field.name}
                        value={formData[field.name]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          updateField(field.name, event.target.value)
                        }
                        className="mt-2 h-12 w-full min-w-0 rounded-lg border border-subtle bg-app px-4 text-sm text-content outline-none transition placeholder:text-muted focus:border-action"
                      />
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex min-w-0 flex-col gap-3 border-t border-subtle p-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormData(savedFormData);
                  setSaveState("idle");
                  setJustSaved(false);
                }}
                disabled={!hasChanges || isSaving}
                className="inline-flex min-h-12 w-full min-w-0 items-center justify-center rounded-md border border-subtle bg-app px-5 py-3 text-center text-sm font-bold leading-tight text-content transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                Resetează
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className={saveButtonStyles}
              >
                {saveButtonLabel}
              </button>
            </div>
          </form>

          <aside className="min-w-0 space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section className="min-w-0 rounded-xl border border-subtle bg-surface p-5">
              <p className="break-words text-xs font-black uppercase tracking-[0.16em] text-muted">
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

            <section className="min-w-0 rounded-xl border border-subtle bg-surface p-5">
              <p className="break-words text-xs font-black uppercase tracking-[0.16em] text-muted">
                Variabile legale
              </p>
              <div className="mt-4 flex min-w-0 flex-wrap gap-2">
                {["{name}", "{email}", "{phone}", "{cui}"].map((variable) => (
                  <code
                    key={variable}
                    className="max-w-full break-all rounded-md border border-subtle bg-app px-3 py-1 text-xs font-bold text-muted"
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
