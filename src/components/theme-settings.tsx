"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { paletteAction, themeAction } from "@/app/actions";
import { COLOR_PALETTES, type ColorPaletteId, type ThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const MODE_OPTIONS = [
  {
    value: "light" as const,
    label: "Light",
    description: "Bright surfaces and dark text",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Dark",
    description: "Low-light sidebar and cards",
    icon: Moon,
  },
];

export function ThemeSettings({
  theme,
  palette,
}: {
  theme: ThemeMode;
  palette: ColorPaletteId;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTheme(next: ThemeMode) {
    if (next === theme || pending) return;
    const formData = new FormData();
    formData.set("theme", next);
    startTransition(async () => {
      await themeAction(formData);
      router.refresh();
    });
  }

  function setPalette(next: ColorPaletteId) {
    if (next === palette || pending) return;
    const formData = new FormData();
    formData.set("palette", next);
    startTransition(async () => {
      await paletteAction(formData);
      router.refresh();
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4 md:p-5">
      <div>
        <h2 className="text-xl">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Pick a color palette and light or dark mode. Changes apply immediately.</p>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-medium">Color palette</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" role="radiogroup" aria-label="Color palette">
          {COLOR_PALETTES.map((option) => {
            const active = palette === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => setPalette(option.id)}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-3 text-left transition",
                  "hover:border-foreground/25 hover:bg-accent/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-60",
                  active ? "border-foreground/30 bg-accent/50" : "border-border bg-background",
                )}
              >
                <span className="flex h-12 overflow-hidden rounded-md border" aria-hidden="true">
                  <span className="w-1/4" style={{ background: option.swatches.sidebar }} />
                  <span className="flex flex-1 flex-col">
                    <span className="flex-1" style={{ background: option.swatches.light }} />
                    <span className="h-3" style={{ background: option.swatches.primary }} />
                    <span className="flex-1" style={{ background: option.swatches.dark }} />
                  </span>
                </span>
                <span>
                  <span className="flex items-center gap-2 font-medium">
                    {option.label}
                    {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-medium">Mode</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Color mode">
          {MODE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            const swatch = COLOR_PALETTES.find((item) => item.id === palette)?.swatches;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={pending}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "relative flex items-start gap-3 rounded-lg border p-4 text-left transition",
                  "hover:border-foreground/25 hover:bg-accent/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:opacity-60",
                  active ? "border-foreground/30 bg-accent/50" : "border-border bg-background",
                )}
              >
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border bg-card">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-medium">
                    {option.label}
                    {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                  <span
                    aria-hidden="true"
                    className="mt-3 flex h-10 overflow-hidden rounded-md border"
                    style={{
                      background: option.value === "light" ? swatch?.light : swatch?.dark,
                    }}
                  >
                    <span className="w-1/5" style={{ background: swatch?.sidebar }} />
                    <span className="m-2 h-2 w-1/3 rounded-sm" style={{ background: swatch?.primary }} />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
