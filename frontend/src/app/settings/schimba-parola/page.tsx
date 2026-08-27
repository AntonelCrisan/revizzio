import type { Metadata } from "next";
import { ChangePasswordPage } from "@/components/account/change-password-page";

export const metadata: Metadata = {
  title: "Schimbă parola | Reviss",
  description: "Actualizează parola contului tău Reviss.",
};

export default function ChangePasswordRoute() {
  return <ChangePasswordPage />;
}
