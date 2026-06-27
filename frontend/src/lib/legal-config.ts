export const legalConfig = {
  companyName: "[DENUMIRE_FIRMĂ]",
  registeredOffice: "[SEDIU_SOCIAL]",
  cui: "[CUI]",
  tradeRegisterNumber: "[NR_REGISTRUL_COMERȚULUI]",
  shareCapital: "[CAPITAL_SOCIAL]",
  contactEmail: "[EMAIL_CONTACT]",
  privacyEmail: "[EMAIL_CONFIDENȚIALITATE]",
  phone: "[TELEFON]",
  aiProvider: "[FURNIZOR_AI]",
  paymentProvider: "[FURNIZOR_PLĂȚI]",
  hostingProvider: "[FURNIZOR_HOSTING]",
  cookieConsentVersion: "2026-06-24",
  termsVersion: "2026-06-24",
  anpcSalImagePath: "/assets/anpc/anpc-sal.png",
  anpcSalUrl: "https://reclamatiisal.anpc.ro/",
  anpcSolImagePath: "/assets/anpc/anpc-sol.png",
  anpcSolUrl: "https://consumer-redress.ec.europa.eu/site-relocation_en",
} as const;

export const generatedContentDisclaimer =
  "Conținutul este generat automat și poate conține erori. Verifică informațiile înainte de utilizare.";

export const footerGeneratedContentDisclaimer =
  "Revizzio este un instrument educațional. Conținutul generat automat poate conține erori și trebuie verificat.";

export const legalLinks = [
  { href: "/termeni-si-conditii", label: "Termeni și condiții" },
  {
    href: "/politica-de-confidentialitate",
    label: "Politica de confidențialitate",
  },
  { href: "/politica-cookies", label: "Politica privind cookie-urile" },
] as const;

export const supportLinks = [
  { href: "/contact", label: "Contact și suport" },
  { href: "/anulare-abonament", label: "Anulare abonament" },
  { href: "/retragere-din-contract", label: "Retragere din contract" },
  { href: "/raporteaza-continut", label: "Raportează conținut" },
] as const;

export const cookieCategories = [
  {
    id: "necessary",
    label: "Necesare",
    description:
      "Păstrează autentificarea, securitatea și funcțiile de bază ale platformei.",
    alwaysActive: true,
  },
  {
    id: "functional",
    label: "Funcționale",
    description:
      "Memorează preferințe precum tema, setările de interfață și opțiunile de studiu.",
    alwaysActive: false,
  },
  {
    id: "analytics",
    label: "Analiză",
    description:
      "Ne-ar ajuta să înțelegem cum este folosit produsul. Nu încărcăm analytics fără acord.",
    alwaysActive: false,
  },
  {
    id: "marketing",
    label: "Marketing",
    description:
      "Ar permite campanii și măsurare de marketing. Nu încărcăm scripturi de marketing fără acord.",
    alwaysActive: false,
  },
] as const;

export type CookieCategoryId = (typeof cookieCategories)[number]["id"];

export type CookieConsentCategories = Record<CookieCategoryId, boolean>;

export const necessaryOnlyCookieConsent: CookieConsentCategories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const allCookieConsent: CookieConsentCategories = {
  necessary: true,
  functional: true,
  analytics: true,
  marketing: true,
};
