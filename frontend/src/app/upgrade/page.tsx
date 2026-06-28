import type { Metadata } from "next";
import { UpgradePage } from "@/components/account/upgrade-page";

export const metadata: Metadata = {
  title: "Abonament | Revizzio",
  description: "Alege planul Revizzio potrivit pentru studiul tău.",
};

export default function UpgradeRoute() {
  return <UpgradePage />;
}
