import type { Metadata } from "next";
import { AdminAiRatesPage } from "@/components/account/admin-ai-rates-page";

export const metadata: Metadata = {
  title: "AI Credits și cost | Reviss",
  description: "UI administrativ pentru pragurile de credite AI și costul per model.",
};

export default function AdminAiRatesRoute() {
  return <AdminAiRatesPage />;
}
