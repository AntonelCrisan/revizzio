import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Resetare parolă | Revizzio",
  description: "Solicită un link pentru resetarea parolei Revizzio.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Recuperează accesul"
      title="Revino la cursurile tale în câteva clipe."
      description="Introdu adresa asociată contului, iar noi îți trimitem instrucțiunile pentru alegerea unei parole noi."
      alternateText="Ți-ai amintit parola?"
      alternateLabel="Înapoi la autentificare"
      alternateHref="/login"
      asideTitle="Progresul tău rămâne aici."
      asideDescription="Resetarea parolei nu afectează cursurile, flashcard-urile sau istoricul sesiunilor tale."
      features={[
        "Link de resetare securizat",
        "Materialele și progresul rămân salvate",
        "Acces rapid înapoi la studiu",
      ]}
    >
      <AuthForm mode="forgot-password" />
    </AuthShell>
  );
}
