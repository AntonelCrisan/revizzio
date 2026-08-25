import type { Metadata } from "next";
import {
  CompanyDetailsCard,
  ContentReportForm,
} from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getFallbackCompanyData, getServerCompanyData } from "@/lib/server-legal";

export const metadata: Metadata = {
  title: "Raportează conținut | Reviss",
  description:
    "Raportează conținut incorect, conținut care include date personale sau posibile încălcări de drepturi.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContentReportPage() {
  const companyData = (await getServerCompanyData()) ?? getFallbackCompanyData();
  const recaptchaSiteKey =
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    "";

  return (
    <LegalPageShell
      eyebrow="Sesizări"
      title="Raportează conținut."
      description="Trimite detalii despre materialul sau conținutul generat care trebuie analizat de echipa Reviss."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          <ContentReportForm recaptchaSiteKey={recaptchaSiteKey} />
        </section>
        <CompanyDetailsCard companyData={companyData} />
      </div>
    </LegalPageShell>
  );
}
