"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateWorkspaceKindAction } from "@/app/actions";
import type { WorkspaceContextDef } from "@/lib/workspace-contexts";
import { contextLabel } from "@/lib/workspace-contexts";
import { MenuSelect } from "@/components/ui/menu-select";

export function WorkspaceContextControl({
  workspaceId,
  kind,
  contexts,
  canEdit,
}: {
  workspaceId: string;
  kind: string;
  contexts: WorkspaceContextDef[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const label = contextLabel(contexts, kind);

  if (!canEdit) {
    return <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>;
  }

  const options = contexts.map((context) => ({
    value: context.slug,
    label: context.label,
    description: context.slug,
    icon: (
      <span aria-hidden="true" className="text-sm leading-none">
        {context.icon ?? "🗂️"}
      </span>
    ),
  }));

  return (
    <MenuSelect
      value={kind}
      options={options}
      aria-label="Workspace context"
      disabled={pending}
      className="w-auto"
      triggerClassName="h-7 gap-1.5 rounded-md border-transparent bg-transparent px-1.5 text-xs font-medium uppercase tracking-[0.16em] text-muted hover:border-border hover:bg-accent hover:text-foreground"
      onValueChange={(next) => {
        if (next === kind) return;
        startTransition(async () => {
          const formData = new FormData();
          formData.set("workspaceId", workspaceId);
          formData.set("kind", next);
          await updateWorkspaceKindAction(formData);
          router.refresh();
        });
      }}
    />
  );
}
