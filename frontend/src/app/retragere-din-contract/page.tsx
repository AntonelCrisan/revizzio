import type { Metadata } from "next";
import {
  CompanyDetailsCard,
  WithdrawalForm,
} from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getFallbackCompanyData, getServerCompanyData } from "@/lib/server-legal";

export const metadata: Metadata = {
  title: "Retragere din contract | Reviss",
  description:
    "Formular pentru exercitarea dreptului de retragere din contract pentru abonamente sau comenzi Reviss.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function WithdrawalPage() {
  const companyData = (await getServerCompanyData()) ?? getFallbackCompanyData();
  const recaptchaSiteKey =
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    "";

  return (
    <LegalPageShell
      eyebrow="Drept de retragere"
      title="Retragere din contract."
      description="Completează formularul pentru înregistrarea unei solicitări de retragere. Vei primi un număr de înregistrare după trimitere."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          <WithdrawalForm recaptchaSiteKey={recaptchaSiteKey} />
        </section>
        <CompanyDetailsCard companyData={companyData} />
      </div>
    </LegalPageShell>
  );
}
