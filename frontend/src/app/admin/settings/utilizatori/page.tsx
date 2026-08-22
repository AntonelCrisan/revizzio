import type { Metadata } from "next";
import { AdminUsersPage } from "@/components/account/admin-users-page";
import { getServerAdminUsers } from "@/lib/server-admin-users";

export const metadata: Metadata = {
  title: "Utilizatori | Reviss",
  description: "Administrare utilizatori Reviss.",
};

export default async function AdminUsersRoute() {
  const users = (await getServerAdminUsers()) ?? [];

  return <AdminUsersPage initialUsers={users} />;
}
