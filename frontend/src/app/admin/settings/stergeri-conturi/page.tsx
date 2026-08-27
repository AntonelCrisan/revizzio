import type { Metadata } from "next";
import { AdminAccountDeletionRequestsPage } from "@/components/account/admin-account-deletion-requests-page";
import { getServerAdminAccountDeletionRequests } from "@/lib/server-admin-account-deletion-requests";

export const metadata: Metadata = {
  title: "Ștergeri conturi | Reviss",
  description: "Solicitări de ștergere cont trimise de utilizatori.",
};

export default async function AdminAccountDeletionRequestsRoute() {
  const requests =
    (await getServerAdminAccountDeletionRequests({ limit: 200 })) ?? [];

  return <AdminAccountDeletionRequestsPage initialRequests={requests} />;
}
