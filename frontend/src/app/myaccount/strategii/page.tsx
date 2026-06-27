import type { Metadata } from "next";
import { AccountTabRoutePage } from "@/components/account/account-tab-route-page";

export const metadata: Metadata = {
  title: "Strategii | Revizzio",
  description: "Strategiile de învățare pentru proiectul tău Revizzio.",
};

export default function StrategiiPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] | undefined }>;
}) {
  return <AccountTabRoutePage searchParams={searchParams} tab="strategii" />;
}
