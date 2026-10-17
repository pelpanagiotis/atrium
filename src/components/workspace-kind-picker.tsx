"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { WorkspaceContextDef } from "@/lib/workspace-contexts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function WorkspaceKindPicker({
  id,
  name = "kind",
  contexts,
  defaultValue,
  label = "Context",
}: {
  id: string;
  name?: string;
  contexts: WorkspaceContextDef[];
  defaultValue?: string;
  label?: string;
}) {
  const initial =
    contexts.find((context) => context.slug === defaultValue)?.slug ??
    contexts.find((context) => context.slug === "work")?.slug ??
    contexts[0]?.slug ??
    "work";
  const [value, setValue] = useState(initial);
  const selected = contexts.find((context) => context.slug === value) ?? contexts[0];

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
          aria-label="Workspace context"
          className={cn(
            "inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm outline-none",
            "transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <span aria-hidden="true" className="shrink-0 text-base leading-none">
            {selected?.icon ?? "🗂️"}
          </span>
          <span className="min-w-0 flex-1 truncate">{selected?.label ?? "Context"}</span>
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56">
          {contexts.map((context) => {
            const active = context.slug === value;
            return (
              <DropdownMenuItem
                key={context.id}
                className="items-start gap-3 py-2.5"
                onSelect={() => setValue(context.slug)}
              >
                <span
                  className={cn(
                    "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md border text-base",
                    active ? "border-foreground/20 bg-accent" : "bg-background",
                  )}
                  aria-hidden="true"
                >
                  {context.icon ?? "🗂️"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{context.label}</span>
                  <span className="block text-xs text-muted capitalize">{context.slug}</span>
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
