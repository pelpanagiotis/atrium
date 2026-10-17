import type { ColorPaletteId, ThemeMode } from "@/lib/theme";

/** Apply appearance tokens on the document immediately (soft navigations may not re-render <html>). */
export function applyDocumentTheme(theme: ThemeMode, palette: ColorPaletteId): void {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.classList.toggle("dark", theme === "dark");
}

export function applyDocumentMotion(enabled: boolean): void {
  document.documentElement.dataset.motion = enabled ? "on" : "off";
}

export function parseMotionEnabled(value: string | undefined | null): boolean {
  return value !== "off" && value !== "false" && value !== "0";
}
