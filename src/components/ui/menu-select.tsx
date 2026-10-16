"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type MenuSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  description?: string;
};

export function MenuSelect({
  name,
  options,
  defaultValue,
  value: controlledValue,
  onValueChange,
  id,
  form,
  required,
  disabled,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
  placeholder = "Select…",
}: {
  name?: string;
  options: MenuSelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  form?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  "aria-label"?: string;
  placeholder?: string;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hiddenRef = useRef<HTMLInputElement>(null);
  const isControlled = controlledValue !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = isControlled ? controlledValue : uncontrolled;
  const selected = options.find((option) => option.value === value);

  function setValue(next: string) {
    if (!isControlled) setUncontrolled(next);
    // Keep form payloads in sync even before React re-renders (e.g. auto-submit).
    if (hiddenRef.current) hiddenRef.current.value = next;
    onValueChange?.(next);
  }

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input
          ref={hiddenRef}
          type="hidden"
          name={name}
          form={form}
          value={value}
          required={required}
          disabled={disabled}
          readOnly
        />
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          id={controlId}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            "inline-flex h-10 w-full items-center gap-2 rounded-md border border-border bg-card px-3 text-left text-sm outline-none",
            "transition hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:pointer-events-none disabled:opacity-50",
            triggerClassName,
          )}
        >
          {selected?.icon ? (
            <span className="inline-flex shrink-0 items-center justify-center">{selected.icon}</span>
          ) : null}
          <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-70" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-48">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <DropdownMenuItem
                key={option.value || "__empty"}
                className={option.description ? "items-start gap-2 py-2.5" : "gap-2"}
                onSelect={() => setValue(option.value)}
              >
                {option.icon ? (
                  <span className="inline-flex shrink-0 items-center justify-center">{option.icon}</span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description ? (
                    <span className="block text-xs text-muted">{option.description}</span>
                  ) : null}
                </span>
                {active ? <Check className="size-4 shrink-0" aria-hidden="true" /> : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
