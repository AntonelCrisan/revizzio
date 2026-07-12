import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Creează flashcard | Revizzio",
  description: "Creează manual flashcarduri pentru proiectul tău Revizzio.",
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
