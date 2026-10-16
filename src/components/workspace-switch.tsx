"use client";

import { useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { switchWorkspaceAction } from "@/app/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { workspaceIconOrFallback } from "@/lib/workspace-icons";
import { cn } from "@/lib/utils";

type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
  kind: "personal" | "work";
  icon?: string | null;
};

export function WorkspaceSwitch({
  currentId,
  workspaces,
}: {
  currentId: string;
  workspaces: WorkspaceOption[];
}) {
  const [pending, startTransition] = useTransition();
  const current = workspaces.find((workspace) => workspace.id === currentId) ?? workspaces[0];
  if (!current) return null;

  const personal = workspaces.filter((workspace) => workspace.kind === "personal");
  const work = workspaces.filter((workspace) => workspace.kind === "work");

  function selectWorkspace(workspaceId: string) {
    if (workspaceId === currentId || pending) return;
    const formData = new FormData();
    formData.set("workspaceId", workspaceId);
    startTransition(() => {
      void switchWorkspaceAction(formData);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id="workspace-switch"
        disabled={pending}
        className={cn(
          "inline-flex h-9 max-w-[min(100vw-12rem,20rem)] items-center gap-2 rounded-md border bg-card px-2.5 text-left text-sm outline-none",
          "hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
        )}
        aria-label={`Workspace: ${current.name}`}
      >
        <span aria-hidden="true" className="shrink-0 text-base leading-none">
          {workspaceIconOrFallback(current.icon, current.kind)}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{current.name}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(100vw-2rem,22rem)]">
        {personal.length > 0 ? (
          <>
            <DropdownMenuLabel>Personal</DropdownMenuLabel>
            {personal.map((workspace) => (
              <WorkspaceMenuItem
                key={workspace.id}
                workspace={workspace}
                selected={workspace.id === currentId}
                onSelect={selectWorkspace}
              />
            ))}
          </>
        ) : null}
        {personal.length > 0 && work.length > 0 ? <DropdownMenuSeparator /> : null}
        {work.length > 0 ? (
          <>
            <DropdownMenuLabel>Work</DropdownMenuLabel>
            {work.map((workspace) => (
              <WorkspaceMenuItem
                key={workspace.id}
                workspace={workspace}
                selected={workspace.id === currentId}
                onSelect={selectWorkspace}
              />
            ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceMenuItem({
  workspace,
  selected,
  onSelect,
}: {
  workspace: WorkspaceOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={() => onSelect(workspace.id)}
      className={cn(selected && "bg-accent/70")}
    >
      <span aria-hidden="true" className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-base">
        {workspaceIconOrFallback(workspace.icon, workspace.kind)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{workspace.name}</span>
        <span className="block truncate text-xs text-muted capitalize">{workspace.role}</span>
      </span>
      {selected ? <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" /> : null}
    </DropdownMenuItem>
  );
}
