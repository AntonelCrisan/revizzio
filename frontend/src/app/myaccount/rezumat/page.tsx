import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Rezumat | Reviss",
  description: "Rezumatul complet al proiectului tău Reviss.",
};

export default function RezumatPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="rezumat" />;
}
