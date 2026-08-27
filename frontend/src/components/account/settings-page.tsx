"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AccountStaticShell } from "@/components/account/account-static-shell";
import { useAuth } from "@/components/auth/auth-provider";
import { CookieSettingsButton } from "@/components/legal/cookie-consent";
import {
  type ThemePreference,
  useTheme,
} from "@/components/theme-provider";
import { useLanguage } from "@/components/language-provider";
import {
  AuthApiError,
  type LanguagePreference,
  requestAccountDeletion,
  updateLanguagePreference,
  updateThemePreference,
  withdrawNewsletterConsent,
} from "@/lib/auth-api";
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
  deleteAllFlashcards,
  deleteAllMaterials,
  deleteStudyProject,
  listArchivedStudyProjects,
  restoreStudyProject,
  type StudyProject,
} from "@/lib/projects-api";
import {
  getStudyPreferences,
  updateStudyPreferences,
  type StudyPreferences,
  type StudyPreferencesUpdate,
} from "@/lib/preferences-api";

type SettingsTabId =
  | "account"
  | "study"
  | "appearance"
  | "colors"
  | "notifications"
  | "security"
  | "privacy";
type AccountDeletionRequestState = "idle" | "submitting" | "sent";

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
  return "Luminos";
}

function formatLanguagePreference(value: LanguagePreference) {
  if (value === "en") return "Engleză";
  if (value === "fr") return "Franceză";
  return "Română";
}

const languageOptions: Array<{
  value: LanguagePreference;
  title: string;
  description: string;
}> = [
  {
    value: "ro",
    title: "Română",
    description: "Interfața principală pentru studenții din România.",
  },
  {
    value: "en",
    title: "English",
    description: "For international students who prefer English.",
  },
  {
    value: "fr",
    title: "Français",
    description: "Pentru studenții francofoni.",
  },
];

const themeOptions: Array<{
  value: ThemePreference;
  title: string;
  description: string;
}> = [
  {
    value: "light",
    title: "Luminos",
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
    title: "Flexibil",
    description: "Pentru zile încărcate, cu recapitulare minimă.",
  },
  {
    id: "balanced",
    title: "Structurat",
    description: "Sesiuni scurte, dar constante, pentru progres zilnic.",
  },
  {
    id: "exam",
    title: "Intensiv",
    description: "Ritm intens, cu quiz-uri mai dese și recapitulare activă.",
  },
] as const;

const aiFeedbackOptions = [
  {
    id: "short",
    title: "Concis",
    description: "Răspunsuri scurte, bune când repeți rapid.",
  },
  {
    id: "guided",
    title: "Ghidat",
    description: "Explicații pas cu pas, cu exemple simple.",
  },
  {
    id: "exam",
    title: "Stil examen",
    description: "Feedback orientat pe formulări și capcane de test.",
  },
] as const;

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

type BooleanPreferenceKey = {
  [K in keyof StudyPreferences]: StudyPreferences[K] extends boolean ? K : never;
}[keyof StudyPreferences];

const studyAutomationPreferenceKey: Record<
  StudyAutomationId,
  BooleanPreferenceKey
> = {
  dailyReview: "automation_daily_review",
  quizAfterSummary: "automation_quiz_after_summary",
  weakConceptAlerts: "automation_weak_concept_alerts",
};

const notificationChannelOptions = [
  {
    id: "email",
    title: "Email",
    description:
      "Reminder-uri și alerte prin email. Confirmările de securitate și facturile ajung mereu, indiferent de acest comutator.",
  },
  {
    id: "study",
    title: "Reminder studiu",
    description:
      "Alerte blânde pentru recapitularea zilnică. Aceeași setare ca „Recapitulare zilnică” din tab-ul Studiu.",
  },
  {
    id: "product",
    title: "Noutăți produs",
    description: "Funcționalități noi și schimbări relevante în aplicație.",
  },
] as const;

type NotificationChannelId = (typeof notificationChannelOptions)[number]["id"];

const notificationChannelPreferenceKey: Record<
  NotificationChannelId,
  BooleanPreferenceKey
> = {
  email: "notify_email_enabled",
  study: "automation_daily_review",
  product: "newsletter_consent",
};

const notificationAlertOptions = [
  {
    id: "projectReady",
    title: "Proiect generat",
    description: "Când rezumatul, flashcard-urile sau quiz-ul sunt gata.",
  },
  {
    id: "weakConcepts",
    title: "Concepte de repetat",
    description:
      "Când Reviss observă zone care scad la retenție. Aceeași setare ca „Alerte concepte slabe” din tab-ul Studiu.",
  },
  {
    id: "billing",
    title: "Facturi și abonament",
    description:
      "Confirmarea de plată e mereu trimisă; acest comutator e doar pentru viitoare alerte suplimentare.",
  },
] as const;

type NotificationAlertId = (typeof notificationAlertOptions)[number]["id"];

const notificationAlertPreferenceKey: Record<
  NotificationAlertId,
  BooleanPreferenceKey
> = {
  projectReady: "notify_alert_project_ready",
  weakConcepts: "automation_weak_concept_alerts",
  billing: "notify_alert_billing",
};

function dataExportHref() {
  return "/api/auth/me/data-export";
}

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
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] =
    useState<SettingsTabId>(defaultSettingsTab);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const [archivedProjects, setArchivedProjects] = useState<StudyProject[]>([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [archiveActionProjectId, setArchiveActionProjectId] = useState<
    string | null
  >(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [securityNotice, setSecurityNotice] = useState<{
    tone: "success" | "danger";
    message: string;
  } | null>(null);
  const [accountDeletionState, setAccountDeletionState] =
    useState<AccountDeletionRequestState>("idle");
  const [isAccountDeletionModalOpen, setIsAccountDeletionModalOpen] =
    useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveDeleteCandidate, setArchiveDeleteCandidate] =
    useState<StudyProject | null>(null);
  const [privacyActionState, setPrivacyActionState] = useState<
    "idle" | "materials" | "flashcards" | "newsletter"
  >("idle");
  const [privacyWipeConfirm, setPrivacyWipeConfirm] = useState<
    "materials" | "flashcards" | null
  >(null);
  const deletingArchivedProjectIdsRef = useRef(new Set<string>());
  const [preferences, setPreferences] = useState<StudyPreferences | null>(null);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState<string | null>(null);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const selectedPreset = getColorThemePreset(colorScheme);
  const selectedColors = {
    ...selectedPreset.colors[resolvedTheme],
    ...customColors,
  };
  const customColorCount = Object.keys(customColors).length;
  const activeTabMeta =
    settingsTabs.find((tab) => tab.id === activeTab) ?? settingsTabs[0];
  const selectedStudyPace =
    studyPaceOptions.find((option) => option.id === preferences?.study_pace) ??
    studyPaceOptions[1];
  const hasPendingAccountDeletionRequest =
    accountDeletionState === "sent" ||
    Boolean(user?.account_deletion_request_pending);

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      setIsLoadingPreferences(true);
      setPreferencesError(null);

      try {
        const result = await getStudyPreferences();
        if (isMounted) setPreferences(result);
      } catch (error) {
        if (!isMounted) return;
        setPreferencesError(
          error instanceof Error
            ? error.message
            : "Preferințele nu au putut fi încărcate.",
        );
      } finally {
        if (isMounted) setIsLoadingPreferences(false);
      }
    }

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  async function savePreference(patch: StudyPreferencesUpdate) {
    if (!preferences || isSavingPreferences) return;

    const previousPreferences = preferences;
    setPreferences({ ...preferences, ...patch });
    setIsSavingPreferences(true);
    setPreferencesError(null);

    try {
      const result = await updateStudyPreferences(patch);
      setPreferences(result);
    } catch (error) {
      setPreferences(previousPreferences);
      setPreferencesError(
        error instanceof Error
          ? error.message
          : "Preferința nu a putut fi salvată.",
      );
    } finally {
      setIsSavingPreferences(false);
    }
  }

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
    window.addEventListener("popstate", syncActiveTab);
    window.addEventListener(settingsSectionChangeEvent, syncActiveTabFromEvent);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", syncActiveTab);
      window.removeEventListener("popstate", syncActiveTab);
      window.removeEventListener(
        settingsSectionChangeEvent,
        syncActiveTabFromEvent,
      );
    };
  }, []);

  function selectSettingsTab(nextTab: SettingsTabId) {
    setActiveTab(nextTab);

    const nextHash = `#${nextTab}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, "", nextHash);
    }
  }

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

  async function confirmPrivacyWipe(target: "materials" | "flashcards") {
    setPrivacyWipeConfirm(null);
    setPrivacyActionState(target);
    setPrivacyNotice(null);

    try {
      const result =
        target === "materials"
          ? await deleteAllMaterials()
          : await deleteAllFlashcards();
      setPrivacyNotice(result.message);
    } catch (error) {
      setPrivacyNotice(
        error instanceof Error
          ? error.message
          : "Acțiunea nu a putut fi finalizată momentan.",
      );
    } finally {
      setPrivacyActionState("idle");
    }
  }

  async function withdrawNewsletter() {
    if (privacyActionState !== "idle") return;

    setPrivacyActionState("newsletter");
    setPrivacyNotice(null);

    try {
      const result = await withdrawNewsletterConsent();
      setPrivacyNotice(result.message);
    } catch (error) {
      setPrivacyNotice(
        error instanceof AuthApiError
          ? error.message
          : "Consimțământul nu a putut fi retras momentan.",
      );
    } finally {
      setPrivacyActionState("idle");
    }
  }

  function openAccountDeletionModal() {
    if (hasPendingAccountDeletionRequest) {
      setAccountDeletionState("sent");
      setSecurityNotice({
        tone: "success",
        message:
          "Ai deja o solicitare de ștergere înregistrată. Un administrator o va procesa.",
      });
      return;
    }

    setSecurityNotice(null);
    setIsAccountDeletionModalOpen(true);
  }

  async function submitAccountDeletionRequest() {
    if (accountDeletionState === "submitting" || hasPendingAccountDeletionRequest) {
      return;
    }

    setSecurityNotice(null);
    setAccountDeletionState("submitting");
    setIsAccountDeletionModalOpen(false);

    try {
      const result = await requestAccountDeletion();
      setSecurityNotice({ tone: "success", message: result.message });
      setAccountDeletionState("sent");
      if (user) {
        setUser({ ...user, account_deletion_request_pending: true });
      }
    } catch (error) {
      if (error instanceof AuthApiError && error.status === 409) {
        setSecurityNotice({ tone: "success", message: error.message });
        setAccountDeletionState("sent");
        if (user) {
          setUser({ ...user, account_deletion_request_pending: true });
        }
        return;
      }

      setSecurityNotice({
        tone: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Solicitarea de ștergere nu a putut fi trimisă.",
      });
      setAccountDeletionState("idle");
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

  async function saveLanguagePreference(
    languagePreference: LanguagePreference,
  ) {
    if (!user || isSavingLanguage) return;

    const previousPreference = user.language_preference;
    setIsSavingLanguage(true);
    setLanguage(languagePreference);
    setUser({ ...user, language_preference: languagePreference });

    try {
      const updatedUser = await updateLanguagePreference(languagePreference);
      setUser(updatedUser);
    } catch {
      setLanguage(previousPreference);
      setUser({ ...user, language_preference: previousPreference });
    } finally {
      setIsSavingLanguage(false);
    }
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

                <div className="grid gap-3 border-t border-subtle pt-5 text-sm sm:grid-cols-2 xl:grid-cols-4 lg:min-w-[520px] lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                  <AccountDetail
                    label="Membru din"
                    value={formatAccountDate(user?.created_at)}
                  />
                  <AccountDetail
                    label="Interfață"
                    value={formatThemePreference(preference)}
                  />
                  <AccountDetail
                    label="Limba"
                    value={formatLanguagePreference(
                      user?.language_preference ?? language,
                    )}
                  />
                  <AccountDetail
                    label="Rol"
                    value={
                      user?.role.trim().toLowerCase() === "admin"
                        ? "Admin"
                        : "Utilizator"
                    }
                  />
                </div>
              </div>
            </section>

            <SettingsList
              title="Limba aplicației"
              detail="Preferința este salvată pe cont și se aplică după autentificare."
            >
              {languageOptions.map((option) => {
                const isSelected =
                  (user?.language_preference ?? language) === option.value;
                return (
                  <SettingsOptionButton
                    key={option.value}
                    disabled={isSavingLanguage}
                    onClick={() => saveLanguagePreference(option.value)}
                    title={option.title}
                    description={option.description}
                  >
                    <ToggleSwitch checked={isSelected} />
                    <OptionState active={isSelected} activeLabel="activ" />
                  </SettingsOptionButton>
                );
              })}
            </SettingsList>

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
            {preferencesError ? (
              <p className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                {preferencesError}
              </p>
            ) : null}

            <section className="rounded-xl border border-subtle bg-surface p-6">
              <div>
                <SectionLabel>Ritmul curent</SectionLabel>
                <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight text-content">
                  {selectedStudyPace.title}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  {selectedStudyPace.description}
                </p>
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <SettingsList title="Alege ritmul">
                {studyPaceOptions.map((option) => {
                  const isSelected = option.id === preferences?.study_pace;
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      disabled={isLoadingPreferences || isSavingPreferences}
                      title={option.title}
                      description={option.description}
                      onClick={() => void savePreference({ study_pace: option.id })}
                    >
                      <ToggleSwitch checked={isSelected} />
                      <OptionState active={isSelected} activeLabel="activ" />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>

              <SettingsList title="Feedback AI">
                {aiFeedbackOptions.map((option) => {
                  const isSelected = option.id === preferences?.ai_feedback_style;
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      disabled={isLoadingPreferences || isSavingPreferences}
                      title={option.title}
                      description={option.description}
                      onClick={() =>
                        void savePreference({ ai_feedback_style: option.id })
                      }
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
                const isActive = Boolean(
                  preferences?.[studyAutomationPreferenceKey[option.id]],
                );
                return (
                  <SettingsOptionButton
                    key={option.id}
                    disabled={isLoadingPreferences || isSavingPreferences}
                    title={option.title}
                    description={option.description}
                    onClick={() =>
                      void savePreference({
                        [studyAutomationPreferenceKey[option.id]]: !isActive,
                      })
                    }
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

      case "notifications": {
        const activeChannelCount = notificationChannelOptions.filter(
          (option) => preferences?.[notificationChannelPreferenceKey[option.id]],
        ).length;
        const activeAlertCount = notificationAlertOptions.filter(
          (option) => preferences?.[notificationAlertPreferenceKey[option.id]],
        ).length;

        return (
          <div className="space-y-5">
            {preferencesError ? (
              <p className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm font-bold text-danger">
                {preferencesError}
              </p>
            ) : null}

            <div className="grid gap-5 md:grid-cols-3">
              <SettingsMetric
                label="Frecvență"
                value={
                  preferences?.notify_frequency === "instant"
                    ? "Instant"
                    : "Zilnic"
                }
                detail="Cum primești notificările importante"
              />
              <SettingsMetric
                label="Canale active"
                value={`${activeChannelCount}/${notificationChannelOptions.length}`}
                detail="Email, studiu și noutăți produs"
              />
              <SettingsMetric
                label="Evenimente"
                value={`${activeAlertCount}/${notificationAlertOptions.length}`}
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
                const isSelected = preferences?.notify_frequency === option.id;
                return (
                  <SettingsOptionButton
                    key={option.id}
                    disabled={isLoadingPreferences || isSavingPreferences}
                    title={option.title}
                    description={option.description}
                    onClick={() =>
                      void savePreference({ notify_frequency: option.id })
                    }
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
                  const key = notificationChannelPreferenceKey[option.id];
                  const isActive = Boolean(preferences?.[key]);
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      disabled={isLoadingPreferences || isSavingPreferences}
                      title={option.title}
                      description={option.description}
                      onClick={() => void savePreference({ [key]: !isActive })}
                    >
                      <ToggleSwitch checked={isActive} />
                      <OptionState active={isActive} />
                    </SettingsOptionButton>
                  );
                })}
              </SettingsList>

              <SettingsList title="Evenimente">
                {notificationAlertOptions.map((option) => {
                  const key = notificationAlertPreferenceKey[option.id];
                  const isActive = Boolean(preferences?.[key]);
                  return (
                    <SettingsOptionButton
                      key={option.id}
                      disabled={isLoadingPreferences || isSavingPreferences}
                      title={option.title}
                      description={option.description}
                      onClick={() => void savePreference({ [key]: !isActive })}
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
      }

      case "security":
        return (
          <div className="space-y-5">
            {securityNotice ? (
              <p
                className={`rounded-xl border px-4 py-3 text-sm font-bold leading-6 ${
                  securityNotice.tone === "danger"
                    ? "border-danger-border bg-danger-soft text-danger"
                    : "border-success-border bg-success-soft text-success"
                }`}
              >
                {securityNotice.message}
              </p>
            ) : null}

            <SettingsList title="Acțiuni securitate">
              <SettingsActionRow
                title="Schimbă numele"
                description="Actualizează numele afișat pe contul tău."
              >
                <Link
                  href="/settings/schimba-numele"
                  className="group inline-flex"
                >
                  <ActionPill>Schimbă</ActionPill>
                </Link>
              </SettingsActionRow>
              <SettingsActionRow
                title="Schimbă emailul"
                description="Adresa nouă trebuie confirmată printr-un email trimis la ea."
              >
                <Link
                  href="/settings/schimba-email"
                  className="group inline-flex"
                >
                  <ActionPill>Schimbă</ActionPill>
                </Link>
              </SettingsActionRow>
              <SettingsActionRow
                title="Schimbă parola"
                description="Actualizează parola contului și revocă celelalte sesiuni active."
              >
                <Link
                  href="/settings/schimba-parola"
                  className="group inline-flex"
                >
                  <ActionPill>Schimbă</ActionPill>
                </Link>
              </SettingsActionRow>
              <SettingsOptionButton
                title="Șterge contul"
                description="Trimite o solicitare către administratori. Contul nu este șters automat."
                disabled={
                  accountDeletionState === "submitting" ||
                  hasPendingAccountDeletionRequest
                }
                onClick={openAccountDeletionModal}
                tone="danger"
              >
                <ActionPill tone="danger">
                  {accountDeletionState === "submitting"
                    ? "Se trimite"
                    : hasPendingAccountDeletionRequest
                      ? "Solicitat"
                      : "Solicită"}
                </ActionPill>
              </SettingsOptionButton>
            </SettingsList>
          </div>
        );

      case "privacy":
        return (
          <div className="space-y-5">
            <SettingsList title="Date și confidențialitate">
              <SettingsActionRow
                title="Descarcă datele contului"
                description="Include profilul, preferințele, proiectele, materialele și flashcard-urile contului tău, într-un document PDF."
              >
                <a
                  href={dataExportHref()}
                  className="w-fit rounded-full border border-action px-4 py-2 text-xs font-bold transition hover:bg-action hover:text-on-action"
                >
                  Descarcă datele
                </a>
              </SettingsActionRow>

              <SettingsOptionButton
                title="Șterge materialele încărcate"
                description="Elimină fișierele sursă asociate tuturor proiectelor tale. Quiz-urile, rezumatele și flashcard-urile rămân neatinse."
                disabled={privacyActionState !== "idle"}
                onClick={() => setPrivacyWipeConfirm("materials")}
              >
                <ActionPill tone="danger">
                  {privacyActionState === "materials" ? "Se șterge" : "Șterge"}
                </ActionPill>
              </SettingsOptionButton>

              <SettingsOptionButton
                title="Șterge flashcard-urile"
                description="Elimină cardurile generate automat din toate proiectele tale."
                disabled={privacyActionState !== "idle"}
                onClick={() => setPrivacyWipeConfirm("flashcards")}
              >
                <ActionPill tone="danger">
                  {privacyActionState === "flashcards" ? "Se șterge" : "Șterge"}
                </ActionPill>
              </SettingsOptionButton>

              <SettingsOptionButton
                title="Retrage consimțământul newsletter"
                description="Oprește comunicările comerciale prin e-mail."
                disabled={privacyActionState !== "idle"}
                onClick={() => void withdrawNewsletter()}
              >
                <ActionPill>
                  {privacyActionState === "newsletter" ? "Se retrage" : "Retrage"}
                </ActionPill>
              </SettingsOptionButton>

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
                  className="group inline-flex w-fit items-center gap-2 rounded-full border border-action px-4 py-2 text-xs font-bold transition hover:bg-action hover:text-on-action"
                >
                  Vezi arhiva
                  <span className="rounded-full border border-subtle bg-surface px-2 py-0.5 text-[10px] text-content transition">
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

            {privacyWipeConfirm ? (
              <PrivacyWipeConfirmModal
                target={privacyWipeConfirm}
                isProcessing={privacyActionState === privacyWipeConfirm}
                onCancel={() => setPrivacyWipeConfirm(null)}
                onConfirm={() => void confirmPrivacyWipe(privacyWipeConfirm)}
              />
            ) : null}
          </div>
        );
    }
  }

  return (
    <AccountStaticShell
      activePage="settings"
      settingsSection={activeTab}
      onSettingsSectionChange={selectSettingsTab}
    >
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

        {isAccountDeletionModalOpen ? (
          <AccountDeletionRequestModal
            isSubmitting={accountDeletionState === "submitting"}
            onCancel={() => setIsAccountDeletionModalOpen(false)}
            onConfirm={() => void submitAccountDeletionRequest()}
          />
        ) : null}
      </section>
    </AccountStaticShell>
  );
}

function AccountDeletionRequestModal({
  isSubmitting,
  onCancel,
  onConfirm,
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-content/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-deletion-request-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-danger-border bg-surface p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-danger">
          Solicitare ștergere
        </p>
        <h2
          id="account-deletion-request-title"
          className="mt-3 font-serif text-3xl font-semibold leading-tight text-content"
        >
          Trimiți solicitarea de ștergere a contului?
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Contul nu va fi șters automat. Un administrator va vedea solicitarea
          în zona de admin și va procesa acțiunea manual.
        </p>
        <div className="mt-5 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
          După trimitere, nu vei putea crea o altă solicitare cât timp aceasta
          este în așteptare.
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full border border-subtle px-5 py-3 text-sm font-bold transition hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="rounded-full bg-danger px-5 py-3 text-sm font-bold text-on-action transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? "Se trimite..." : "Trimite solicitarea"}
          </button>
        </div>
      </div>
    </div>
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

function PrivacyWipeConfirmModal({
  target,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  target: "materials" | "flashcards";
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy =
    target === "materials"
      ? {
          title: "Ștergi toate materialele încărcate?",
          description:
            "Fișierele sursă din toate proiectele tale vor fi eliminate definitiv. Quiz-urile, rezumatele și flashcard-urile deja generate rămân neatinse.",
          confirmLabel: "Șterge materialele",
        }
      : {
          title: "Ștergi toate flashcard-urile?",
          description:
            "Cardurile generate din toate proiectele tale vor fi eliminate definitiv.",
          confirmLabel: "Șterge flashcard-urile",
        };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-content/40 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-wipe-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-subtle bg-surface p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-danger">
          Ștergere definitivă
        </p>
        <h2
          id="privacy-wipe-title"
          className="mt-3 font-serif text-3xl font-semibold leading-tight"
        >
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">{copy.description}</p>
        <div className="mt-5 rounded-xl border border-warning-border bg-warning-soft px-4 py-3 text-sm font-semibold leading-6 text-warning">
          Această acțiune este permanentă și nu poate fi anulată.
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="rounded-full border border-subtle px-5 py-3 text-sm font-bold transition hover:bg-surface-hover disabled:cursor-wait disabled:opacity-60"
          >
            Renunță
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="rounded-full bg-danger px-5 py-3 text-sm font-bold text-on-action transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          >
            {isProcessing ? "Se șterge..." : copy.confirmLabel}
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
        <span className="rounded-full border border-subtle bg-surface px-3 py-1.5 text-xs font-black text-content transition group-hover:border-content">
          Modifică
        </span>
      </span>
    </label>
  );
}
