import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CookieConsentProvider } from "@/components/legal/cookie-consent";
import { ThemeProvider } from "@/components/theme-provider";
import {
  colorThemePresets,
  defaultColorSchemeId,
  themeColorVariables,
} from "@/lib/theme-colors";
import "./globals.css";

const themeScript = `
(() => {
  try {
    const presets = ${JSON.stringify(colorThemePresets)};
    const variables = ${JSON.stringify(
      themeColorVariables.map((variable) => ({
        key: variable.key,
        cssVar: variable.cssVar,
      })),
    )};
    const stored = localStorage.getItem("revizzio-theme");
    const preference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    const isDark =
      preference === "dark" ||
      (preference === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const root = document.documentElement;
    const storedColorScheme = localStorage.getItem("revizzio-color-scheme");
    const colorScheme = presets.some((preset) => preset.id === storedColorScheme)
      ? storedColorScheme
      : "${defaultColorSchemeId}";
    const preset =
      presets.find((currentPreset) => currentPreset.id === colorScheme) ||
      presets[0];
    let customColors = {};

    try {
      customColors = JSON.parse(
        localStorage.getItem("revizzio-custom-colors") || "{}",
      );
    } catch {
      customColors = {};
    }

    root.dataset.theme = isDark ? "dark" : "light";
    root.dataset.themePreference = preference;
    root.dataset.colorScheme = colorScheme;
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    const favicon = document.querySelector('link[data-revizzio-favicon]');
    if (favicon) {
      favicon.setAttribute(
        "href",
        isDark
          ? "/assets/logos/revizzio-favicon-light.svg"
          : "/assets/logos/revizzio-favicon-dark.svg",
      );
    }

    const colors = {
      ...preset.colors[isDark ? "dark" : "light"],
      ...customColors,
    };

    variables.forEach((variable) => {
      if (typeof colors[variable.key] === "string") {
        root.style.setProperty(variable.cssVar, colors[variable.key]);
      }
    });
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: "Revizzio",
  description: "Aplicatie educationala de quiz-uri.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ro"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <link
          data-revizzio-favicon
          rel="icon"
          href="/assets/logos/revizzio-favicon-dark.svg"
          type="image/svg+xml"
        />
        <link
          rel="icon"
          href="/assets/logos/revizzio-favicon-dark.svg"
          type="image/svg+xml"
          media="(prefers-color-scheme: light)"
        />
        <link
          rel="icon"
          href="/assets/logos/revizzio-favicon-light.svg"
          type="image/svg+xml"
          media="(prefers-color-scheme: dark)"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          <CookieConsentProvider>
            <AuthProvider>{children}</AuthProvider>
          </CookieConsentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
