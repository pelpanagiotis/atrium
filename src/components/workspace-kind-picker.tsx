"use client";

import { Briefcase, Check, ChevronDown, Home } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    value: "work" as const,
    label: "Work",
    description: "Shared team projects and sync",
    icon: Briefcase,
  },
  {
    value: "personal" as const,
    label: "Personal",
    description: "Private notes and solo work",
    icon: Home,
  },
];

export function WorkspaceKindPicker({
  id,
  name = "kind",
  defaultValue = "work",
  label = "Context",
}: {
  id: string;
  name?: string;
  defaultValue?: "work" | "personal";
  label?: string;
}) {
  const [value, setValue] = useState<"work" | "personal">(defaultValue);
  const selected = OPTIONS.find((option) => option.value === value) ?? OPTIONS[0]!;
  const SelectedIcon = selected.icon;

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium" id={`${id}-label`}>
        {label}
      </p>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-label="Workspace type"
          className={cn(
            "inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm outline-none",
            "transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <SelectedIcon className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">{selected.label}</span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value}
                className="items-start gap-3 py-2.5"
                onSelect={() => setValue(option.value)}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border",
                    active ? "border-foreground/20 bg-accent" : "bg-background",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{option.label}</span>
                  <span className="block text-xs text-muted">{option.description}</span>
                </span>
                {active ? <Check className="mt-1 size-4 shrink-0" aria-hidden="true" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
