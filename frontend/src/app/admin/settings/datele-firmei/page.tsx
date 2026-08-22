import type { Metadata } from "next";
import { AdminCompanyPage } from "@/components/account/admin-company-page";
import { getFallbackCompanyData, getServerCompanyData } from "@/lib/server-legal";

export const metadata: Metadata = {
  title: "Datele firmei | Reviss",
  description: "Formular UI pentru datele firmei afisate in Reviss.",
};

export default async function AdminCompanyRoute() {
  const companyData = (await getServerCompanyData()) ?? getFallbackCompanyData();

  return <AdminCompanyPage initialCompanyData={companyData} />;
}
