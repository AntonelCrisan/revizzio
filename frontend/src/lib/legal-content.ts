import { readFile } from "node:fs/promises";
import path from "node:path";

type LegalDocumentFile = "privacy.html" | "terms.html";

const legalContentDirectory = path.join(process.cwd(), "src", "content", "legal");

export async function readLegalDocument(fileName: LegalDocumentFile) {
  return readFile(path.join(legalContentDirectory, fileName), "utf8");
}
