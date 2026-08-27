import type { Metadata } from "next";
import { AdminUsersPage } from "@/components/account/admin-users-page";
import { getServerAdminUsers } from "@/lib/server-admin-users";

export const metadata: Metadata = {
  title: "Utilizatori | Reviss",
  description: "Administrare utilizatori Reviss.",
};

type AdminUsersRouteProps = {
  searchParams: Promise<{ deleted?: string }>;
};

export default async function AdminUsersRoute({
  searchParams,
}: AdminUsersRouteProps) {
  const users = (await getServerAdminUsers()) ?? [];
  const { deleted } = await searchParams;

  return <AdminUsersPage initialUsers={users} deletedEmail={deleted ?? null} />;
}
