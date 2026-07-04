import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Parolă nouă | Revizzio",
  description: "Setează o parolă nouă pentru contul tău Revizzio.",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Parolă nouă"
      title="Alege o parolă nouă și revino în cont."
      description="Linkul de resetare poate fi folosit o singură dată, apoi sesiunile vechi sunt închise automat."
      alternateText="Ți-ai amintit parola?"
      alternateLabel="Înapoi la autentificare"
      alternateHref="/login"
      asideTitle="Resetare sigură, fără să pierzi progresul."
      asideDescription="Materialele, quiz-urile și flashcard-urile rămân salvate în contul tău."
      features={[
        "Token cu expirare automată",
        "Sesiunile vechi se închid după resetare",
        "Progresul rămâne neschimbat",
      ]}
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
