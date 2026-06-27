import type { Metadata } from "next";
import { SubscriptionCancellationPage } from "@/components/account/subscription-cancellation-page";

export const metadata: Metadata = {
  title: "Anulare abonament | Revizzio",
  description:
    "Oprește reînnoirea automată a abonamentului Revizzio direct din cont.",
};

export default function CancelSubscriptionRoute() {
  return <SubscriptionCancellationPage />;
}
