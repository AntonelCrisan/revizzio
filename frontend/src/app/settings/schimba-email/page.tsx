import type { Metadata } from "next";
import { ChangeEmailPage } from "@/components/account/change-email-page";

export const metadata: Metadata = {
  title: "Schimbă emailul | Reviss",
  description: "Actualizează adresa de email a contului tău Reviss.",
};

export default function ChangeEmailRoute() {
  return <ChangeEmailPage />;
}
