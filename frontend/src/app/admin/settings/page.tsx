import type { Metadata } from "next";
import { AdminSettingsPage } from "@/components/account/admin-settings-page";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Setări admin | Reviss",
  description: "Configurări administrative pentru platforma Reviss.",
};

export default async function AdminSettingsRoute() {
  await requireAdminUser();

  return <AdminSettingsPage />;
}
