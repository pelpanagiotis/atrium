import Link from "next/link";
import { Layers } from "lucide-react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { cn } from "@/lib/utils";

export function homeHref(source?: string): string {
  if (!source) return "/home";
  return `/home?source=${encodeURIComponent(source)}`;
}

export function HomeSourceFilter({
  source,
  sources,
}: {
  source: string;
  sources: Array<{ provider: string; display_name: string }>;
}) {
  const options = [
    { value: "", label: "All sources", provider: null as string | null },
    { value: "atrium", label: "Atrium", provider: "native" },
    ...sources.map((row) => ({
      value: row.provider,
      label: providerLabel(row.provider),
      provider: row.provider,
    })),
  ];

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Show data from</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter dashboard by integration">
        {options.map((option) => {
          const active = source === option.value || (!source && option.value === "");
          return (
            <Link
              key={option.value || "all"}
              href={homeHref(option.value || undefined)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-sm transition",
                active
                  ? "border-foreground/25 bg-accent text-foreground"
                  : "border-border bg-card text-muted hover:bg-accent/40 hover:text-foreground",
              )}
            >
              {option.provider ? (
                <ProviderIcon provider={option.provider} />
              ) : (
                <Layers className="size-3.5" aria-hidden="true" />
              )}
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
