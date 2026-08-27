import type { Metadata } from "next";
import { ChangeFullNamePage } from "@/components/account/change-full-name-page";

export const metadata: Metadata = {
  title: "Schimbă numele | Reviss",
  description: "Actualizează numele contului tău Reviss.",
};

export default function ChangeFullNameRoute() {
  return <ChangeFullNamePage />;
}
