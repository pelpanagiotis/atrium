"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { updateWorkspaceAction } from "@/app/actions";
import { WorkspaceIconPicker } from "@/components/workspace-icon-picker";
import { WorkspaceKindPicker } from "@/components/workspace-kind-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import type { WorkspaceContextDef } from "@/lib/workspace-contexts";

export function EditWorkspaceDialog({
  workspace,
  contexts,
}: {
  workspace: {
    id: string;
    name: string;
    kind: string;
    icon?: string | null;
  };
  contexts: WorkspaceContextDef[];
}) {
  const [open, setOpen] = useState(false);
  const formId = `edit-workspace-${workspace.id}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Edit ${workspace.name}`}
          title="Edit workspace"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(100%-2rem,32rem)]">
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
          <DialogDescription>
            Update the name, context, and icon for {workspace.name}.
          </DialogDescription>
        </DialogHeader>
        <form action={updateWorkspaceAction} className="space-y-4" id={formId}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-name`}>Name</Label>
              <Input id={`${formId}-name`} name="name" defaultValue={workspace.name} required />
            </div>
            <WorkspaceKindPicker
              key={`${workspace.id}-${workspace.kind}`}
              id={`${formId}-kind`}
              contexts={contexts}
              defaultValue={workspace.kind}
              label="Context"
            />
          </div>
          <WorkspaceIconPicker defaultValue={workspace.icon} id={`${formId}-icon`} />
          <Button type="submit" className="w-full" size="lg">
            Save workspace
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
