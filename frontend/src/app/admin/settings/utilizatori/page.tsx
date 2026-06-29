import type { Metadata } from "next";
import { AdminUsersPage } from "@/components/account/admin-users-page";
import { getServerAdminUsers } from "@/lib/server-admin-users";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Utilizatori | Revizzio",
  description: "Administrare utilizatori Revizzio.",
};

export default async function AdminUsersRoute() {
  await requireAdminUser();
  const users = (await getServerAdminUsers()) ?? [];

  return <AdminUsersPage initialUsers={users} />;
}
