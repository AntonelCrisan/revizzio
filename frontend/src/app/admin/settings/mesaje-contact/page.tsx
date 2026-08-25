import type { Metadata } from "next";
import { AdminContactMessagesPage } from "@/components/account/admin-contact-messages-page";
import { getServerAdminContactMessages } from "@/lib/server-admin-contact-messages";

export const metadata: Metadata = {
  title: "Mesaje contact | Reviss",
  description: "Mesaje trimise prin formularul public de contact.",
};

export default async function AdminContactMessagesRoute() {
  const messages = (await getServerAdminContactMessages({ limit: 200 })) ?? [];

  return <AdminContactMessagesPage initialMessages={messages} />;
}
