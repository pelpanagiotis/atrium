"use client";

import { useState } from "react";
import { WORKSPACE_ICONS, workspaceIconOrFallback } from "@/lib/workspace-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WorkspaceIconPicker({
  name = "icon",
  defaultValue,
  id = "workspace-icon",
}: {
  name?: string;
  defaultValue?: string | null;
  id?: string;
}) {
  const initial =
    defaultValue && (WORKSPACE_ICONS as readonly string[]).includes(defaultValue)
      ? defaultValue
      : WORKSPACE_ICONS[0];
  const [selected, setSelected] = useState(initial ?? "🏠");
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium" id={`${id}-label`}>
        Icon
      </p>
      <input type="hidden" name={name} value={selected} />
      <Button
        type="button"
        variant="outline"
        id={id}
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="h-11 w-full justify-start gap-2 px-3"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-lg" aria-hidden="true">
          {selected}
        </span>
        {open ? "Hide icons" : "Choose icon"}
      </Button>

      {open ? (
        <div
          id={`${id}-panel`}
          className="rounded-lg border bg-background p-3"
          role="listbox"
          aria-label="Workspace icons"
        >
          <p className="mb-3 text-xs text-muted">Pick an icon for the sidebar and workspace switcher.</p>
          <div className="grid max-h-48 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
            {WORKSPACE_ICONS.map((icon) => {
              const active = icon === selected;
              return (
                <button
                  key={icon}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-label={`Workspace icon ${icon}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border bg-card text-2xl transition",
                    "hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active && "border-foreground/25 bg-accent/50 ring-2 ring-ring",
                  )}
                  onClick={() => {
                    setSelected(icon);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden="true">{icon}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function WorkspaceIconBadge({
  icon,
  kind,
  className,
}: {
  icon?: string | null;
  kind: "personal" | "work";
  className?: string;
}) {
  const value = workspaceIconOrFallback(icon, kind);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-base",
        className,
      )}
    >
      {value}
    </span>
  );
}
