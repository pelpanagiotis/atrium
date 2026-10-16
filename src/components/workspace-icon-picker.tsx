"use client";

import { WORKSPACE_ICONS, workspaceIconOrFallback } from "@/lib/workspace-icons";
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
  const selected = defaultValue && (WORKSPACE_ICONS as readonly string[]).includes(defaultValue)
    ? defaultValue
    : WORKSPACE_ICONS[0];
  return (
    <fieldset>
      <legend className="text-sm font-medium">Icon</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {WORKSPACE_ICONS.map((icon) => (
          <label
            key={icon}
            className={cn(
              "inline-flex size-10 cursor-pointer items-center justify-center rounded-lg border bg-card text-lg transition hover:border-foreground/20 hover:bg-accent/50 has-[:checked]:border-foreground/40 has-[:checked]:bg-accent has-[:checked]:ring-2 has-[:checked]:ring-ring",
            )}
          >
            <input
              type="radio"
              id={`${id}-${icon}`}
              name={name}
              value={icon}
              defaultChecked={icon === selected}
              className="sr-only"
            />
            <span aria-hidden="true">{icon}</span>
            <span className="sr-only">Workspace icon {icon}</span>
          </label>
        ))}
      </div>
    </fieldset>
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
