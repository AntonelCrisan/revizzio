import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { readLegalDocument } from "@/lib/legal-content";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Termeni și condiții | Revizzio",
  description: "Termenii și condițiile de utilizare pentru platforma Revizzio.",
};

export default async function TermsPage() {
  const contentHtml = await readLegalDocument("terms.html");

  return (
    <LegalDocument
      contentHtml={contentHtml}
      eyebrow="Termeni legali"
      summary="Regulile de utilizare ale platformei Revizzio, drepturile și responsabilitățile aplicabile contului, materialelor încărcate și funcționalităților disponibile."
    />
  );
}
