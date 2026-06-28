import type { Metadata } from "next";
import { AdminPlansPage } from "@/components/account/admin-plans-page";
import { requireAdminUser } from "@/lib/server-auth";
import {
  fallbackSubscriptionPlans,
  getServerAdminPlans,
} from "@/lib/server-plans";

export const metadata: Metadata = {
  title: "Administrare planuri | Revizzio",
  description: "UI administrativ pentru planurile și prețurile Revizzio.",
};

export default async function AdminPlansRoute() {
  await requireAdminUser();
  const plans = (await getServerAdminPlans()) ?? fallbackSubscriptionPlans;

  return <AdminPlansPage initialPlans={plans} />;
}
