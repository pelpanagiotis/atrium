"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, Moon, Sun } from "lucide-react";
import { themeAction } from "@/app/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: "light" as const,
    label: "Light",
    description: "Cream surfaces and dark text",
    icon: Sun,
  },
  {
    value: "dark" as const,
    label: "Dark",
    description: "Low-light sidebar and cards",
    icon: Moon,
  },
];

export function ThemeSettings({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTheme(next: "light" | "dark") {
    if (next === theme || pending) return;
    const formData = new FormData();
    formData.set("theme", next);
    startTransition(async () => {
      await themeAction(formData);
      router.refresh();
    });
  }

  return (
    <section className="max-w-xl rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-xl">Color theme</h2>
        <p className="mt-1 text-sm text-muted">Choose how Atrium looks. Changes apply immediately.</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Color theme">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending}
              onClick={() => setTheme(option.value)}
              className={cn(
                "relative flex flex-col items-start gap-3 rounded-lg border p-4 text-left transition",
                "hover:border-foreground/25 hover:bg-accent/40",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:opacity-60",
                active ? "border-foreground/30 bg-accent/50" : "border-border bg-background",
              )}
            >
              <span className="inline-flex size-9 items-center justify-center rounded-md border bg-card">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-2 font-medium">
                  {option.label}
                  {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1 h-10 w-full overflow-hidden rounded-md border",
                  option.value === "light" ? "bg-[#f4efe6]" : "bg-[#141210]",
                )}
              >
                <span
                  className={cn(
                    "m-1.5 block h-2 w-1/3 rounded-sm",
                    option.value === "light" ? "bg-[#1c1915]/80" : "bg-[#f6f1e8]/70",
                  )}
                />
                <span
                  className={cn(
                    "mx-1.5 mt-1 block h-4 rounded-sm",
                    option.value === "light" ? "bg-[#fffdf8]" : "bg-[#1e1b17]",
                  )}
                />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
