"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  Columns3,
  FolderKanban,
  ListTodo,
  Plug,
  RefreshCw,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ICONS = {
  ListTodo,
  Columns3,
  CalendarRange,
  FolderKanban,
  Plug,
  RefreshCw,
} as const;

export type HomeActionIcon = keyof typeof ICONS;

export type HomeActionItem = {
  href: string;
  label: string;
  icon: HomeActionIcon;
};

export function HomeActionsMenu({ items }: { items: HomeActionItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function choose(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        aria-label="Workspace actions"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-2.5 text-sm outline-none transition",
          "hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring",
          open && "border-foreground/25 bg-accent",
        )}
      >
        <Zap className="size-3.5 text-muted" aria-hidden="true" />
        <span className="text-sm text-muted">Actions</span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" sideOffset={6} className="w-56 p-1">
        <div role="menu" aria-label="Workspace actions" className="grid gap-0.5">
          {items.map((item) => {
            const Icon: LucideIcon = ICONS[item.icon];
            return (
              <button
                key={item.href}
                type="button"
                role="menuitem"
                onClick={() => choose(item.href)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground transition hover:bg-accent/50"
              >
                <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
