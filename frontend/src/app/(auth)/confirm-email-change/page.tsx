import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ConfirmEmailChangeClient } from "@/components/auth/confirm-email-change-client";

export const metadata: Metadata = {
  title: "Confirmare email nou | Reviss",
  description: "Confirmă noua adresă de email pentru contul tău Reviss.",
};

type ConfirmEmailChangePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ConfirmEmailChangePage({
  searchParams,
}: ConfirmEmailChangePageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Confirmare email"
      title="Confirmăm noua ta adresă de email."
      description="Acest pas ne asigură că adresa nouă îți aparține înainte să o legăm de cont."
      alternateText="Ți-ai amintit adresa veche?"
      alternateLabel="Intră în cont"
      alternateHref="/login"
      asideTitle="Contul tău rămâne neschimbat în rest."
      asideDescription="Materialele, quiz-urile și flashcard-urile rămân salvate. Doar adresa de email se actualizează."
      features={[
        "Confirmare din emailul trimis la adresa nouă",
        "Link cu expirare și utilizare unică",
        "Restul contului rămâne neschimbat",
      ]}
    >
      <ConfirmEmailChangeClient token={token} />
    </AuthShell>
  );
}
