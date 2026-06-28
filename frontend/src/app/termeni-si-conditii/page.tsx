import type { Metadata } from "next";
import { LegalDocument } from "@/components/legal/legal-document";
import { readLegalDocument } from "@/lib/legal-content";
import { getServerLegalDocument } from "@/lib/server-legal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Termeni și condiții | Revizzio",
  description: "Termenii și condițiile de utilizare pentru platforma Revizzio.",
};

export default async function TermsPage() {
  const document = await getServerLegalDocument("terms_conditions");
  const contentHtml =
    document?.rendered_content_html ?? (await readLegalDocument("terms.html"));

  return (
    <LegalDocument
      contentHtml={contentHtml}
      eyebrow="Termeni legali"
      summary="Regulile de utilizare ale platformei Revizzio, drepturile și responsabilitățile aplicabile contului, materialelor încărcate și funcționalităților disponibile."
    />
  );
}
