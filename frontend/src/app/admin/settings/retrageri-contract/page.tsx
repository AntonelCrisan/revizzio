import type { Metadata } from "next";
import { AdminWithdrawalRequestsPage } from "@/components/account/admin-withdrawal-requests-page";
import { getServerAdminWithdrawalRequests } from "@/lib/server-admin-withdrawal-requests";

export const metadata: Metadata = {
  title: "Retrageri contract | Reviss",
  description: "Cereri trimise prin formularul public de retragere din contract.",
};

export default async function AdminWithdrawalRequestsRoute() {
  const requests = (await getServerAdminWithdrawalRequests({ limit: 200 })) ?? [];

  return <AdminWithdrawalRequestsPage initialRequests={requests} />;
}
