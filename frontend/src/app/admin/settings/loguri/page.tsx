import type { Metadata } from "next";
import { AdminAuditLogsPage } from "@/components/account/admin-audit-logs-page";
import {
  getServerAdminAuditLogs,
  getServerAdminVisitorStats,
} from "@/lib/server-admin-audit";

export const metadata: Metadata = {
  title: "Jurnal activitate | Reviss",
  description: "Audit logs pentru platforma Reviss.",
};

export default async function AdminAuditLogsRoute() {
  const [logs, visitorStats] = await Promise.all([
    getServerAdminAuditLogs({ limit: 200 }),
    getServerAdminVisitorStats(),
  ]);

  return (
    <AdminAuditLogsPage
      initialLogs={logs ?? []}
      initialVisitorStats={visitorStats}
    />
  );
}
