export type ThemeColorKey =
  | "app"
  | "surface"
  | "border"
  | "content"
  | "muted"
  | "hover"
  | "action"
  | "actionHover"
  | "actionSoft"
  | "onAction"
  | "successBg"
  | "successText"
  | "successBorder"
  | "dangerBg"
  | "dangerText"
  | "dangerBorder"
  | "warningBg"
  | "warningText"
  | "warningBorder"
  | "infoBg"
  | "infoText"
  | "infoBorder"
  | "selection"
  | "scrollbar";

export type ThemeColorMap = Record<ThemeColorKey, string>;
export type ColorSchemeId = "classic" | "forest" | "ocean" | "rose" | "graphite";

export type ThemeColorVariable = {
  key: ThemeColorKey;
  label: string;
  description: string;
  cssVar: string;
};

export type ColorThemePreset = {
  id: ColorSchemeId;
  name: string;
  description: string;
  preview: string[];
  colors: {
    light: ThemeColorMap;
    dark: ThemeColorMap;
  };
};

export const defaultColorSchemeId: ColorSchemeId = "classic";

export const themeColorVariables: ThemeColorVariable[] = [
  {
    key: "app",
    label: "Fundal aplicație",
    description: "Zona mare din spatele paginilor.",
    cssVar: "--theme-app",
  },
  {
    key: "surface",
    label: "Carduri",
    description: "Fundalul panourilor și al formularelor.",
    cssVar: "--theme-surface",
  },
  {
    key: "border",
    label: "Contururi",
    description: "Linii, separatoare și margini.",
    cssVar: "--theme-border",
  },
  {
    key: "content",
    label: "Text principal",
    description: "Titluri, iconițe și conținut important.",
    cssVar: "--theme-content",
  },
  {
    key: "muted",
    label: "Text secundar",
    description: "Descrieri, metadate și mesaje auxiliare.",
    cssVar: "--theme-muted",
  },
  {
    key: "action",
    label: "Accent / butoane",
    description: "Acțiuni principale, CTA și elemente active.",
    cssVar: "--theme-action",
  },
  {
    key: "actionSoft",
    label: "Accent discret",
    description: "Badge-uri și fundaluri fine pentru accent.",
    cssVar: "--theme-action-soft",
  },
  {
    key: "successText",
    label: "Succes",
    description: "Mesaje pozitive și indicatori de progres.",
    cssVar: "--theme-success-text",
  },
  {
    key: "warningText",
    label: "Atenționare",
    description: "Semnale pentru recapitulare sau risc.",
    cssVar: "--theme-warning-text",
  },
  {
    key: "infoText",
    label: "Info / AI",
    description: "Chat AI, explicații și elemente informative.",
    cssVar: "--theme-info-text",
  },
];

const classicLight: ThemeColorMap = {
  app: "#faf7f2",
  surface: "#fcfaf7",
  border: "#e6dfd3",
  content: "#2c2621",
  muted: "#6b6259",
  hover: "#f5efe4",
  action: "#3e352f",
  actionHover: "#29221e",
  actionSoft: "#f3ece0",
  onAction: "#faf7f2",
  successBg: "#f1f4ee",
  successText: "#3b4d36",
  successBorder: "#d2ddd0",
  dangerBg: "#faf3f0",
  dangerText: "#733b2b",
  dangerBorder: "#eccec6",
  warningBg: "#faf6ee",
  warningText: "#664e1b",
  warningBorder: "#e9dec7",
  infoBg: "#f1f4f5",
  infoText: "#2e3f47",
  infoBorder: "#d4dee1",
  selection: "#e9dec7",
  scrollbar: "#d5cbb8",
};

const classicDark: ThemeColorMap = {
  app: "#14110f",
  surface: "#1c1815",
  border: "#302823",
  content: "#f3ece0",
  muted: "#a09285",
  hover: "#241e1a",
  action: "#eadbc8",
  actionHover: "#dccbb5",
  actionSoft: "#231e1a",
  onAction: "#14110f",
  successBg: "#1b241a",
  successText: "#afd2a9",
  successBorder: "#2b3b2a",
  dangerBg: "#281a18",
  dangerText: "#e6a79a",
  dangerBorder: "#472b25",
  warningBg: "#282216",
  warningText: "#e9cfa0",
  warningBorder: "#4d3b23",
  infoBg: "#182124",
  infoText: "#a8cad4",
  infoBorder: "#27383e",
  selection: "#4d3b23",
  scrollbar: "#302823",
};

export const colorThemePresets: ColorThemePreset[] = [
  {
    id: "classic",
    name: "Revizzio Classic",
    description: "Paleta caldă actuală, potrivită pentru studiu lung.",
    preview: ["#faf7f2", "#fcfaf7", "#3e352f", "#3b4d36"],
    colors: {
      light: classicLight,
      dark: classicDark,
    },
  },
  {
    id: "forest",
    name: "Forest Notes",
    description: "Verde academic, calm, cu accente de laborator.",
    preview: ["#f4f6ef", "#fbfcf7", "#35513f", "#607a4f"],
    colors: {
      light: {
        ...classicLight,
        app: "#f4f6ef",
        surface: "#fbfcf7",
        border: "#dce5d4",
        content: "#243126",
        muted: "#64705f",
        hover: "#edf2e7",
        action: "#35513f",
        actionHover: "#273d2f",
        actionSoft: "#e4eddb",
        onAction: "#fbfcf7",
        successBg: "#e8f2df",
        successText: "#3d6734",
        successBorder: "#c9ddb8",
        infoBg: "#eef5ee",
        infoText: "#3c5a4b",
        infoBorder: "#cfdfd4",
        selection: "#dbe8cb",
        scrollbar: "#cad9bd",
      },
      dark: {
        ...classicDark,
        app: "#10150f",
        surface: "#171f16",
        border: "#2a3828",
        content: "#edf4e6",
        muted: "#9aaa91",
        hover: "#202b1e",
        action: "#c8dfb4",
        actionHover: "#b6cf9e",
        actionSoft: "#1e2a1d",
        onAction: "#10150f",
        successBg: "#162717",
        successText: "#aed79a",
        successBorder: "#2b4a2b",
        infoBg: "#172420",
        infoText: "#a7d4c1",
        infoBorder: "#27423a",
        selection: "#344d2c",
        scrollbar: "#2f3f2c",
      },
    },
  },
  {
    id: "ocean",
    name: "Ocean Focus",
    description: "Albastru curat pentru dashboard-uri și sesiuni tehnice.",
    preview: ["#f3f7fb", "#fbfdff", "#254c6b", "#2f6475"],
    colors: {
      light: {
        ...classicLight,
        app: "#f3f7fb",
        surface: "#fbfdff",
        border: "#d6e2ea",
        content: "#1f2b33",
        muted: "#5d6972",
        hover: "#eaf2f8",
        action: "#254c6b",
        actionHover: "#19384f",
        actionSoft: "#e3edf5",
        onAction: "#fbfdff",
        successBg: "#eef6f0",
        successText: "#426343",
        successBorder: "#ccdfcf",
        infoBg: "#e9f4f8",
        infoText: "#2f6475",
        infoBorder: "#c8dde6",
        selection: "#cddfed",
        scrollbar: "#bfd0dc",
      },
      dark: {
        ...classicDark,
        app: "#0d1217",
        surface: "#141c23",
        border: "#263744",
        content: "#e8f1f8",
        muted: "#91a3af",
        hover: "#1d2933",
        action: "#b7d9ef",
        actionHover: "#9cc7e2",
        actionSoft: "#172633",
        onAction: "#0d1217",
        infoBg: "#122631",
        infoText: "#9fd4e8",
        infoBorder: "#244759",
        selection: "#28475c",
        scrollbar: "#2a4050",
      },
    },
  },
  {
    id: "rose",
    name: "Rose Paper",
    description: "Crem rozaliu, prietenos pentru notițe și recapitulare.",
    preview: ["#fbf4f2", "#fffafa", "#6d3742", "#895b38"],
    colors: {
      light: {
        ...classicLight,
        app: "#fbf4f2",
        surface: "#fffafa",
        border: "#ead8d3",
        content: "#332426",
        muted: "#725f5d",
        hover: "#f7ebe8",
        action: "#6d3742",
        actionHover: "#512731",
        actionSoft: "#f3e2df",
        onAction: "#fffafa",
        dangerBg: "#faeeee",
        dangerText: "#8a3c3c",
        dangerBorder: "#edc9c9",
        warningBg: "#fbf0e3",
        warningText: "#895b38",
        warningBorder: "#ead4b9",
        infoBg: "#f6f0f4",
        infoText: "#60485b",
        infoBorder: "#dfcedb",
        selection: "#edd3cf",
        scrollbar: "#dbc5bf",
      },
      dark: {
        ...classicDark,
        app: "#160f11",
        surface: "#211719",
        border: "#3a282c",
        content: "#f5e9e5",
        muted: "#ad9692",
        hover: "#2d2023",
        action: "#f0c9cf",
        actionHover: "#dfb3ba",
        actionSoft: "#2b1c20",
        onAction: "#160f11",
        dangerBg: "#2c181b",
        dangerText: "#eba7ad",
        dangerBorder: "#512d33",
        warningBg: "#2b2118",
        warningText: "#e9c49e",
        warningBorder: "#513d27",
        infoBg: "#231c24",
        infoText: "#d7b8cf",
        infoBorder: "#403044",
        selection: "#56323b",
        scrollbar: "#3d2b2f",
      },
    },
  },
  {
    id: "graphite",
    name: "Graphite IDE",
    description: "Neutru, ca un editor de cod, cu contrast mai clar.",
    preview: ["#f5f5f4", "#ffffff", "#262626", "#525252"],
    colors: {
      light: {
        ...classicLight,
        app: "#f5f5f4",
        surface: "#ffffff",
        border: "#deded8",
        content: "#222222",
        muted: "#666666",
        hover: "#eeeeea",
        action: "#262626",
        actionHover: "#111111",
        actionSoft: "#e8e8e4",
        onAction: "#ffffff",
        successBg: "#eff5ef",
        successText: "#3f6240",
        successBorder: "#d1e1d0",
        infoBg: "#eff3f5",
        infoText: "#41515a",
        infoBorder: "#d3dde2",
        selection: "#d8d8d0",
        scrollbar: "#c7c7bf",
      },
      dark: {
        ...classicDark,
        app: "#101010",
        surface: "#181818",
        border: "#303030",
        content: "#eeeeee",
        muted: "#a3a3a3",
        hover: "#242424",
        action: "#f2f2f2",
        actionHover: "#dcdcdc",
        actionSoft: "#242424",
        onAction: "#101010",
        successBg: "#172318",
        successText: "#a7d7a6",
        successBorder: "#2a3f2b",
        warningBg: "#282113",
        warningText: "#e8ca8a",
        warningBorder: "#46391e",
        infoBg: "#162126",
        infoText: "#a5cfdd",
        infoBorder: "#293d45",
        selection: "#3a3a33",
        scrollbar: "#363636",
      },
    },
  },
];

export function isColorSchemeId(
  value: string | null | undefined,
): value is ColorSchemeId {
  return colorThemePresets.some((preset) => preset.id === value);
}

export function getColorThemePreset(id: ColorSchemeId) {
  return (
    colorThemePresets.find((preset) => preset.id === id) ??
    colorThemePresets[0]
  );
}
