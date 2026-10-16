"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowRight,
  CheckSquare,
  FolderPlus,
  Plug,
  Plus,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type CreateOption = {
  href: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
};

const OPTIONS: CreateOption[] = [
  {
    href: "/tasks",
    title: "New task",
    description: "Add work to a project",
    detail: "Create a task in this workspace. Native projects accept full edits; provider projects only expose supported fields.",
    icon: CheckSquare,
  },
  {
    href: "/projects",
    title: "New project",
    description: "Start a native project",
    detail: "Native projects are owned in Atrium. You can link a Linear, Jira, GitHub, or GitLab board later from Integrations.",
    icon: FolderPlus,
  },
  {
    href: "/integrations",
    title: "Connect provider",
    description: "Sync an external tracker",
    detail: "Connect Linear, Jira, GitHub, or GitLab with a token or OAuth. Credentials stay encrypted on the server.",
    icon: Plug,
  },
];

export function CreateMenu() {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openHoverMenu() {
    if (modalOpen) return;
    clearCloseTimer();
    setHoverOpen(true);
  }

  function scheduleCloseHoverMenu() {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setHoverOpen(false), 160);
  }

  function openModal() {
    clearCloseTimer();
    setHoverOpen(false);
    setModalOpen(true);
  }

  return (
    <>
      <DropdownMenu
        open={hoverOpen && !modalOpen}
        onOpenChange={(open) => {
          if (!open) setHoverOpen(false);
        }}
      >
        <DropdownMenuTrigger
          aria-label="Create"
          title="Create"
          onMouseEnter={openHoverMenu}
          onMouseLeave={scheduleCloseHoverMenu}
          onPointerDown={(event) => event.preventDefault()}
          onClick={openModal}
          className="inline-flex size-9 items-center justify-center rounded-md border bg-card text-foreground transition hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onMouseEnter={openHoverMenu}
          onMouseLeave={scheduleCloseHoverMenu}
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuLabel>Create</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem key={option.href} asChild>
                <Link href={option.href}>
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span>{option.title}</span>
                    <span className="text-xs font-normal text-muted">{option.description}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              openModal();
            }}
          >
            Browse all options
            <ArrowRight className="ml-auto size-3.5 text-muted" aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[min(100%-2rem,36rem)]">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>
              Choose what to add to this workspace. Hover the + button for a quick list anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Link
                  key={option.href}
                  href={option.href}
                  onClick={() => setModalOpen(false)}
                  className={cn(
                    "group flex items-start gap-3 rounded-xl border bg-background p-4 text-left transition",
                    "hover:border-foreground/20 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-base font-medium">{option.title}</span>
                      <ArrowRight
                        className="size-3.5 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{option.description}</span>
                    <span className="mt-2 block text-xs leading-relaxed text-muted">{option.detail}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
