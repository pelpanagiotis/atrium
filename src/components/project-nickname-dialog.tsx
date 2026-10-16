"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { updateProjectAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";

export function ProjectNicknameDialog({
  workspaceId,
  project,
}: {
  workspaceId: string;
  project: { id: string; name: string; nickname: string | null };
}) {
  const [open, setOpen] = useState(false);
  const formId = `project-nickname-${project.id}`;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Set nickname for ${project.name}`}
        title="Set nickname"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(100%-2rem,28rem)] max-h-[min(90dvh,24rem)] gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-5 pr-12">
            <DialogTitle className="text-2xl">Project nickname</DialogTitle>
            <DialogDescription>
              Give <span className="text-foreground">{project.name}</span> a shorter name in Atrium. Leave blank to use the original name.
            </DialogDescription>
          </DialogHeader>
          <form action={updateProjectAction} className="space-y-4 p-6" id={formId}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="returnTo" value="/projects" />
            <div className="grid gap-2">
              <Label htmlFor={`${formId}-nickname`}>Nickname</Label>
              <Input
                id={`${formId}-nickname`}
                name="nickname"
                defaultValue={project.nickname ?? ""}
                placeholder="e.g. Agent profiles"
                maxLength={80}
                autoFocus
              />
            </div>
            <Button type="submit" variant="outline">
              Save nickname
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
