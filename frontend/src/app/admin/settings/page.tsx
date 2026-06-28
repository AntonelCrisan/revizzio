import type { Metadata } from "next";
import { AdminSettingsPage } from "@/components/account/admin-settings-page";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Setări admin | Revizzio",
  description: "Configurări administrative pentru platforma Revizzio.",
};

export default async function AdminSettingsRoute() {
  await requireAdminUser();

  return <AdminSettingsPage />;
}
