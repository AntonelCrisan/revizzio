import type { Metadata } from "next";
import { AdminContentReportsPage } from "@/components/account/admin-content-reports-page";
import { getServerAdminContentReports } from "@/lib/server-admin-content-reports";

export const metadata: Metadata = {
  title: "Raportări conținut | Reviss",
  description: "Sesizări trimise prin formularul public de raportare conținut.",
};

export default async function AdminContentReportsRoute() {
  const reports = (await getServerAdminContentReports({ limit: 200 })) ?? [];

  return <AdminContentReportsPage initialReports={reports} />;
}
