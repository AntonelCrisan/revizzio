import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Înregistrare | Revizzio",
  description: "Creează un cont Revizzio.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="Începe gratuit"
      title="Creează-ți un spațiu de studiu care lucrează cu tine."
      description="Un singur cont pentru cursuri, flashcard-uri, quiz-uri și o imagine clară asupra progresului tău."
      alternateText="Ai deja un cont?"
      alternateLabel="Autentifică-te"
      alternateHref="/login"
      asideTitle="Mai puțin haos. Mai multă claritate."
      asideDescription="Transformă notițele în pași mici și măsurabili, într-o interfață concepută pentru concentrare."
      features={[
        "Plan personal de învățare",
        "Flashcard-uri generate din cursuri",
        "Temă luminoasă și Warm Night",
      ]}
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
