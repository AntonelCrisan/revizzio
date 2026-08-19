import type { Metadata } from "next";
import { SubscriptionCancellationPage } from "@/components/account/subscription-cancellation-page";

export const metadata: Metadata = {
  title: "Anulare abonament | Reviss",
  description:
    "Oprește reînnoirea automată a abonamentului Reviss direct din cont.",
};

export default function CancelSubscriptionRoute() {
  return <SubscriptionCancellationPage />;
}
