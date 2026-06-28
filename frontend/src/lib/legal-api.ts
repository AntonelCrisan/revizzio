export type LegalDocumentSlug = "terms_conditions" | "privacy_policy";

export type CompanyData = {
  id: string;
  name: string;
  social_location: string;
  cui: string;
  register_number: string;
  social_capital: string;
  email: string;
  privacy_email: string;
  phone: string;
  ai_provider: string;
  payment_provider: string;
  hosting_provider: string;
  last_date_modified: string;
};

export type LegalDocumentSection = {
  id: string;
  section_key: string;
  title: string;
  content: string;
  rendered_content: string;
  sort_order: number;
  last_date_modified: string;
};

export type LegalDocument = {
  id: string;
  slug: LegalDocumentSlug;
  title: string;
  content_html: string;
  rendered_content_html: string;
  last_date_modified: string;
  sections: LegalDocumentSection[];
  available_variables: string[];
};

export type LegalSectionUpdate = {
  title: string;
  content: string;
};

export type CompanyDataUpdate = Omit<CompanyData, "id" | "last_date_modified">;

type ApiErrorPayload = {
  detail?: string;
};

export class LegalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LegalApiError";
  }
}

async function legalRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/legal/${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      // The fallback below handles non-JSON upstream errors.
    }
    throw new LegalApiError(
      payload.detail || "Solicitarea nu a putut fi procesata.",
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getAdminLegalDocument(
  slug: LegalDocumentSlug,
): Promise<LegalDocument> {
  return legalRequest<LegalDocument>(`admin/documents/${slug}`);
}

export function updateAdminLegalDocumentSection(
  slug: LegalDocumentSlug,
  sectionKey: string,
  payload: LegalSectionUpdate,
): Promise<LegalDocument> {
  return legalRequest<LegalDocument>(
    `admin/documents/${slug}/sections/${sectionKey}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdminCompanyData(): Promise<CompanyData> {
  return legalRequest<CompanyData>("admin/company-data");
}

export function updateAdminCompanyData(
  payload: CompanyDataUpdate,
): Promise<CompanyData> {
  return legalRequest<CompanyData>("admin/company-data", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
