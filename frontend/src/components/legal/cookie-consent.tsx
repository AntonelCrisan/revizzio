"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  allCookieConsent,
  cookieCategories,
  legalConfig,
  necessaryOnlyCookieConsent,
  type CookieConsentCategories,
  type CookieCategoryId,
} from "@/lib/legal-config";

const cookieConsentStorageKey = "revizzio-cookie-consent-v1";
const cookieSettingsEventName = "revizzio:open-cookie-settings";

type StoredCookieConsent = {
  version: string;
  categories: CookieConsentCategories;
  savedAt: string;
};

type CookieSettingsContextValue = {
  openSettings: () => void;
};

const CookieSettingsContext = createContext<CookieSettingsContextValue | null>(
  null,
);

function normalizeConsent(value: unknown): StoredCookieConsent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredCookieConsent>;

  if (!candidate.categories || typeof candidate.categories !== "object") {
    return null;
  }

  return {
    version:
      typeof candidate.version === "string"
        ? candidate.version
        : legalConfig.cookieConsentVersion,
    savedAt:
      typeof candidate.savedAt === "string"
        ? candidate.savedAt
        : new Date().toISOString(),
    categories: {
      necessary: true,
      functional: Boolean(candidate.categories.functional),
      analytics: Boolean(candidate.categories.analytics),
      marketing: Boolean(candidate.categories.marketing),
    },
  };
}

async function logCookieConsent(
  action: string,
  categories: CookieConsentCategories,
) {
  try {
    await fetch("/api/compliance/cookie-consent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Revizzio-Form-Intent": "cookie-consent",
      },
      body: JSON.stringify({
        action,
        consent_version: legalConfig.cookieConsentVersion,
        categories,
      }),
      cache: "no-store",
    });
  } catch {
    // Consent is still stored locally; backend logging is retried on the next change.
  }
}

function getInitialDraft(): CookieConsentCategories {
  return { ...necessaryOnlyCookieConsent };
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<StoredCookieConsent | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<CookieConsentCategories>(getInitialDraft);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(cookieConsentStorageKey);
        const parsed = stored ? normalizeConsent(JSON.parse(stored)) : null;
        if (parsed) {
          setConsent(parsed);
          setDraft(parsed.categories);
        }
      } catch {
        setConsent(null);
      } finally {
        setIsLoaded(true);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    function handleOpenSettings() {
      setDraft(consent?.categories ?? necessaryOnlyCookieConsent);
      setIsSettingsOpen(true);
    }

    window.addEventListener(cookieSettingsEventName, handleOpenSettings);
    return () =>
      window.removeEventListener(cookieSettingsEventName, handleOpenSettings);
  }, [consent]);

  function saveConsent(action: string, categories: CookieConsentCategories) {
    const normalizedCategories = {
      ...categories,
      necessary: true,
    };
    const nextConsent: StoredCookieConsent = {
      version: legalConfig.cookieConsentVersion,
      categories: normalizedCategories,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      cookieConsentStorageKey,
      JSON.stringify(nextConsent),
    );
    setConsent(nextConsent);
    setDraft(normalizedCategories);
    setIsSettingsOpen(false);
    void logCookieConsent(action, normalizedCategories);
  }

  function toggleDraft(categoryId: CookieCategoryId) {
    if (categoryId === "necessary") return;
    setDraft((currentDraft) => ({
      ...currentDraft,
      [categoryId]: !currentDraft[categoryId],
      necessary: true,
    }));
  }

  const contextValue = useMemo<CookieSettingsContextValue>(
    () => ({
      openSettings: () => {
        setDraft(consent?.categories ?? necessaryOnlyCookieConsent);
        setIsSettingsOpen(true);
      },
    }),
    [consent],
  );

  const shouldShowBanner = isLoaded && !consent && !isSettingsOpen;

  return (
    <CookieSettingsContext.Provider value={contextValue}>
      {children}

      {shouldShowBanner ? (
        <section
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-5xl rounded-[1.75rem] border border-subtle bg-surface p-4 text-content shadow-2xl shadow-black/15 sm:bottom-5 sm:p-5"
          aria-label="Consimțământ cookie"
        >
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-sm font-black">Setări cookie Revizzio</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted sm:text-sm sm:leading-6">
                Folosim cookie-uri necesare pentru funcționare. Cookie-urile
                funcționale, de analiză și marketing sunt opționale și nu se
                activează fără acordul tău.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[36rem]">
              <button
                type="button"
                onClick={() => saveConsent("accept_all", allCookieConsent)}
                className="rounded-full bg-action px-4 py-3 text-xs font-black text-on-action transition hover:bg-action-hover"
              >
                Acceptă toate
              </button>
              <button
                type="button"
                onClick={() =>
                  saveConsent("reject_optional", necessaryOnlyCookieConsent)
                }
                className="rounded-full border border-action px-4 py-3 text-xs font-black text-content transition hover:bg-action-soft"
              >
                Respinge cookie-urile opționale
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="rounded-full border border-subtle bg-app px-4 py-3 text-xs font-black text-content transition hover:bg-surface-hover"
              >
                Personalizează
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {isSettingsOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-settings-title"
        >
          <div className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-subtle bg-surface p-5 text-content shadow-2xl shadow-black/25 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  Preferințe cookie
                </p>
                <h2
                  id="cookie-settings-title"
                  className="mt-2 font-serif text-3xl font-semibold"
                >
                  Alege ce cookie-uri accepți.
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Poți modifica oricând aceste setări din footer. Cookie-urile
                  necesare rămân active pentru autentificare și securitate.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-subtle text-muted transition hover:bg-surface-hover hover:text-content"
                aria-label="Închide setările cookie"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              {cookieCategories.map((category) => {
                const isActive = draft[category.id];
                return (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-start gap-4 rounded-2xl border border-subtle bg-app p-4"
                  >
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={category.alwaysActive}
                      onChange={() => toggleDraft(category.id)}
                      className="mt-1 h-4 w-4 accent-action disabled:opacity-60"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-black">
                        {category.label}
                        {category.alwaysActive ? (
                          <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success">
                            mereu active
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {category.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => saveConsent("save_custom", draft)}
                className="rounded-full bg-action px-4 py-3 text-xs font-black text-on-action transition hover:bg-action-hover"
              >
                Salvează preferințele
              </button>
              <button
                type="button"
                onClick={() => saveConsent("accept_all", allCookieConsent)}
                className="rounded-full border border-action px-4 py-3 text-xs font-black text-content transition hover:bg-action-soft"
              >
                Acceptă toate
              </button>
              <button
                type="button"
                onClick={() =>
                  saveConsent("reject_optional", necessaryOnlyCookieConsent)
                }
                className="rounded-full border border-subtle bg-app px-4 py-3 text-xs font-black text-content transition hover:bg-surface-hover"
              >
                Respinge opționalele
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </CookieSettingsContext.Provider>
  );
}

export function CookieSettingsButton({
  className = "",
}: {
  className?: string;
}) {
  const context = useContext(CookieSettingsContext);

  return (
    <button
      type="button"
      onClick={() => {
        if (context) {
          context.openSettings();
          return;
        }
        window.dispatchEvent(new Event(cookieSettingsEventName));
      }}
      className={className}
    >
      Setări cookie
    </button>
  );
}
