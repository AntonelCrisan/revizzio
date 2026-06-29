import type { Metadata } from "next";
import { UpgradePage } from "@/components/account/upgrade-page";
import {
  fallbackSubscriptionPlans,
  getServerPublicPlans,
} from "@/lib/server-plans";

export const metadata: Metadata = {
  title: "Abonament | Revizzio",
  description: "Alege planul Revizzio potrivit pentru studiul tău.",
};

export default async function UpgradeRoute() {
  const plans = (await getServerPublicPlans()) ?? fallbackSubscriptionPlans;

  return <UpgradePage plans={plans} />;
}
