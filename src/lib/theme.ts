export const THEME_MODES = ["light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const COLOR_PALETTES = [
  {
    id: "grove",
    label: "Grove",
    description: "Warm cream with forest green",
    swatches: { light: "#f4efe6", primary: "#1f6b4a", sidebar: "#1c1915", dark: "#141210" },
  },
  {
    id: "harbor",
    label: "Harbor",
    description: "Cool mist with deep teal",
    swatches: { light: "#eef3f4", primary: "#0f6e6a", sidebar: "#142022", dark: "#10181a" },
  },
  {
    id: "ember",
    label: "Ember",
    description: "Stone paper with copper accent",
    swatches: { light: "#f3eee8", primary: "#b4532a", sidebar: "#251c18", dark: "#16110f" },
  },
  {
    id: "slate",
    label: "Slate",
    description: "Neutral gray with steel blue",
    swatches: { light: "#f0f2f5", primary: "#3b5bdb", sidebar: "#1b2030", dark: "#12151c" },
  },
  {
    id: "dusk",
    label: "Dusk",
    description: "Soft clay with plum accent",
    swatches: { light: "#f3eef2", primary: "#7a3e6b", sidebar: "#221820", dark: "#151117" },
  },
] as const;

export type ColorPaletteId = (typeof COLOR_PALETTES)[number]["id"];

export const DEFAULT_PALETTE: ColorPaletteId = "grove";

export function parseThemeMode(value: string | null | undefined): ThemeMode {
  return value === "dark" ? "dark" : "light";
}

export function parseColorPalette(value: string | null | undefined): ColorPaletteId {
  return COLOR_PALETTES.some((palette) => palette.id === value)
    ? (value as ColorPaletteId)
    : DEFAULT_PALETTE;
}
