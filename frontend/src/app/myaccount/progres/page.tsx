import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Progres | Reviss",
  description: "Progresul proiectului tău Reviss.",
};

export default function ProgresPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="progres" />;
}
