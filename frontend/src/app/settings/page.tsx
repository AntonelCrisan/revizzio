import type { Metadata } from "next";
import { SettingsPage } from "@/components/account/settings-page";

export const metadata: Metadata = {
  title: "Setari | Revizzio",
  description: "Configureaza preferintele contului Revizzio.",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
