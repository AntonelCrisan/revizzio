import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/account-dashboard";

export const metadata: Metadata = {
  title: "Contul meu | Revizzio",
  description: "Gestionează contul și activitatea ta Revizzio.",
};

export default function MyAccountPage() {
  return <AccountDashboard useTabPages />;
}
