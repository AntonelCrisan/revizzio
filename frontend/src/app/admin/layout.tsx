import type { Metadata } from "next";
import { noIndexRobots } from "@/lib/seo";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  robots: noIndexRobots,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminUser();

  return children;
}
