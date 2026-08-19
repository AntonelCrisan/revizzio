import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Strategii | Reviss",
  description: "Strategiile de învățare pentru proiectul tău Reviss.",
};

export default function StrategiiPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="strategii" />;
}
