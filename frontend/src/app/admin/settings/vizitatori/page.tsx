import type { Metadata } from "next";
import { AdminVisitorVisitsPage } from "@/components/account/admin-visitor-visits-page";
import {
  getServerAdminVisitorStats,
  getServerAdminVisitorVisits,
} from "@/lib/server-admin-visitors";

export const metadata: Metadata = {
  title: "Vizitatori fără cont | Reviss",
  description: "Trafic anonim pe platforma Reviss.",
};

export default async function AdminVisitorVisitsRoute() {
  const [visits, stats] = await Promise.all([
    getServerAdminVisitorVisits({ limit: 200 }),
    getServerAdminVisitorStats(),
  ]);

  return (
    <AdminVisitorVisitsPage
      initialVisits={visits ?? []}
      initialStats={stats}
    />
  );
}
