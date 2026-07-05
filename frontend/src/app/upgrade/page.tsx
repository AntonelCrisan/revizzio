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

type UpgradeRouteProps = {
  searchParams: Promise<{
    checkout?: string;
    session_id?: string;
  }>;
};

export default async function UpgradeRoute({ searchParams }: UpgradeRouteProps) {
  const checkoutParams = await searchParams;
  const plans = (await getServerPublicPlans()) ?? fallbackSubscriptionPlans;

  return (
    <UpgradePage
      plans={plans}
      checkoutSessionId={checkoutParams.session_id}
      checkoutStatus={checkoutParams.checkout}
    />
  );
}
