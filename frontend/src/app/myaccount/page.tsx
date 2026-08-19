import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account/account-dashboard";

export const metadata: Metadata = {
  title: "Contul meu | Reviss",
  description: "Gestionează contul și activitatea ta Reviss.",
};

export default function MyAccountPage() {
  return <AccountDashboard useTabPages />;
}
