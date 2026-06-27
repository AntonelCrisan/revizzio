import type { Metadata } from "next";
import { WithdrawalForm } from "@/components/legal/compliance-forms";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = {
  title: "Retragere din contract | Revizzio",
  description:
    "Formular pentru exercitarea dreptului de retragere din contract pentru abonamente sau comenzi Revizzio.",
};

export default function WithdrawalPage() {
  return (
    <LegalPageShell
      eyebrow="Drept de retragere"
      title="Retragere din contract."
      description="Completează formularul pentru înregistrarea unei solicitări de retragere. Vei primi un număr de înregistrare după trimitere."
    >
      <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
        <WithdrawalForm />
      </section>
    </LegalPageShell>
  );
}
