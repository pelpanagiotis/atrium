import type { ColorPaletteId, ThemeMode } from "@/lib/theme";

/** Apply appearance tokens on the document immediately (soft navigations may not re-render <html>). */
export function applyDocumentTheme(theme: ThemeMode, palette: ColorPaletteId): void {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.classList.toggle("dark", theme === "dark");
}
