import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Flashcard-uri | Revizzio",
  description: "Flashcard-urile generate pentru proiectul tău Revizzio.",
};

export default function FlashcarduriPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="flashcards" />;
}
