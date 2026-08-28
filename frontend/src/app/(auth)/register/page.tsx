import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Înregistrare | Reviss",
  description: "Creează un cont Reviss.",
};

type RegisterPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function googleErrorMessage(error: string | undefined) {
  if (error === "google_oauth") {
    return "Autentificarea prin Google a eșuat. Încearcă din nou.";
  }
  return undefined;
}

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { error } = await searchParams;

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
      <AuthForm
        mode="register"
        initialError={googleErrorMessage(firstSearchParam(error))}
      />
    </AuthShell>
  );
}
