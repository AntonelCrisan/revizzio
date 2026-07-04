import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailClient } from "@/components/auth/verify-email-client";

export const metadata: Metadata = {
  title: "Confirmare email | Revizzio",
  description: "Confirmă adresa de email pentru contul tău Revizzio.",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Confirmare email"
      title="Validăm adresa înainte să creăm contul."
      description="Acest pas păstrează platforma curată și confirmă că adresa îți aparține."
      alternateText="Ai deja cont confirmat?"
      alternateLabel="Intră în cont"
      alternateHref="/login"
      asideTitle="Un cont sigur pornește cu o adresă verificată."
      asideDescription="După confirmare vei fi autentificat automat și trimis în spațiul tău de studiu."
      features={[
        "Validare înainte de creare cont",
        "Sesiune creată automat după confirmare",
        "Link cu expirare și utilizare unică",
      ]}
    >
      <VerifyEmailClient token={token} />
    </AuthShell>
  );
}
