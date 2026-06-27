import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { readLegalDocument } from "@/lib/legal-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Politica de confidențialitate | Revizzio",
  description:
    "Politica de confidențialitate Revizzio privind datele personale și modul în care acestea sunt prelucrate.",
};

export default async function PrivacyPolicyPage() {
  const contentHtml = await readLegalDocument("privacy.html");

  return (
    <LegalDocument
      contentHtml={contentHtml}
      eyebrow="Confidențialitate"
      summary="Detalii despre datele personale prelucrate în Revizzio, scopurile utilizării lor, drepturile utilizatorilor și măsurile de protecție aplicate."
    />
  );
}
