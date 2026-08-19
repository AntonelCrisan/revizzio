import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Chat AI | Reviss",
  description: "Chat AI contextual pentru proiectul tău Reviss.",
};

export default function ChatAiPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="chat" />;
}
