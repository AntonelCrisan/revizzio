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
import { updateThemePreference } from "@/lib/auth-api";
import {
  getActivePlanBadge,
  getActivePlanMaterialLimit,
  getActivePlanName,
  getActivePlanPriceLabel,
} from "@/lib/account-plan";
import {
  colorThemePresets,
  getColorThemePreset,
  themeColorVariables,
} from "@/lib/theme-colors";
import {
  deleteStudyProject,
  listArchivedStudyProjects,
  restoreStudyProject,
  type StudyProject,
} from "@/lib/projects-api";

type SettingsTabId =
  | "account"
  | "study"
  | "appearance"
  | "colors"
  | "notifications"
  | "security"
  | "privacy";

const settingsSectionChangeEvent = "revizzio:settings-section-change";

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
    title: "Cum vrei să lucreze Reviss.",
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

const defaultSettingsTab: SettingsTabId = "account";

function formatArchiveDate(value: string | null) {
  if (!value) return "data necunoscută";

  try {
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "data necunoscută";
  }
}

function formatAccountDate(value?: string) {
  if (!value) return "necunoscut";

  try {
    return new Intl.DateTimeFormat("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "necunoscut";
  }
}

function formatThemePreference(value: ThemePreference) {
  if (value === "system") return "Sistem";
  if (value === "dark") return "Dark";
  return "Light";
}

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

const studyPaceOptions = [
  {
    id: "light",
    title: "Lejer",
    description: "Pentru zile încărcate, cu recapitulare minimă.",
    minutes: "9 min",
    progress: 38,
  },
  {
    id: "balanced",
    title: "Echilibrat",
    description: "Sesiuni scurte, dar constante, pentru progres zilnic.",
    minutes: "17 min",
    progress: 64,
  },
  {
    id: "exam",
    title: "Examen",
    description: "Ritm intens, cu quiz-uri mai dese și recapitulare activă.",
    minutes: "32 min",
    progress: 86,
  },
] as const;

type StudyPaceId = (typeof studyPaceOptions)[number]["id"];

const aiFeedbackOptions = [
  {
    id: "short",
    title: "Concise",
    description: "Răspunsuri scurte, bune când repeți rapid.",
  },
  {
    id: "guided",
    title: "Ghidate",
    description: "Explicații pas cu pas, cu exemple simple.",
  },
  {
    id: "exam",
    title: "Stil examen",
    description: "Feedback orientat pe formulări și capcane de test.",
  },
] as const;

type AiFeedbackId = (typeof aiFeedbackOptions)[number]["id"];

const studyAutomationOptions = [
  {
    id: "dailyReview",
    title: "Recapitulare zilnică",
    description: "Primești recomandarea de 5-20 minute pentru azi.",
  },
  {
    id: "quizAfterSummary",
    title: "Quiz după rezumat",
    description: "După fiecare rezumat, Reviss propune un quiz scurt.",
  },
  {
    id: "weakConceptAlerts",
    title: "Alerte concepte slabe",
    description: "Apar când un concept riscă să fie uitat.",
  },
] as const;

type StudyAutomationId = (typeof studyAutomationOptions)[number]["id"];

const notificationChannelOptions = [
  {
    id: "email",
    title: "Email",
    description: "Confirmări, resetare parolă și rapoarte importante.",
  },
  {
    id: "study",
    title: "Reminder studiu",
    description: "Alerte blânde pentru recapitularea zilnică.",
  },
  {
    id: "product",
    title: "Noutăți produs",
    description: "Funcționalități noi și schimbări relevante în aplicație.",
  },
] as const;

type NotificationChannelId = (typeof notificationChannelOptions)[number]["id"];

const notificationAlertOptions = [
  {
    id: "projectReady",
    title: "Proiect generat",
    description: "Când rezumatul, flashcard-urile sau quiz-ul sunt gata.",
  },
  {
    id: "weakConcepts",
    title: "Concepte de repetat",
    description: "Când Reviss observă zone care scad la retenție.",
  },
  {
    id: "billing",
    title: "Facturi și abonament",
    description: "Plăți, facturi noi și schimbări de plan.",
  },
] as const;

type NotificationAlertId = (typeof notificationAlertOptions)[number]["id"];

function isSettingsTabId(value: string): value is SettingsTabId {
  return settingsTabs.some((tab) => tab.id === value);
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "RZ"
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
  const [activeTab, setActiveTab] =
    useState<SettingsTabId>(defaultSettingsTab);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [archivedProjects, setArchivedProjects] = useState<StudyProject[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [archiveActionProjectId, setArchiveActionProjectId] = useState<
    string | null
  >(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveDeleteCandidate, setArchiveDeleteCandidate] =
    useState<StudyProject | null>(null);
  const deletingArchivedProjectIdsRef = useRef(new Set<string>());
  const [studyPace, setStudyPace] = useState<StudyPaceId>("balanced");
  const [aiFeedback, setAiFeedback] = useState<AiFeedbackId>("guided");
  const [studyAutomations, setStudyAutomations] = useState<
    Record<StudyAutomationId, boolean>
  >({
    dailyReview: true,
    quizAfterSummary: true,
    weakConceptAlerts: true,
  });
  const [notificationChannels, setNotificationChannels] = useState<
    Record<NotificationChannelId, boolean>
  >({
    email: true,
    study: true,
    product: false,
  });
  const [notificationAlerts, setNotificationAlerts] = useState<
    Record<NotificationAlertId, boolean>
  >({
    projectReady: true,
    weakConcepts: true,
    billing: true,
  });
  const [notificationFrequency, setNotificationFrequency] = useState<
    "instant" | "daily"
  >("daily");
  const selectedPreset = getColorThemePreset(colorScheme);
  const selectedColors = {
    ...selectedPreset.colors[resolvedTheme],
    ...customColors,
  };
  const customColorCount = Object.keys(customColors).length;
  const activeTabMeta =
    settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const selectedStudyPace =
    studyPaceOptions.find((option) => option.id === studyPace) ??
    studyPaceOptions[1];
  useEffect(() => {
    function syncActiveTab() {
      const hashTab = window.location.hash.replace("#", "");
      setActiveTab(isSettingsTabId(hashTab) ? hashTab : defaultSettingsTab);
    }

    function syncActiveTabFromEvent(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const nextTab = event.detail;
      if (typeof nextTab !== "string" || !isSettingsTabId(nextTab)) return;
      setActiveTab(nextTab);
    }

    const frame = window.requestAnimationFrame(syncActiveTab);
    window.addEventListener("hashchange", syncActiveTab);
    window.addEventListener(settingsSectionChangeEvent, syncActiveTabFromEvent);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncActiveTab);
      window.removeEventListener(
        settingsSectionChangeEvent,
        syncActiveTabFromEvent,
      );
    };
  }, []);

  useEffect(() => {
    if (activeTab !== "privacy" || !user) return;

    let isMounted = true;

    async function loadArchivedProjects() {
      setIsLoadingArchive(true);
      setArchiveError(null);

      try {
        const projects = await listArchivedStudyProjects();
        if (isMounted) {
          setArchivedProjects(projects);
        }
      } catch (error) {
        if (!isMounted) return;
        setArchivedProjects([]);
        setArchiveError(
          error instanceof Error
            ? error.message
            : "Arhiva proiectelor nu a putut fi încărcată.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingArchive(false);
        }
      }
    }

    void loadArchivedProjects();

    return () => {
      isMounted = false;
    };
  }, [activeTab, user]);

  async function restoreArchivedProject(projectId: string) {
    setArchiveActionProjectId(projectId);
    setArchiveError(null);
    try {
      await restoreStudyProject(projectId);
      setArchivedProjects((projects) =>
        projects.filter((project) => project.id !== projectId),
      );
      setPrivacyNotice("Proiectul a fost restabilit în lista proiectelor active.");
    } catch (error) {
      setArchiveError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi restabilit.",
      );
    } finally {
      setArchiveActionProjectId(null);
    }
  }

  async function deleteArchivedProject(projectId: string) {
    if (deletingArchivedProjectIdsRef.current.has(projectId)) return;

    deletingArchivedProjectIdsRef.current.add(projectId);
    setArchiveActionProjectId(projectId);
    setArchiveError(null);
    try {
      await deleteStudyProject(projectId);
      setArchivedProjects((projects) =>
        projects.filter((project) => project.id !== projectId),
      );
      setArchiveDeleteCandidate(null);
      setPrivacyNotice("Proiectul arhivat a fost șters definitiv.");
    } catch (error) {
      setArchiveError(
        error instanceof Error
          ? error.message
          : "Proiectul nu a putut fi șters.",
      );
    } finally {
      deletingArchivedProjectIdsRef.current.delete(projectId);
      setArchiveActionProjectId(null);
    }
  }

  async function saveThemePreference(themePreference: ThemePreference) {
    if (!user || isSavingTheme) return;

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

  function toggleStudyAutomation(id: StudyAutomationId) {
    setStudyAutomations((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleNotificationChannel(id: NotificationChannelId) {
    setNotificationChannels((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function toggleNotificationAlert(id: NotificationAlertId) {
    setNotificationAlerts((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function renderActiveTab() {
    switch (activeTab) {
      case "account":
        return (
          <div className="space-y-5">
            <section className="rounded-xl border border-subtle bg-surface p-6 sm:p-7">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <div className="relative w-fit">
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-action font-serif text-2xl font-semibold text-on-action">
                      {initials(user?.full_name ?? "Student Reviss")}
                    </span>
                    <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-subtle bg-surface text-success">
                      <svg
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m5 13 4 4L19 7"
                        />
                      </svg>
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-serif text-3xl font-semibold leading-tight text-content">
                        {user?.full_name ?? "Student Reviss"}
                      </h2>
                      <span className="inline-flex rounded-full border border-success-border bg-success-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-success">
                        {user?.is_active ? "Cont activ" : "Neverificat"}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-sm text-muted">
                      {user?.email ?? "student@universitate.ro"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 border-t border-subtle pt-5 text-sm sm:grid-cols-3 lg:min-w-[440px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <AccountDetail
                    label="Membru din"
                    value={formatAccountDate(user?.created_at)}
                  />
                  <AccountDetail
                    label="Interfață"
                    value={formatThemePreference(preference)}
                  />
                  <AccountDetail
                    label="Rol"
                    value={user?.role === "admin" ? "Admin" : "Utilizator"}
                  />
                </div>
              </div>
            </section>

            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Plan curent"
                value={getActivePlanName(user)}
                detail={`${getActivePlanBadge(user)} · ${getActivePlanPriceLabel(user)}`}
              />
              <SettingsMetric
                label="Limită materiale"
                value={getActivePlanMaterialLimit(user)}
                detail="Stabilită de abonamentul activ"
              />
              <SettingsMetric
                label="Protecție date"
                value="Securizat"
                detail="Sesiune autentificată și date protejate"
              />
            </div>
          </div>
        );

      case "study":
        return (
          <div className="space-y-5">
            <section className="rounded-xl border border-subtle bg-surface p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <SectionLabel>Ritmul curent</SectionLabel>
                  <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-content">
                    {selectedStudyPace.title}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                    {selectedStudyPace.description}
                  </p>
                </div>
                <div className="lg:min-w-[280px]">
                  <div className="flex items-end justify-between gap-4">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      Azi
                    </span>
                    <span className="font-serif text-4xl font-semibold">
                      {selectedStudyPace.minutes}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-app">
                    <div
                      className="h-full rounded-full bg-action transition-all duration-300"
                      style={{ width: `${selectedStudyPace.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <SettingsList title="Alege ritmul">
                {studyPaceOptions.map((option) => {
                  const isSelected = option.id === studyPace;
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      onClick={() => setStudyPace(option.id)}
                    >
                      <ToggleSwitch checked={isSelected} />
                      <OptionState active={isSelected} activeLabel="activ" />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>

              <SettingsList title="Feedback AI">
                {aiFeedbackOptions.map((option) => {
                  const isSelected = option.id === aiFeedback;
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      onClick={() => setAiFeedback(option.id)}
                    >
                      <ToggleSwitch checked={isSelected} />
                      <OptionState active={isSelected} activeLabel="activ" />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>
            </div>

            <SettingsList title="Automatizări">
              {studyAutomationOptions.map((option) => {
                const isActive = studyAutomations[option.id];
                return (
                  <SettingsOptionButton
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    onClick={() => toggleStudyAutomation(option.id)}
                  >
                    <ToggleSwitch checked={isActive} />
                    <OptionState active={isActive} />
                  </SettingsOptionButton>
                );
              })}
            </SettingsList>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Mod activ"
                value={formatThemePreference(preference)}
                detail={`Afișat acum ca ${formatThemePreference(resolvedTheme)}`}
              />
              <SettingsMetric
                label="Paletă"
                value={selectedPreset.name}
                detail="Configurată separat în Culori"
              />
              <SettingsMetric
                label="Sincronizare"
                value={isSavingTheme ? "Se salvează" : "Preferință cont"}
                detail="Se aplică automat după autentificare"
              />
            </div>

            <SettingsList title="Mod afișare">
              {themeOptions.map((option) => {
                const isSelected =
                  (user?.theme_preference ?? preference) === option.value;
                return (
                  <SettingsOptionButton
                    key={option.value}
                    disabled={isSavingTheme}
                    onClick={() => saveThemePreference(option.value)}
                    title={option.title}
                    description={option.description}
                  >
                    <ToggleSwitch checked={isSelected} />
                    <OptionState active={isSelected} activeLabel="activ" />
                  </SettingsOptionButton>
                );
              })}
            </SettingsList>
          </div>
        );

      case "colors":
        return (
          <div className="space-y-5">
            <section className="rounded-xl border border-subtle bg-surface p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <SectionLabel>Tema curentă</SectionLabel>
                  <p className="mt-2 font-serif text-2xl font-semibold text-content">
                    {selectedPreset.name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {customColorCount} culori modificate manual
                  </p>
                </div>

                {customColorCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetCustomColors}
                    className="w-fit rounded-full border border-danger-border bg-danger-soft px-4 py-2 text-xs font-bold text-danger transition hover:opacity-80"
                  >
                    Resetează modificările
                  </button>
                ) : null}
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <SettingsList title="Preseturi">
                {colorThemePresets.map((preset) => {
                  const isSelected = preset.id === colorScheme;
                  return (
                    <SettingsOptionButton
                      key={preset.id}
                      title={preset.name}
                      description={preset.description}
                      onClick={() => setColorScheme(preset.id)}
                    >
                      <span className="flex items-center gap-2">
                        {preset.preview.map((color) => (
                          <span
                            key={color}
                            className="h-6 w-6 rounded-full border border-subtle"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <ToggleSwitch checked={isSelected} />
                      <OptionState active={isSelected} activeLabel="activ" />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>

              <ThemePreview colors={selectedColors} />
            </div>

            <SettingsList
              title="Editor culori"
              detail="Modificările suprascriu paleta selectată."
              meta={`${customColorCount} custom`}
            >
              {themeColorVariables.map((variable) => (
                <ColorControl
                  key={variable.key}
                  label={variable.label}
                  description={variable.description}
                  value={selectedColors[variable.key]}
                  isCustom={customColors[variable.key] !== undefined}
                  onChange={(value) => setCustomColor(variable.key, value)}
                />
              ))}
            </SettingsList>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Frecvență"
                value={notificationFrequency === "daily" ? "Zilnic" : "Instant"}
                detail="Cum primești notificările importante"
              />
              <SettingsMetric
                label="Canale active"
                value={`${Object.values(notificationChannels).filter(Boolean).length}/3`}
                detail="Email, studiu și noutăți produs"
              />
              <SettingsMetric
                label="Evenimente"
                value={`${Object.values(notificationAlerts).filter(Boolean).length}/3`}
                detail="Tipuri de alerte permise"
              />
            </div>

            <SettingsList title="Livrare">
              {[
                {
                  id: "instant" as const,
                  title: "Instant",
                  description: "Primești alertele imediat ce apar.",
                },
                {
                  id: "daily" as const,
                  title: "Rezumat zilnic",
                  description: "Un singur email cu ce contează pentru azi.",
                },
              ].map((option) => {
                const isSelected = notificationFrequency === option.id;
                return (
                  <SettingsOptionButton
                    key={option.id}
                    title={option.title}
                    description={option.description}
                    onClick={() => setNotificationFrequency(option.id)}
                  >
                    <ToggleSwitch checked={isSelected} />
                    <OptionState active={isSelected} activeLabel="activ" />
                  </SettingsOptionButton>
                );
              })}
            </SettingsList>

            <div className="grid gap-5 lg:grid-cols-2">
              <SettingsList title="Canale">
                {notificationChannelOptions.map((option) => {
                  const isActive = notificationChannels[option.id];
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      onClick={() => toggleNotificationChannel(option.id)}
                    >
                      <ToggleSwitch checked={isActive} />
                      <OptionState active={isActive} />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>

              <SettingsList title="Evenimente">
                {notificationAlertOptions.map((option) => {
                  const isActive = notificationAlerts[option.id];
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      title={option.title}
                      description={option.description}
                      onClick={() => toggleNotificationAlert(option.id)}
                    >
                      <ToggleSwitch checked={isActive} />
                      <OptionState active={isActive} activeLabel="activ" />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>
            </div>
          </div>
        );

      case "security":
        return (
          <div className="space-y-5">
            <section className="rounded-xl border border-warning-border bg-warning-soft p-5 text-warning">
              <SectionLabel>Notă de securitate</SectionLabel>
              <p className="mt-2 max-w-2xl text-sm leading-6">
                Sesiunea curentă este protejată prin cookie HttpOnly. Acțiunile
                avansate vor fi conectate gradual la backend.
              </p>
            </section>

            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Sesiune"
                value="HttpOnly"
                detail="Tokenul nu este expus în JavaScript"
              />
              <SettingsMetric
                label="Cont"
                value={user?.is_active ? "Activ" : "Neverificat"}
                detail="Statusul curent al autentificării"
              />
              <SettingsMetric
                label="Rol acces"
                value={user?.role === "admin" ? "Admin" : "Utilizator"}
                detail="Permisiuni active în aplicație"
              />
            </div>

            <SettingsList title="Acțiuni securitate">
              <SettingsOptionButton
                title="Schimbă parola"
                description="Pregătit pentru integrarea backend."
              >
                <ActionPill>Schimbă</ActionPill>
              </SettingsOptionButton>
              <SettingsOptionButton
                title="Șterge contul"
                description="Acțiune critică, dezactivată momentan."
                tone="danger"
              >
                <ActionPill tone="danger">Solicită</ActionPill>
              </SettingsOptionButton>
            </SettingsList>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-5">
            <section className="rounded-xl border border-warning-border bg-warning-soft p-5 text-warning">
              <SectionLabel>Ștergere cont</SectionLabel>
              <p className="mt-2 max-w-3xl text-sm leading-6">
                Acțiunile critice cer reconfirmare. Datele fiscale sau cele
                necesare apărării drepturilor pot fi păstrate cât cere legea.
              </p>
            </section>

            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Arhivă"
                value={`${archivedProjects.length}`}
                detail="Proiecte ascunse din dashboard"
              />
              <SettingsMetric
                label="Cookie-uri"
                value="Configurabile"
                detail="Acordul poate fi modificat oricând"
              />
              <SettingsMetric
                label="Export date"
                value="La cerere"
                detail="Pregătit pentru endpoint backend"
              />
            </div>

            <SettingsList title="Date și confidențialitate">
              <SettingsActionRow
                title="Descarcă datele contului"
                description="Include profilul, preferințele, proiectele și istoricul disponibil pentru contul tău."
              >
                <button
                  type="button"
                  onClick={() =>
                    setPrivacyNotice(
                      "Exportul datelor va genera o arhivă descărcabilă după conectarea endpointului backend.",
                    )
                  }
                  className="w-fit rounded-full border border-action px-4 py-2 text-xs font-bold transition hover:bg-action hover:text-on-action"
                >
                  Descarcă datele
                </button>
              </SettingsActionRow>

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
                <SettingsOptionButton
                  key={title}
                  onClick={() =>
                    setPrivacyNotice(
                      `${title}: solicitarea va fi validată server-side și jurnalizată înainte de executare.`,
                    )
                  }
                  title={title}
                  description={description}
                  tone={title === "Șterge contul" ? "danger" : "default"}
                >
                  <ActionPill
                    tone={title === "Șterge contul" ? "danger" : "default"}
                  >
                    {title === "Șterge contul" ? "Solicită" : "Deschide"}
                  </ActionPill>
                </SettingsOptionButton>
              ))}

              <SettingsActionRow
                title="Setări cookie"
                description="Poți modifica sau retrage acordul pentru cookie-urile opționale oricând."
              >
                <CookieSettingsButton className="w-fit rounded-full bg-action px-4 py-2 text-xs font-bold text-on-action transition hover:bg-action-hover" />
              </SettingsActionRow>

              <SettingsActionRow
                title="Arhiva proiectelor"
                description="Proiectele arhivate sunt ascunse din dashboard și pot fi restabilite dintr-o fereastră separată."
              >
                <button
                  type="button"
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-action px-4 py-2 text-xs font-bold transition hover:bg-action hover:text-on-action"
                >
                  Vezi arhiva
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px]">
                    {archivedProjects.length}
                  </span>
                </button>
              </SettingsActionRow>
            </SettingsList>

            {privacyNotice ? (
              <div
                role="status"
                className="rounded-xl border border-success-border bg-success-soft px-4 py-3 text-xs font-semibold leading-5 text-success"
              >
                {privacyNotice}
              </div>
            ) : null}

            {isArchiveModalOpen ? (
              <ArchivedProjectsModal
                projects={archivedProjects}
                isLoading={isLoadingArchive}
                actionProjectId={archiveActionProjectId}
                error={archiveError}
                onClose={() => setIsArchiveModalOpen(false)}
                onRestore={(projectId) => void restoreArchivedProject(projectId)}
                onDelete={(project) => setArchiveDeleteCandidate(project)}
              />
            ) : null}

            {archiveDeleteCandidate ? (
              <ArchiveDeleteModal
                project={archiveDeleteCandidate}
                isDeleting={
                  archiveActionProjectId === archiveDeleteCandidate.id
                }
                onCancel={() => setArchiveDeleteCandidate(null)}
                onConfirm={() =>
                  void deleteArchivedProject(archiveDeleteCandidate.id)
                }
              />
            ) : null}
          </div>
        );
    }
  }

  return (
    <AccountStaticShell activePage="settings">
      <section className="space-y-7">
        <div className="flex flex-col gap-5 border-b border-subtle pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex rounded-full border border-subtle bg-action-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted">
              {activeTabMeta.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-[0.95] text-content sm:text-5xl">
              {activeTabMeta.title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
              {activeTabMeta.description}
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-subtle bg-surface px-4 py-2 text-xs text-muted">
            <span>Secțiune:</span>
            <span className="font-black text-content">
              {activeTabMeta.label}
            </span>
          </div>
        </div>

        {renderActiveTab()}
      </section>
    </AccountStaticShell>
  );
}

function ArchivedProjectsModal({
  projects,
  isLoading,
  actionProjectId,
  error,
  onClose,
  onRestore,
  onDelete,
}: {
  projects: StudyProject[];
  isLoading: boolean;
  actionProjectId: string | null;
  error: string | null;
  onClose: () => void;
  onRestore: (projectId: string) => void;
  onDelete: (project: StudyProject) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-content/35 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-projects-title"
    >
      <div className="flex max-h-[82vh] w-full max-w-3xl flex-col rounded-xl border border-subtle bg-surface shadow-2xl shadow-black/20">
        <div className="flex items-start justify-between gap-4 border-b border-subtle p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-warning">
              Arhivă
            </p>
            <h2
              id="archive-projects-title"
              className="mt-2 font-serif text-3xl font-semibold leading-tight"
            >
              Proiecte arhivate
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Restabilește proiectele pe care vrei să le readuci în dashboard
              sau șterge-le definitiv.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-subtle transition hover:bg-surface-hover"
            aria-label="Închide arhiva"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error ? (
          <div className="border-b border-danger-border bg-danger-soft px-6 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 overflow-y-auto px-6">
          {isLoading ? (
            <div className="py-8 text-sm font-semibold text-muted">
              Se încarcă arhiva...
            </div>
          ) : projects.length ? (
            <div className="divide-y divide-subtle">
              {projects.map((project) => {
                const isBusy = actionProjectId === project.id;
                return (
                  <div
                    key={project.id}
                    className="grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-base font-black">
                        {project.name}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-muted">
                        {project.subject_name} · {project.file_count} materiale ·
                        arhivat pe {formatArchiveDate(project.archived_at)}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onRestore(project.id)}
                        className="rounded-full border border-action px-4 py-2 text-xs font-bold transition hover:bg-action hover:text-on-action disabled:cursor-wait disabled:opacity-60"
                      >
                        Restabilește
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onDelete(project)}
                        className="rounded-full border border-danger-border px-4 py-2 text-xs font-bold text-danger transition hover:bg-danger-soft disabled:cursor-wait disabled:opacity-60"
                      >
                        Șterge
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-sm font-semibold text-muted">
              Nu ai proiecte arhivate.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ArchiveDeleteModal({
  project,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  project: StudyProject;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-content/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="archive-delete-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-subtle bg-surface p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-danger">
          Ștergere definitivă
        </p>
        <h2
          id="archive-delete-title"
          className="mt-3 font-serif text-3xl font-semibold leading-tight"
        >
          Ștergi proiectul arhivat „{project.name}”?
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Această acțiune elimină proiectul și fișierele lui. Dacă vrei să-l
          folosești din nou, alege Restabilește.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-full border border-subtle px-5 py-3 text-sm font-bold transition hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full bg-danger px-5 py-3 text-sm font-bold text-on-action transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? "Se șterge..." : "Șterge definitiv"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 font-semibold text-content">{value}</p>
    </div>
  );
}

function SettingsMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-subtle bg-surface p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-4 font-serif text-2xl font-semibold leading-tight text-content">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
      {children}
    </p>
  );
}

function SettingsList({
  title,
  detail,
  meta,
  children,
}: {
  title: string;
  detail?: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-subtle bg-surface p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel>{title}</SectionLabel>
          {detail ? (
            <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
          ) : null}
        </div>
        {meta ? (
          <span className="text-xs font-bold text-muted">{meta}</span>
        ) : null}
      </div>
      <div className="mt-4 divide-y divide-subtle border-y border-subtle">
        {children}
      </div>
    </section>
  );
}

function SettingsOptionButton({
  title,
  description,
  children,
  onClick,
  disabled = false,
  tone = "default",
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group -mx-3 grid w-[calc(100%+1.5rem)] gap-3 rounded-xl px-3 py-4 text-left transition disabled:cursor-wait disabled:opacity-60 sm:grid-cols-[1fr_auto] sm:items-center ${
        tone === "danger" ? "hover:bg-danger-soft" : "hover:bg-surface-hover"
      }`}
    >
      <span className={tone === "danger" ? "text-danger" : undefined}>
        <span className="block text-sm font-black">{title}</span>
        <span
          className={`mt-1 block text-xs leading-5 ${
            tone === "danger" ? "text-danger/80" : "text-muted"
          }`}
        >
          {description}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-3 sm:justify-end">
        {children}
      </span>
    </button>
  );
}

function SettingsActionRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="group -mx-3 grid w-[calc(100%+1.5rem)] gap-3 rounded-xl px-3 py-4 transition hover:bg-surface-hover sm:grid-cols-[1fr_auto] sm:items-center">
      <span>
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      <span className="flex flex-wrap gap-2 sm:justify-end">{children}</span>
    </div>
  );
}

function OptionState({
  active,
  activeLabel = "pornit",
}: {
  active: boolean;
  activeLabel?: string;
}) {
  return (
    <span className="text-xs font-black text-muted group-hover:text-content">
      {active ? activeLabel : "oprit"}
    </span>
  );
}

function ToggleSwitch({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border p-0.5 transition ${
        checked
          ? "border-success-border bg-success-soft"
          : "border-subtle bg-surface"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full shadow-sm transition-transform ${
          checked ? "translate-x-5 bg-success" : "translate-x-0 bg-muted/55"
        }`}
      />
    </span>
  );
}

function ActionPill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition group-hover:translate-x-0.5 ${
        tone === "danger"
          ? "bg-danger-soft text-danger"
          : "bg-action text-on-action"
      }`}
    >
      {children}
      <span aria-hidden="true">→</span>
    </span>
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
    <section
      className="rounded-xl border border-subtle bg-surface p-5"
      style={getPreviewStyle(colors)}
    >
      <SectionLabel>Preview paletă</SectionLabel>
      <div className="mt-4 rounded-xl border border-[var(--settings-preview-border)] bg-[var(--settings-preview-app)] p-5 text-[var(--settings-preview-content)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--settings-preview-border)] pb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--settings-preview-muted)]">
              Curs activ
            </p>
            <p className="mt-1 font-serif text-3xl font-semibold leading-tight">
              Biologie celulară
            </p>
          </div>
          <span className="rounded-full bg-[var(--settings-preview-action)] px-4 py-2 text-xs font-black text-[var(--settings-preview-on-action)]">
            Continuă
          </span>
        </div>

        <div className="divide-y divide-[var(--settings-preview-border)]">
          {[
            ["Status", "Gata de studiu", "success"],
            ["Chat AI", "Revizuiește întâi membrana celulară.", "info"],
            ["Atenție", "5 concepte intră în zona de uitare în 48h.", "warning"],
          ].map(([label, value, tone]) => (
            <div
              key={label}
              className="grid gap-3 py-4 text-sm sm:grid-cols-[0.3fr_1fr] sm:items-center"
            >
              <span
                className={
                  tone === "success"
                    ? "font-black text-[var(--settings-preview-success-text)]"
                    : tone === "warning"
                      ? "font-black text-[var(--settings-preview-warning-text)]"
                      : "font-black text-[var(--settings-preview-info-text)]"
                }
              >
                {label}
              </span>
              <span className="text-[var(--settings-preview-muted)]">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--settings-preview-hover)]">
            <div className="h-full w-[72%] rounded-full bg-[var(--settings-preview-action)]" />
          </div>
        </div>
      </div>
    </section>
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
    <label className="group -mx-3 grid w-[calc(100%+1.5rem)] cursor-pointer gap-3 rounded-xl px-3 py-4 transition hover:bg-surface-hover sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-subtle"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-12 -translate-x-1 -translate-y-1 cursor-pointer opacity-0"
          aria-label={`Schimbă culoarea pentru ${label}`}
        />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm font-black">
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
      <span className="flex items-center gap-3 sm:justify-end">
        <span className="font-mono text-xs text-muted">{value}</span>
        <span className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs font-black text-content transition group-hover:border-content">
          Modifică
        </span>
      </span>
    </label>
  );
}
