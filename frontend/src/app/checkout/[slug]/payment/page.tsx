import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutPaymentPage } from "@/components/account/checkout-payment-page";
import {
  fallbackSubscriptionPlans,
  getServerPublicPlans,
} from "@/lib/server-plans";

export const metadata: Metadata = {
  title: "Plată abonament | Revizzio",
  description: "Finalizează plata pentru abonamentul Revizzio.",
};

type CheckoutPaymentRouteProps = {
  params: Promise<{ slug: string }>;
};

export default async function CheckoutPaymentRoute({
  params,
}: CheckoutPaymentRouteProps) {
  const { slug } = await params;
  const plans = (await getServerPublicPlans()) ?? fallbackSubscriptionPlans;
  const plan = plans.find(
    (currentPlan) => currentPlan.slug === slug && currentPlan.is_visible,
  );

  if (!plan) {
    notFound();
  }

  return <CheckoutPaymentPage plan={plan} />;
}
