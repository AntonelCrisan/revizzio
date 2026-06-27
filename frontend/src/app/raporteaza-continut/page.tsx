import type { Metadata } from "next";
import { ContentReportForm } from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Raportează conținut | Revizzio",
  description:
    "Raportează conținut incorect, conținut care include date personale sau posibile încălcări de drepturi.",
};

export default function ContentReportPage() {
  return (
    <LegalPageShell
      eyebrow="Sesizări"
      title="Raportează conținut."
      description="Trimite detalii despre materialul sau conținutul generat care trebuie analizat de echipa Revizzio."
    >
      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <ContentReportForm />
      </section>
    </LegalPageShell>
  );
}
