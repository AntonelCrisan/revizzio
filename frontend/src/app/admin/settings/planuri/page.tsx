import type { Metadata } from "next";
import { AdminPlansPage } from "@/components/account/admin-plans-page";
import {
  fallbackAdminSubscriptionPlans,
  getServerAdminPlans,
} from "@/lib/server-plans";

export const metadata: Metadata = {
  title: "Administrare planuri | Reviss",
  description: "UI administrativ pentru planurile și prețurile Reviss.",
};

export default async function AdminPlansRoute() {
  const plans = (await getServerAdminPlans()) ?? fallbackAdminSubscriptionPlans;

  return <AdminPlansPage initialPlans={plans} />;
}
