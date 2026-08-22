import type { Metadata } from "next";
import { AdminSettingsPage } from "@/components/account/admin-settings-page";

export const metadata: Metadata = {
  title: "Setări admin | Reviss",
  description: "Configurări administrative pentru platforma Reviss.",
};

export default function AdminSettingsRoute() {
  return <AdminSettingsPage />;
}
