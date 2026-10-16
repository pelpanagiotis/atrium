"use client";

import { useState } from "react";
import { WORKSPACE_ICONS, workspaceIconOrFallback } from "@/lib/workspace-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-labelledby={`${id}-label`}
            className="h-11 gap-2 px-3"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-lg" aria-hidden="true">
              {selected}
            </span>
            Choose icon
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[min(100%-2rem,28rem)]">
          <DialogHeader>
            <DialogTitle>Choose workspace icon</DialogTitle>
            <DialogDescription>Pick an icon that will show in the sidebar and workspace switcher.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="listbox" aria-label="Workspace icons">
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
                    "inline-flex size-12 items-center justify-center rounded-lg border bg-card text-xl transition hover:border-foreground/20 hover:bg-accent/50",
                    active && "border-primary bg-accent ring-2 ring-ring",
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
        </DialogContent>
      </Dialog>
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
