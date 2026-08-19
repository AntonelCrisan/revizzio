import type { Metadata } from "next";
import { BillingInvoicesPage } from "@/components/account/billing-invoices-page";

export const metadata: Metadata = {
  title: "Facturi | Reviss",
  description: "Istoricul facturilor pentru abonamentul Reviss.",
};

export default function BillingInvoicesRoute() {
  return <BillingInvoicesPage />;
}
