import type { Metadata } from "next";
import {
  CompanyDetailsCard,
  ContactForm,
} from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Contact și suport | Revizzio",
  description:
    "Trimite o solicitare către Revizzio pentru suport, facturare, confidențialitate sau raportare conținut.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      eyebrow="Suport"
      title="Contact și suport."
      description="Folosește formularul pentru întrebări despre cont, facturare, date personale sau raportarea conținutului."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <ContactForm />
        </section>
        <CompanyDetailsCard />
      </div>
    </LegalPageShell>
  );
}
