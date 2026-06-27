"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  type ColorSchemeId,
  type ThemeColorKey,
  type ThemeColorMap,
  defaultColorSchemeId,
  getColorThemePreset,
  isColorSchemeId,
  themeColorVariables,
} from "@/lib/theme-colors";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  colorScheme: ColorSchemeId;
  customColors: Partial<ThemeColorMap>;
  setTheme: (theme: ThemePreference) => void;
  setColorScheme: (scheme: ColorSchemeId) => void;
  setCustomColor: (key: ThemeColorKey, value: string) => void;
  resetCustomColors: () => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "revizzio-theme";
const COLOR_SCHEME_STORAGE_KEY = "revizzio-color-scheme";
const CUSTOM_COLORS_STORAGE_KEY = "revizzio-custom-colors";
const THEME_EVENT = "revizzio-theme-change";
const SNAPSHOT_SEPARATOR = "|";
const ThemeContext = createContext<ThemeContextValue | null>(null);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function isThemePreference(
  value: string | null | undefined,
): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getStoredPreference(): ThemePreference {
  try {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    return isThemePreference(storedTheme) ? storedTheme : "system";
  } catch {
    return "system";
  }
}

function getStoredColorScheme(): ColorSchemeId {
  try {
    const storedScheme = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
    return isColorSchemeId(storedScheme) ? storedScheme : defaultColorSchemeId;
  } catch {
    return defaultColorSchemeId;
  }
}

function getStoredCustomColors(): Partial<ThemeColorMap> {
  try {
    const storedColors = window.localStorage.getItem(CUSTOM_COLORS_STORAGE_KEY);

    if (!storedColors) {
      return {};
    }

    const parsedColors = JSON.parse(storedColors) as Record<string, unknown>;
    return themeColorVariables.reduce<Partial<ThemeColorMap>>(
      (colors, variable) => {
        const value = parsedColors[variable.key];

        if (typeof value === "string" && HEX_COLOR_PATTERN.test(value)) {
          colors[variable.key] = value;
        }

        return colors;
      },
      {},
    );
  } catch {
    return {};
  }
}

function getPreference(): ThemePreference {
  const domPreference = document.documentElement.dataset.themePreference;
  return isThemePreference(domPreference)
    ? domPreference
    : getStoredPreference();
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") {
    return preference;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(preference: ThemePreference) {
  const resolvedTheme = resolveTheme(preference);
  const root = document.documentElement;
  const colorScheme = getStoredColorScheme();
  const customColors = getStoredCustomColors();
  const presetColors = getColorThemePreset(colorScheme).colors[resolvedTheme];

  root.dataset.theme = resolvedTheme;
  root.dataset.themePreference = preference;
  root.dataset.colorScheme = colorScheme;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;

  themeColorVariables.forEach((variable) => {
    root.style.setProperty(
      variable.cssVar,
      customColors[variable.key] ?? presetColors[variable.key],
    );
  });

  const favicon = document.querySelector<HTMLLinkElement>(
    "link[data-revizzio-favicon]",
  );

  if (favicon) {
    favicon.href =
      resolvedTheme === "dark"
        ? "/assets/logos/revizzio-favicon-light.svg"
        : "/assets/logos/revizzio-favicon-dark.svg";
  }
}

function setThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The current page can still switch theme without persistent storage.
  }

  applyTheme(preference);
  window.dispatchEvent(new Event(THEME_EVENT));
}

function setColorSchemePreference(scheme: ColorSchemeId) {
  try {
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, scheme);
  } catch {
    // The current page can still switch color scheme without storage.
  }

  applyTheme(getPreference());
  window.dispatchEvent(new Event(THEME_EVENT));
}

function setCustomColorValue(key: ThemeColorKey, value: string) {
  if (!HEX_COLOR_PATTERN.test(value)) {
    return;
  }

  try {
    const nextColors = {
      ...getStoredCustomColors(),
      [key]: value,
    };
    window.localStorage.setItem(
      CUSTOM_COLORS_STORAGE_KEY,
      JSON.stringify(nextColors),
    );
  } catch {
    // Inline CSS variables will still update via applyTheme when possible.
  }

  applyTheme(getPreference());
  window.dispatchEvent(new Event(THEME_EVENT));
}

function resetCustomColorValues() {
  try {
    window.localStorage.removeItem(CUSTOM_COLORS_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the UI can still continue.
  }

  applyTheme(getPreference());
  window.dispatchEvent(new Event(THEME_EVENT));
}

function getSnapshot(): string {
  const preference = getPreference();
  const colorScheme = getStoredColorScheme();
  const customColors = getStoredCustomColors();
  const domTheme = document.documentElement.dataset.theme;
  const resolvedTheme =
    domTheme === "light" || domTheme === "dark"
      ? domTheme
      : resolveTheme(preference);

  return [
    preference,
    resolvedTheme,
    colorScheme,
    JSON.stringify(customColors),
  ].join(SNAPSHOT_SEPARATOR);
}

function getServerSnapshot(): string {
  return ["system", "light", defaultColorSchemeId, "{}"].join(
    SNAPSHOT_SEPARATOR,
  );
}

function subscribe(callback: () => void) {
  applyTheme(getStoredPreference());

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleThemeChange = () => callback();
  const handleSystemChange = () => {
    if (getPreference() === "system") {
      applyTheme("system");
      callback();
    }
  };
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key !== STORAGE_KEY &&
      event.key !== COLOR_SCHEME_STORAGE_KEY &&
      event.key !== CUSTOM_COLORS_STORAGE_KEY
    ) {
      return;
    }

    applyTheme(getStoredPreference());
    callback();
  };

  window.addEventListener(THEME_EVENT, handleThemeChange);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleSystemChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleThemeChange);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleSystemChange);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [preference, resolvedTheme, colorScheme, customColorsSnapshot] =
    snapshot.split(SNAPSHOT_SEPARATOR) as [
    ThemePreference,
    ResolvedTheme,
    ColorSchemeId,
    string,
  ];
  const customColors = useMemo(() => {
    try {
      return JSON.parse(customColorsSnapshot) as Partial<ThemeColorMap>;
    } catch {
      return {};
    }
  }, [customColorsSnapshot]);

  const setTheme = useCallback((theme: ThemePreference) => {
    setThemePreference(theme);
  }, []);

  const setColorScheme = useCallback((scheme: ColorSchemeId) => {
    setColorSchemePreference(scheme);
  }, []);

  const setCustomColor = useCallback((key: ThemeColorKey, value: string) => {
    setCustomColorValue(key, value);
  }, []);

  const resetCustomColors = useCallback(() => {
    resetCustomColorValues();
  }, []);

  const toggleTheme = useCallback(() => {
    setThemePreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      colorScheme,
      customColors,
      setTheme,
      setColorScheme,
      setCustomColor,
      resetCustomColors,
      toggleTheme,
    }),
    [
      preference,
      resolvedTheme,
      colorScheme,
      customColors,
      setTheme,
      setColorScheme,
      setCustomColor,
      resetCustomColors,
      toggleTheme,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme trebuie folosit in interiorul ThemeProvider.");
  }

  return context;
}
