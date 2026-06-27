import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Autentificare | Revizzio",
  description: "Intră în contul tău Revizzio.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Bine ai revenit"
      title="Continuă să construiești pe ce ai învățat."
      description="Intră în cont pentru a-ți relua sesiunile, quiz-urile și progresul exact de unde ai rămas."
      alternateText="Nu ai încă un cont?"
      alternateLabel="Înregistrează-te"
      alternateHref="/register"
      asideTitle="Ritmul tău. Progresul tău."
      asideDescription="Revizzio organizează materialele de curs într-un spațiu calm, clar și ușor de reluat în fiecare zi."
      features={[
        "Quiz-uri adaptate nivelului tău",
        "Progres păstrat între sesiuni",
        "Recapitulări programate inteligent",
      ]}
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
