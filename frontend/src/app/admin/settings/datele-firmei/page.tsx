import type { Metadata } from "next";
import { AdminCompanyPage } from "@/components/account/admin-company-page";
import { getFallbackCompanyData, getServerCompanyData } from "@/lib/server-legal";

export const metadata: Metadata = {
  title: "Datele firmei | Reviss",
  description: "Formular UI pentru datele firmei afisate in Reviss.",
};

export default async function AdminCompanyRoute() {
  const companyData = await getServerCompanyData();
  const initialLoadError = companyData
    ? null
    : "Datele firmei nu au putut fi încărcate de pe server. Sunt afișate valorile de rezervă până când conexiunea revine.";

  return (
    <AdminCompanyPage
      key={companyData?.last_date_modified ?? "fallback-company-data"}
      initialCompanyData={companyData ?? getFallbackCompanyData()}
      initialLoadError={initialLoadError}
    />
  );
}
