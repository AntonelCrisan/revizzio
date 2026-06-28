import type { Metadata } from "next";
import { SettingsPage } from "@/components/account/settings-page";

export const metadata: Metadata = {
  title: "Setări | Revizzio",
  description: "Configurează preferințele contului Revizzio.",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
