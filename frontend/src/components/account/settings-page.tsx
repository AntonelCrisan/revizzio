"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { CookieSettingsButton } from "@/components/legal/cookie-consent";
import {
  type ThemePreference,
  useTheme,
} from "@/components/theme-provider";
import {
  colorThemePresets,
  getColorThemePreset,
  themeColorVariables,
} from "@/lib/theme-colors";
import { updateThemePreference } from "@/lib/auth-api";

type SettingsTabId =
  | "account"
  | "study"
  | "appearance"
  | "colors"
  | "notifications"
  | "security"
  | "privacy";

const settingsTabs: Array<{
  id: SettingsTabId;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
}> = [
  {
    id: "account",
    label: "Cont",
    eyebrow: "Profil",
    title: "Datele contului tău.",
    description: "Informațiile de bază, planul curent și sumarul contului.",
  },
  {
    id: "study",
    label: "Studiu",
    eyebrow: "Învățare",
    title: "Cum vrei să lucreze Revizzio.",
    description: "Preferințe pentru ritmul de studiu și feedback-ul AI.",
  },
  {
    id: "appearance",
    label: "Aspect",
    eyebrow: "Interfață",
    title: "Alege modul de afișare.",
    description: "Light, dark sau system, separat de paleta de culori.",
  },
  {
    id: "colors",
    label: "Culori",
    eyebrow: "Editor temă",
    title: "Culorile aplicației.",
    description: "Preset-uri ca într-un editor de cod și override-uri fine.",
  },
  {
    id: "notifications",
    label: "Notificări",
    eyebrow: "Reminder",
    title: "Alerte și emailuri.",
    description: "Alege ce notificări primești în timpul studiului.",
  },
  {
    id: "security",
    label: "Securitate",
    eyebrow: "Acces",
    title: "Sesiuni și protecție.",
    description: "Setări pentru cont, sesiuni și acțiuni critice.",
  },
  {
    id: "privacy",
    label: "Date",
    eyebrow: "Confidențialitate",
    title: "Confidențialitate și date.",
    description:
      "Exportă, șterge sau modifică acordurile legate de datele contului.",
  },
];

const themeOptions: Array<{
  value: ThemePreference;
  title: string;
  description: string;
}> = [
  {
    value: "light",
    title: "Light",
    description: "Interfață clară pentru studiu ziua.",
  },
  {
    value: "dark",
    title: "Dark",
    description: "Contrast calm pentru sesiuni seara.",
  },
  {
    value: "system",
    title: "System",
    description: "Urmează preferința dispozitivului.",
  },
];

const studyPreferences = [
  {
    label: "Pagina implicită după login",
    value: "Ultimul proiect deschis",
  },
  {
    label: "Ritm recomandat de recapitulare",
    value: "Zilnic, sesiuni scurte",
  },
  {
    label: "Nivel feedback AI",
    value: "Explicații concise",
  },
];

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "EQ"
  );
}

function getPreviewStyle(colors: {
  app: string;
  surface: string;
  border: string;
  content: string;
  muted: string;
  action: string;
  actionSoft: string;
  onAction: string;
  hover: string;
  successBg: string;
  successText: string;
  successBorder: string;
  warningBg: string;
  warningText: string;
  warningBorder: string;
  dangerBg: string;
  dangerText: string;
  dangerBorder: string;
  infoBg: string;
  infoText: string;
  infoBorder: string;
}): CSSProperties {
  return {
    "--settings-preview-app": colors.app,
    "--settings-preview-surface": colors.surface,
    "--settings-preview-border": colors.border,
    "--settings-preview-content": colors.content,
    "--settings-preview-muted": colors.muted,
    "--settings-preview-action": colors.action,
    "--settings-preview-action-soft": colors.actionSoft,
    "--settings-preview-on-action": colors.onAction,
    "--settings-preview-hover": colors.hover,
    "--settings-preview-success-bg": colors.successBg,
    "--settings-preview-success-text": colors.successText,
    "--settings-preview-success-border": colors.successBorder,
    "--settings-preview-warning-bg": colors.warningBg,
    "--settings-preview-warning-text": colors.warningText,
    "--settings-preview-warning-border": colors.warningBorder,
    "--settings-preview-danger-bg": colors.dangerBg,
    "--settings-preview-danger-text": colors.dangerText,
    "--settings-preview-danger-border": colors.dangerBorder,
    "--settings-preview-info-bg": colors.infoBg,
    "--settings-preview-info-text": colors.infoText,
    "--settings-preview-info-border": colors.infoBorder,
  } as CSSProperties;
}

export function SettingsPage() {
  const { user, setUser } = useAuth();
  const {
    preference,
    resolvedTheme,
    colorScheme,
    customColors,
    setTheme,
    setColorScheme,
    setCustomColor,
    resetCustomColors,
  } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTabId>("account");
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const tabScrollerRef = useRef<HTMLDivElement | null>(null);
  const tabScrollTrackRef = useRef<HTMLDivElement | null>(null);
  const tabScrollThumbRef = useRef<HTMLDivElement | null>(null);
  const selectedPreset = getColorThemePreset(colorScheme);
  const selectedColors = {
    ...selectedPreset.colors[resolvedTheme],
    ...customColors,
  };
  const customColorCount = Object.keys(customColors).length;
  const activeTabMeta =
    settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];

  function updateTabScrollIndicator() {
    const scroller = tabScrollerRef.current;
    const track = tabScrollTrackRef.current;
    const thumb = tabScrollThumbRef.current;

    if (!scroller || !track || !thumb) {
      return;
    }

    const scrollableWidth = scroller.scrollWidth - scroller.clientWidth;

    if (scrollableWidth <= 4) {
      track.style.opacity = "0";
      thumb.style.width = "100%";
      thumb.style.left = "0%";
      return;
    }

    const thumbWidth = Math.max(
      22,
      (scroller.clientWidth / scroller.scrollWidth) * 100,
    );
    const thumbTravel = 100 - thumbWidth;
    const thumbLeft = (scroller.scrollLeft / scrollableWidth) * thumbTravel;

    track.style.opacity = "1";
    thumb.style.width = `${thumbWidth}%`;
    thumb.style.left = `${thumbLeft}%`;
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateTabScrollIndicator);
    window.addEventListener("resize", updateTabScrollIndicator);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateTabScrollIndicator);
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(updateTabScrollIndicator);
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  async function saveThemePreference(themePreference: ThemePreference) {
    if (!user || isSavingTheme) {
      return;
    }

    const previousPreference = user.theme_preference;
    setIsSavingTheme(true);
    setTheme(themePreference);
    setUser({ ...user, theme_preference: themePreference });

    try {
      const updatedUser = await updateThemePreference(themePreference);
      setUser(updatedUser);
    } catch {
      setTheme(previousPreference);
      setUser({ ...user, theme_preference: previousPreference });
    } finally {
      setIsSavingTheme(false);
    }
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "account":
        return (
          <TabCard>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[1.75rem] border border-subtle bg-success-soft font-serif text-4xl font-semibold text-success">
                {initials(user?.full_name ?? "Student Revizzio")}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-4xl font-semibold leading-tight">
                  {user?.full_name ?? "Student Revizzio"}
                </h3>
                <p className="mt-2 break-all text-sm text-muted">
                  {user?.email ?? "student@universitate.ro"}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <SettingsStat label="Plan" value="Start" />
                  <SettingsStat label="Proiecte" value="3" />
                  <SettingsStat label="Rol" value="Student" />
                </div>
              </div>
            </div>
          </TabCard>
        );

      case "study":
        return (
          <TabCard>
            <div className="grid gap-3">
              {studyPreferences.map((preferenceItem) => (
                <div
                  key={preferenceItem.label}
                  className="flex flex-col gap-2 rounded-2xl border border-subtle bg-app px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm font-semibold">
                    {preferenceItem.label}
                  </span>
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">
                    {preferenceItem.value}
                  </span>
                </div>
              ))}
            </div>
          </TabCard>
        );

      case "appearance":
        return (
          <TabCard
            aside={
              <div className="rounded-3xl border border-info-border bg-info-soft p-5 text-info">
                <p className="text-xs font-bold uppercase tracking-[0.16em]">
                  Activ acum
                </p>
                <p className="mt-3 font-serif text-3xl font-semibold">
                  {resolvedTheme}
                </p>
                <p className="mt-2 text-sm leading-6">
                  Modul de afișare controlează luminozitatea. Paleta se schimbă
                  din tabul Culori.
                </p>
              </div>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const isSelected =
                  (user?.theme_preference ?? preference) === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSavingTheme}
                    onClick={() => saveThemePreference(option.value)}
                    className={`rounded-3xl border p-5 text-left transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 ${
                      isSelected
                        ? "border-success bg-success-soft text-success"
                        : "border-subtle bg-app hover:bg-surface-hover"
                    }`}
                  >
                    <span className="text-base font-bold">{option.title}</span>
                    <span className="mt-2 block text-sm leading-6 text-muted">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </TabCard>
        );

      case "colors":
        return (
          <TabCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-muted">
                  Tema curentă: {selectedPreset.name}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {customColorCount} culori modificate manual
                </p>
              </div>
              {customColorCount > 0 ? (
                <button
                  type="button"
                  onClick={resetCustomColors}
                  className="w-fit rounded-full border border-danger-border bg-danger-soft px-4 py-2 text-xs font-bold text-danger transition hover:-translate-y-0.5"
                >
                  Resetează modificările
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {colorThemePresets.map((preset) => {
                const isSelected = preset.id === colorScheme;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setColorScheme(preset.id)}
                    className={`rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 ${
                      isSelected
                        ? "border-action bg-action-soft"
                        : "border-subtle bg-app hover:bg-surface-hover"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold">
                          {preset.name}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted">
                          {preset.description}
                        </span>
                      </span>
                      {isSelected ? (
                        <span className="rounded-full bg-action px-2.5 py-1 text-[10px] font-bold text-on-action">
                          activ
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-4 flex gap-2">
                      {preset.preview.map((color) => (
                        <span
                          key={color}
                          className="h-8 w-8 rounded-full border border-subtle"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <ThemePreview colors={selectedColors} />
              <div className="rounded-3xl border border-subtle bg-app p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                      Editor culori
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Modificările suprascriu paleta selectată.
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted">
                    {customColorCount} custom
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  {themeColorVariables.map((variable) => (
                    <ColorControl
                      key={variable.key}
                      label={variable.label}
                      description={variable.description}
                      value={selectedColors[variable.key]}
                      isCustom={customColors[variable.key] !== undefined}
                      onChange={(value) =>
                        setCustomColor(variable.key, value)
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </TabCard>
        );

      case "notifications":
        return (
          <TabCard>
            <div className="grid gap-3">
              {[
                "Reminder pentru recapitulare zilnică",
                "Email când un proiect nou este generat",
                "Alerte pentru concepte care trebuie repetate",
              ].map((label) => (
                <label
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-subtle bg-app px-4 py-4 text-sm font-semibold"
                >
                  {label}
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-4 w-4 accent-action"
                  />
                </label>
              ))}
            </div>
          </TabCard>
        );

      case "security":
        return (
          <TabCard
            aside={
              <div className="rounded-3xl border border-warning-border bg-warning-soft p-5 text-warning">
                <p className="text-xs font-bold uppercase tracking-[0.16em]">
                  Notă
                </p>
                <p className="mt-3 text-sm leading-6">
                  Sesiunea curentă este protejată prin cookie HttpOnly.
                  Setările avansate vor fi legate de backend ulterior.
                </p>
              </div>
            }
          >
            <div className="grid gap-3">
              <button
                type="button"
                className="rounded-2xl border border-subtle bg-app px-4 py-4 text-left text-sm font-bold transition hover:bg-surface-hover"
              >
                Schimbă parola
                <span className="block text-xs font-normal text-muted">
                  Pregătit pentru integrarea backend.
                </span>
              </button>
              <button
                type="button"
                className="rounded-2xl border border-danger-border bg-danger-soft px-4 py-4 text-left text-sm font-bold text-danger transition hover:-translate-y-0.5"
              >
                Șterge contul
                <span className="block text-xs font-normal">
                  Acțiune critică, dezactivată momentan.
                </span>
              </button>
            </div>
          </TabCard>
        );

      case "privacy":
        return (
          <TabCard
            aside={
              <div className="rounded-3xl border border-warning-border bg-warning-soft p-5 text-warning">
                <p className="text-xs font-bold uppercase tracking-[0.16em]">
                  Ștergere cont
                </p>
                <p className="mt-3 text-sm leading-6">
                  Pentru ștergerea completă se cere reconfirmarea parolei sau o
                  confirmare prin e-mail. Datele fiscale sau cele necesare
                  apărării drepturilor pot fi păstrate cât cere legea.
                </p>
              </div>
            }
          >
            <div className="grid gap-4">
              <div className="rounded-2xl border border-subtle bg-app p-4">
                <p className="text-sm font-bold">Descarcă datele contului</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Include profilul, preferințele, proiectele și istoricul
                  disponibil pentru contul tău.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setPrivacyNotice(
                      "Exportul datelor va genera o arhivă descărcabilă după conectarea endpointului backend.",
                    )
                  }
                  className="mt-3 rounded-full border border-content px-4 py-2 text-xs font-bold transition hover:bg-content hover:text-app"
                >
                  Descarcă datele
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Șterge materialele încărcate",
                    "Elimină fișierele sursă asociate proiectelor tale.",
                  ],
                  [
                    "Șterge flashcard-urile",
                    "Elimină cardurile generate automat din proiecte.",
                  ],
                  [
                    "Retrage consimțământul newsletter",
                    "Oprește comunicările comerciale prin e-mail.",
                  ],
                  [
                    "Șterge contul",
                    "Necesită reconfirmarea parolei sau confirmare prin e-mail.",
                  ],
                ].map(([title, description]) => (
                  <button
                    key={title}
                    type="button"
                    onClick={() =>
                      setPrivacyNotice(
                        `${title}: solicitarea va fi validată server-side și jurnalizată înainte de executare.`,
                      )
                    }
                    className="rounded-2xl border border-subtle bg-app p-4 text-left transition hover:bg-surface-hover"
                  >
                    <span className="text-sm font-bold">{title}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      {description}
                    </span>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-info-border bg-info-soft p-4 text-info">
                <p className="text-sm font-bold">Setări cookie</p>
                <p className="mt-1 text-xs leading-5">
                  Poți modifica sau retrage acordul pentru cookie-urile
                  opționale oricând.
                </p>
                <CookieSettingsButton className="mt-3 rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover" />
              </div>

              {privacyNotice ? (
                <div
                  role="status"
                  className="rounded-2xl border border-success-border bg-success-soft px-4 py-3 text-xs font-semibold leading-5 text-success"
                >
                  {privacyNotice}
                </div>
              ) : null}
            </div>
          </TabCard>
        );
    }
  }

  return (
    <AccountStaticShell activePage="settings">
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[2rem] border border-subtle bg-surface">
          <div className="relative bg-action px-6 py-7 text-on-action sm:px-8">
            <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-on-action/10" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-on-action/60">
              Setări cont
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight">
              Controlează contul, studiul și aspectul aplicației.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-action/70">
              Setări organizate pe taburi, cu personalizare de culoare aplicată
              global.
            </p>
          </div>
        </div>

        <div className="sticky top-14 z-20 rounded-[1.5rem] border border-subtle bg-app/90 p-2 shadow-sm backdrop-blur-xl">
          <div
            ref={tabScrollerRef}
            onScroll={updateTabScrollIndicator}
            className="flex snap-x gap-2 overflow-x-auto px-0.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Setări cont"
          >
            {settingsTabs.map((tab) => {
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`snap-start shrink-0 rounded-full border px-5 py-2.5 text-sm font-bold transition ${
                    isActive
                      ? "border-action bg-action text-on-action shadow-sm"
                      : "border-subtle bg-surface text-muted hover:bg-surface-hover hover:text-content"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div
            ref={tabScrollTrackRef}
            aria-hidden="true"
            className="relative mx-1 mt-1 block h-1 rounded-full bg-subtle/80 opacity-0 transition-opacity sm:hidden"
          >
            <div
              ref={tabScrollThumbRef}
              className="absolute inset-y-0 left-0 rounded-full bg-action transition-[left,width] duration-150"
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            {activeTabMeta.eyebrow}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                {activeTabMeta.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                {activeTabMeta.description}
              </p>
            </div>
            <span className="w-fit rounded-full border border-info-border bg-info-soft px-3 py-1 text-xs font-bold text-info">
              {activeTabMeta.label}
            </span>
          </div>
        </div>

        {renderActiveTab()}
      </section>
    </AccountStaticShell>
  );
}

function TabCard({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-subtle bg-surface p-5 sm:p-6">
      <div
        className={
          aside
            ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]"
            : "grid gap-5"
        }
      >
        <div>{children}</div>
        {aside ? <aside>{aside}</aside> : null}
      </div>
    </section>
  );
}

function ThemePreview({
  colors,
}: {
  colors: {
    app: string;
    surface: string;
    border: string;
    content: string;
    muted: string;
    action: string;
    actionSoft: string;
    onAction: string;
    hover: string;
    successBg: string;
    successText: string;
    successBorder: string;
    warningBg: string;
    warningText: string;
    warningBorder: string;
    dangerBg: string;
    dangerText: string;
    dangerBorder: string;
    infoBg: string;
    infoText: string;
    infoBorder: string;
  };
}) {
  return (
    <div className="rounded-3xl border p-5" style={getPreviewStyle(colors)}>
      <div className="overflow-hidden rounded-[1.5rem] border border-[var(--settings-preview-border)] bg-[var(--settings-preview-app)] text-[var(--settings-preview-content)]">
        <div className="flex items-center justify-between border-b border-[var(--settings-preview-border)] bg-[var(--settings-preview-surface)] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--settings-preview-muted)]">
              Preview paletă
            </p>
            <p className="font-serif text-xl font-semibold">Revizzio</p>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--settings-preview-danger-text)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--settings-preview-warning-text)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--settings-preview-success-text)]" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="rounded-2xl border border-[var(--settings-preview-border)] bg-[var(--settings-preview-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className="rounded-full border border-[var(--settings-preview-success-border)] bg-[var(--settings-preview-success-bg)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--settings-preview-success-text)]">
                  Gata de studiu
                </span>
                <h3 className="mt-3 font-serif text-2xl font-semibold">
                  Biologie celulară
                </h3>
                <p className="mt-1 text-sm text-[var(--settings-preview-muted)]">
                  24 flashcard-uri · 3 quiz-uri · progres 72%
                </p>
              </div>
              <button
                type="button"
                className="rounded-full bg-[var(--settings-preview-action)] px-4 py-2 text-xs font-bold text-[var(--settings-preview-on-action)]"
              >
                Continuă
              </button>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--settings-preview-hover)]">
              <div className="h-full w-[72%] rounded-full bg-[var(--settings-preview-action)]" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--settings-preview-info-border)] bg-[var(--settings-preview-info-bg)] p-3 text-[var(--settings-preview-info-text)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
                Chat AI
              </p>
              <p className="mt-2 text-sm leading-5">
                Revizuiește întâi membrana celulară. Ai ezitat la două întrebări.
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--settings-preview-warning-border)] bg-[var(--settings-preview-warning-bg)] p-3 text-[var(--settings-preview-warning-text)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em]">
                Atenție
              </p>
              <p className="mt-2 text-sm leading-5">
                5 concepte intră în zona de uitare în 48h.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--settings-preview-border)] bg-[var(--settings-preview-surface)] p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--settings-preview-muted)]">
                Butoane și stări
              </p>
              <span className="rounded-full bg-[var(--settings-preview-action-soft)] px-3 py-1 text-[10px] font-bold text-[var(--settings-preview-action)]">
                accent
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--settings-preview-action)] px-4 py-2 text-xs font-bold text-[var(--settings-preview-on-action)]">
                Primary
              </span>
              <span className="rounded-full border border-[var(--settings-preview-border)] bg-[var(--settings-preview-hover)] px-4 py-2 text-xs font-bold text-[var(--settings-preview-content)]">
                Secondary
              </span>
              <span className="rounded-full border border-[var(--settings-preview-danger-border)] bg-[var(--settings-preview-danger-bg)] px-4 py-2 text-xs font-bold text-[var(--settings-preview-danger-text)]">
                Danger
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  description,
  value,
  isCustom,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  isCustom: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-subtle bg-surface p-3">
      <span
        className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl border border-subtle"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-14 -translate-x-1 -translate-y-1 cursor-pointer opacity-0"
          aria-label={`Schimbă culoarea pentru ${label}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold">
          {label}
          {isCustom ? (
            <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] text-warning">
              custom
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      <span className="font-mono text-xs text-muted">{value}</span>
    </label>
  );
}

function SettingsStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-subtle bg-app p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl font-semibold">{value}</p>
    </div>
  );
}
