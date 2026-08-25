import type { Metadata } from "next";
import {
  CompanyDetailsCard,
  ContactForm,
} from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getFallbackCompanyData, getServerCompanyData } from "@/lib/server-legal";

export const metadata: Metadata = {
  title: "Contact și suport",
  description:
    "Trimite o solicitare către Reviss pentru suport, facturare, confidențialitate sau raportare conținut.",
};

export default async function ContactPage() {
  const companyData = (await getServerCompanyData()) ?? getFallbackCompanyData();
  const recaptchaSiteKey =
    process.env.RECAPTCHA_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ||
    "";

  return (
    <LegalPageShell
      eyebrow="Suport"
      title="Contact și suport."
      description="Folosește formularul pentru întrebări despre cont, facturare, date personale sau raportarea conținutului."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="min-w-0">
          <ContactForm recaptchaSiteKey={recaptchaSiteKey} />
        </section>
        <CompanyDetailsCard companyData={companyData} />
      </div>
    </LegalPageShell>
  );
}
