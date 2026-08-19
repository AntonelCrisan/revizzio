import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Creează flashcard | Reviss",
  description: "Creează manual flashcarduri pentru proiectul tău Reviss.",
};

export default function CreeazaFlashcardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return (
    <AccountTabRoutePage
      searchParams={searchParams}
      tab="flashcards"
      flashcardMode="create"
    />
  );
}
