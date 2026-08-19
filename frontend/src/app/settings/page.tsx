import type { Metadata } from "next";
import { SettingsPage } from "@/components/account/settings-page";

export const metadata: Metadata = {
  title: "Setări | Reviss",
  description: "Configurează preferințele contului Reviss.",
};

export default function SettingsRoute() {
  return <SettingsPage />;
}
