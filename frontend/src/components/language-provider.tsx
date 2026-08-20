"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { LanguagePreference } from "@/lib/auth-api";
import {
  resolveUiTextSource,
  translateUiText,
} from "@/lib/ui-translations";

export type TranslationKey =
  | "language.label"
  | "language.ro"
  | "language.en"
  | "language.fr"
  | "marketing.hero.badge"
  | "marketing.hero.title.main"
  | "marketing.hero.title.accent"
  | "marketing.hero.description"
  | "marketing.hero.cta.primary"
  | "marketing.hero.cta.secondary"
  | "marketing.hero.feature.files"
  | "marketing.hero.feature.quiz"
  | "marketing.hero.feature.progress"
  | "marketing.nav.how"
  | "marketing.nav.flashcards"
  | "marketing.nav.benefits"
  | "marketing.nav.pricing"
  | "marketing.nav.questions"
  | "marketing.account"
  | "marketing.login"
  | "marketing.register"
  | "marketing.goToAccount"
  | "marketing.openMenu"
  | "marketing.closeMenu";

type LanguageContextValue = {
  language: LanguagePreference;
  setLanguage: (language: LanguagePreference) => void;
  t: (key: TranslationKey) => string;
};

const STORAGE_KEY = "reviss-language";
const LANGUAGE_EVENT = "reviss-language-change";
const languages: LanguagePreference[] = ["ro", "en", "fr"];
const LanguageContext = createContext<LanguageContextValue | null>(null);

const translations: Record<LanguagePreference, Record<TranslationKey, string>> =
  {
    ro: {
      "language.label": "Limba",
      "language.ro": "Română",
      "language.en": "Engleză",
      "language.fr": "Franceză",
      "marketing.hero.badge": "Cursul tău, transformat într-un plan de învățare",
      "marketing.hero.title.main": "Nu mai reciti.",
      "marketing.hero.title.accent": "Învață activ.",
      "marketing.hero.description":
        "Reviss transformă suporturile tale de curs în rezumate clare, flashcard-uri și quiz-uri care te ajută să înțelegi, să repeți și să reții.",
      "marketing.hero.cta.primary": "Începe să înveți",
      "marketing.hero.cta.secondary": "Vezi cum funcționează",
      "marketing.hero.feature.files": "PDF și notițe",
      "marketing.hero.feature.quiz": "Quiz-uri personalizate",
      "marketing.hero.feature.progress": "Progres măsurabil",
      "marketing.nav.how": "Cum funcționează",
      "marketing.nav.flashcards": "Flashcard-uri",
      "marketing.nav.benefits": "Beneficii",
      "marketing.nav.pricing": "Prețuri",
      "marketing.nav.questions": "Întrebări",
      "marketing.account": "Contul meu",
      "marketing.login": "Intră în cont",
      "marketing.register": "Creează cont",
      "marketing.goToAccount": "Mergi la contul meu",
      "marketing.openMenu": "Deschide meniul",
      "marketing.closeMenu": "Închide meniul",
    },
    en: {
      "language.label": "Language",
      "language.ro": "Romanian",
      "language.en": "English",
      "language.fr": "French",
      "marketing.hero.badge": "Your course, turned into a learning plan",
      "marketing.hero.title.main": "Stop rereading.",
      "marketing.hero.title.accent": "Learn actively.",
      "marketing.hero.description":
        "Reviss turns your course materials into clear summaries, flashcards and quizzes that help you understand, practise and remember.",
      "marketing.hero.cta.primary": "Start learning",
      "marketing.hero.cta.secondary": "See how it works",
      "marketing.hero.feature.files": "PDFs and notes",
      "marketing.hero.feature.quiz": "Personalized quizzes",
      "marketing.hero.feature.progress": "Measurable progress",
      "marketing.nav.how": "How it works",
      "marketing.nav.flashcards": "Flashcards",
      "marketing.nav.benefits": "Benefits",
      "marketing.nav.pricing": "Pricing",
      "marketing.nav.questions": "Questions",
      "marketing.account": "My account",
      "marketing.login": "Log in",
      "marketing.register": "Create account",
      "marketing.goToAccount": "Go to my account",
      "marketing.openMenu": "Open menu",
      "marketing.closeMenu": "Close menu",
    },
    fr: {
      "language.label": "Langue",
      "language.ro": "Roumain",
      "language.en": "Anglais",
      "language.fr": "Français",
      "marketing.hero.badge": "Ton cours, transformé en plan d’apprentissage",
      "marketing.hero.title.main": "Arrête de relire.",
      "marketing.hero.title.accent": "Apprends activement.",
      "marketing.hero.description":
        "Reviss transforme tes supports de cours en résumés clairs, flashcards et quiz pour t’aider à comprendre, t’entraîner et retenir.",
      "marketing.hero.cta.primary": "Commencer à apprendre",
      "marketing.hero.cta.secondary": "Voir le fonctionnement",
      "marketing.hero.feature.files": "PDF et notes",
      "marketing.hero.feature.quiz": "Quiz personnalisés",
      "marketing.hero.feature.progress": "Progrès mesurable",
      "marketing.nav.how": "Fonctionnement",
      "marketing.nav.flashcards": "Flashcards",
      "marketing.nav.benefits": "Avantages",
      "marketing.nav.pricing": "Tarifs",
      "marketing.nav.questions": "Questions",
      "marketing.account": "Mon compte",
      "marketing.login": "Connexion",
      "marketing.register": "Créer un compte",
      "marketing.goToAccount": "Aller à mon compte",
      "marketing.openMenu": "Ouvrir le menu",
      "marketing.closeMenu": "Fermer le menu",
    },
  };

function isLanguagePreference(
  value: string | null | undefined,
): value is LanguagePreference {
  return languages.includes(value as LanguagePreference);
}

function getStoredLanguage(): LanguagePreference {
  if (typeof window === "undefined") {
    return "ro";
  }

  try {
    const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
    return isLanguagePreference(storedLanguage) ? storedLanguage : "ro";
  } catch {
    return "ro";
  }
}

function applyLanguage(language: LanguagePreference) {
  document.documentElement.lang = language;
  document.documentElement.dataset.language = language;
}

function getLanguageSnapshot(): LanguagePreference {
  if (typeof document === "undefined") {
    return "ro";
  }

  const domLanguage = document.documentElement.dataset.language;
  return isLanguagePreference(domLanguage) ? domLanguage : getStoredLanguage();
}

const translatedTextNodes = new WeakMap<Text, string>();
const translatedElementAttributes = new WeakMap<Element, Map<string, string>>();
const translatedAttributes = ["aria-label", "title", "placeholder", "alt"];
const ignoredTags = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "CODE",
  "PRE",
]);

function shouldSkipElement(element: Element | null) {
  if (!element) return true;
  if (ignoredTags.has(element.tagName)) return true;
  return Boolean(
    element.closest(
      "[data-no-auto-translate], [contenteditable='true'], code, pre",
    ),
  );
}

function shouldSkipElementAttribute(element: Element | null) {
  if (!element) return true;
  return Boolean(
    element.closest("[data-no-auto-translate], [contenteditable='true']"),
  );
}

function translateWithCurrentSpacing(
  currentValue: string,
  sourceValue: string,
  language: LanguagePreference,
) {
  const match = currentValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
  const leading = match?.[1] ?? "";
  const trailing = match?.[3] ?? "";
  const translated = translateUiText(sourceValue, language).trim();

  return `${leading}${translated}${trailing}`;
}

function translateTextNode(node: Text, language: LanguagePreference) {
  const parent = node.parentElement;
  if (shouldSkipElement(parent)) return;

  const currentValue = node.nodeValue ?? "";
  if (!currentValue.trim()) return;

  const sourceValue =
    translatedTextNodes.get(node) ?? resolveUiTextSource(currentValue);

  if (!sourceValue) return;

  translatedTextNodes.set(node, sourceValue);

  const nextValue = translateWithCurrentSpacing(
    currentValue,
    sourceValue,
    language,
  );

  if (node.nodeValue !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateElementAttribute(
  element: Element,
  attribute: string,
  language: LanguagePreference,
) {
  if (shouldSkipElementAttribute(element)) return;

  const currentValue = element.getAttribute(attribute);
  if (!currentValue?.trim()) return;

  const attributeSources =
    translatedElementAttributes.get(element) ?? new Map<string, string>();
  const sourceValue =
    attributeSources.get(attribute) ?? resolveUiTextSource(currentValue);

  if (!sourceValue) return;

  attributeSources.set(attribute, sourceValue);
  translatedElementAttributes.set(element, attributeSources);

  const nextValue = translateWithCurrentSpacing(
    currentValue,
    sourceValue,
    language,
  );

  if (element.getAttribute(attribute) !== nextValue) {
    element.setAttribute(attribute, nextValue);
  }
}

function translateElementTree(root: ParentNode, language: LanguagePreference) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    translateTextNode(currentNode as Text, language);
    currentNode = walker.nextNode();
  }

  const attributeSelector = translatedAttributes
    .map((attribute) => `[${attribute}]`)
    .join(",");

  if (!attributeSelector || !("querySelectorAll" in root)) return;

  (root as Element | Document).querySelectorAll(attributeSelector).forEach(
    (element) => {
      translatedAttributes.forEach((attribute) =>
        translateElementAttribute(element, attribute, language),
      );
    },
  );
}

function LocalizedDomTranslator({
  language,
}: {
  language: LanguagePreference;
}) {
  useEffect(() => {
    if (typeof document === "undefined" || !document.body) {
      return;
    }

    let frame = window.requestAnimationFrame(() => {
      translateElementTree(document.body, language);
    });

    const observer = new MutationObserver((mutations) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === "characterData") {
            translateTextNode(mutation.target as Text, language);
            return;
          }

          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              translateTextNode(node as Text, language);
              return;
            }

            if (node.nodeType === Node.ELEMENT_NODE) {
              translateElementTree(node as Element, language);
            }
          });
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [language]);

  return null;
}

function subscribe(callback: () => void) {
  applyLanguage(getStoredLanguage());

  function handleLanguageChange() {
    callback();
  }

  function handleStorage(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) return;
    applyLanguage(getStoredLanguage());
    callback();
  }

  window.addEventListener(LANGUAGE_EVENT, handleLanguageChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(LANGUAGE_EVENT, handleLanguageChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = useSyncExternalStore<LanguagePreference>(
    subscribe,
    getLanguageSnapshot,
    () => "ro",
  );

  const setLanguage = useCallback((nextLanguage: LanguagePreference) => {
    applyLanguage(nextLanguage);

    try {
      window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch {
      // The language still changes for the current page.
    }

    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => translations[language][key],
    }),
    [language, setLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      <LocalizedDomTranslator language={language} />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}

export const languageOptions = languages.map((language) => ({
  value: language,
  labelKey: `language.${language}` as TranslationKey,
}));
