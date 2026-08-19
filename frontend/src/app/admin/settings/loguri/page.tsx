import type { Metadata } from "next";
import { AdminAuditLogsPage } from "@/components/account/admin-audit-logs-page";
import { getServerAdminAuditLogs } from "@/lib/server-admin-audit";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Jurnal activitate | Reviss",
  description: "Audit logs pentru platforma Reviss.",
};

export default async function AdminAuditLogsRoute() {
  await requireAdminUser();
  const logs = (await getServerAdminAuditLogs({ limit: 200 })) ?? [];

  return <AdminAuditLogsPage initialLogs={logs} />;
}
