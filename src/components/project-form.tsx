"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/field";

export function ProjectForm({
  workspaceId,
  action,
}: {
  workspaceId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  useEffect(() => {
    if (state.error) setOpen(true);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden="true" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New native project</DialogTitle>
          <DialogDescription>
            Native projects are owned in Atrium. You can link a provider later from Integrations.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <div>
            <Label htmlFor="project-name">Name</Label>
            <Input id="project-name" name="name" required className="mt-1" autoFocus />
          </div>
          <div>
            <Label htmlFor="project-description">Description</Label>
            <Textarea id="project-description" name="description" className="mt-1" rows={3} />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
