import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminUserDetailPage } from "@/components/account/admin-user-detail-page";
import { getServerAdminUser } from "@/lib/server-admin-users";

export const metadata: Metadata = {
  title: "Detalii utilizator | Reviss",
  description: "Date administrative pentru utilizator.",
};

type AdminUserRouteProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserRoute({ params }: AdminUserRouteProps) {
  const { id } = await params;
  const user = await getServerAdminUser(id);

  if (!user) {
    notFound();
  }

  return <AdminUserDetailPage user={user} />;
}
