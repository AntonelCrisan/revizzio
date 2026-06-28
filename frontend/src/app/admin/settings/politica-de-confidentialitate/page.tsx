import type { Metadata } from "next";
import { AdminLegalEditorPage } from "@/components/account/admin-legal-editor-page";
import { readLegalDocument } from "@/lib/legal-content";
import {
  createFallbackLegalDocument,
  getServerAdminLegalDocument,
} from "@/lib/server-legal";
import { requireAdminUser } from "@/lib/server-auth";

export const metadata: Metadata = {
  title: "Editare politică de confidențialitate | Revizzio",
  description: "Editor UI pentru politica de confidențialitate Revizzio.",
};

export default async function AdminPrivacyEditorRoute() {
  await requireAdminUser();
  const document =
    (await getServerAdminLegalDocument("privacy_policy")) ??
    createFallbackLegalDocument(
      "privacy_policy",
      "Politica de confidențialitate",
      await readLegalDocument("privacy.html"),
    );

  return (
    <AdminLegalEditorPage
      document={document}
      description="Editează textul public pentru confidențialitate, date personale și furnizori. Fiecare secțiune se salvează individual."
      publicHref="/politica-de-confidentialitate"
    />
  );
}
