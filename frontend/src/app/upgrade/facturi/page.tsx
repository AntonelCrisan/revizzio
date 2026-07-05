import type { Metadata } from "next";
import { BillingInvoicesPage } from "@/components/account/billing-invoices-page";

export const metadata: Metadata = {
  title: "Facturi | Revizzio",
  description: "Istoricul facturilor pentru abonamentul Revizzio.",
};

export default function BillingInvoicesRoute() {
  return <BillingInvoicesPage />;
}
