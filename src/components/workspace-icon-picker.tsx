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
      <Button
        type="button"
        variant="outline"
        id={id}
        aria-labelledby={`${id}-label`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-11 gap-2 px-3"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-lg" aria-hidden="true">
          {selected}
        </span>
        Choose icon
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(100%-2rem,36rem)] max-h-[min(90dvh,32rem)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 pr-12">
            <DialogTitle className="text-2xl md:text-3xl">Choose icon</DialogTitle>
            <DialogDescription className="max-w-2xl">
              Pick an icon that will show in the sidebar and workspace switcher.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto p-6">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-6" role="listbox" aria-label="Workspace icons">
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
                      "group flex aspect-square items-center justify-center rounded-2xl border bg-background text-2xl transition",
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
