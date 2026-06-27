import type { Metadata } from "next";
import { UpgradePage } from "@/components/account/upgrade-page";

export const metadata: Metadata = {
  title: "Upgrade plan | Revizzio",
  description: "Alege planul Revizzio potrivit pentru studiul tau.",
};

export default function UpgradeRoute() {
  return <UpgradePage />;
}
