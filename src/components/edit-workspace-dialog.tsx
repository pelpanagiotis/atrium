"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { updateWorkspaceAction } from "@/app/actions";
import { WorkspaceIconPicker } from "@/components/workspace-icon-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/field";

export function EditWorkspaceDialog({
  workspace,
}: {
  workspace: {
    id: string;
    name: string;
    kind: "personal" | "work";
    icon?: string | null;
  };
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
          <DialogDescription>Update the name, type, and icon for {workspace.name}.</DialogDescription>
        </DialogHeader>
        <form action={updateWorkspaceAction} className="space-y-4" id={formId}>
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-name`}>Name</Label>
              <Input id={`${formId}-name`} name="name" defaultValue={workspace.name} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-kind`}>Type</Label>
              <Select id={`${formId}-kind`} name="kind" defaultValue={workspace.kind} aria-label="Workspace type">
                <option value="work">Work</option>
                <option value="personal">Personal</option>
              </Select>
            </div>
          </div>
          <WorkspaceIconPicker defaultValue={workspace.icon} id={`${formId}-icon`} />
          <Button type="submit" variant="outline">
            Save workspace
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
