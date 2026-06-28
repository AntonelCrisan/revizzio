import type { Metadata } from "next";
import { AdminLegalEditorPage } from "@/components/account/admin-legal-editor-page";
import { readLegalDocument } from "@/lib/legal-content";
import {
  createFallbackLegalDocument,
  getServerAdminLegalDocument,
} from "@/lib/server-legal";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Editare termeni și condiții | Revizzio",
  description: "Editor UI pentru termenii și condițiile platformei Revizzio.",
};

export default async function AdminTermsEditorRoute() {
  await requireAdminUser();
  const document =
    (await getServerAdminLegalDocument("terms_conditions")) ??
    createFallbackLegalDocument(
      "terms_conditions",
      "Termeni și condiții",
      await readLegalDocument("terms.html"),
    );

  return (
    <AdminLegalEditorPage
      document={document}
      description="Editează textul public pentru termenii și condițiile platformei. Fiecare secțiune se salvează individual."
      publicHref="/termeni-si-conditii"
    />
  );
}
