"use client";

import { useActionState, useState } from "react";
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
import { MenuSelect } from "@/components/ui/menu-select";

type ProjectOption = { id: string; name: string };

export function TaskForm({
  workspaceId,
  projectId,
  projects,
  returnTo,
  action,
  triggerLabel = "New task",
}: {
  workspaceId: string;
  projectId: string;
  projects?: ProjectOption[];
  returnTo: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [seenError, setSeenError] = useState<string | null>(null);
  const showProjectPicker = (projects?.length ?? 0) > 1;

  if (state.error && state.error !== seenError) {
    setSeenError(state.error);
    if (!open) setOpen(true);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus className="size-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a task</DialogTitle>
          <DialogDescription>
            Create a task in this workspace. Provider-backed projects only accept fields that provider supports.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="workspaceId" value={workspaceId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {showProjectPicker ? (
            <div>
              <Label htmlFor="task-project">Project</Label>
              <MenuSelect
                id="task-project"
                name="projectId"
                defaultValue={projectId}
                className="mt-1"
                aria-label="Project"
                required
                options={projects!.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
              />
            </div>
          ) : (
            <input type="hidden" name="projectId" value={projectId} />
          )}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required className="mt-1" autoFocus />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" className="mt-1" rows={3} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-status">Status</Label>
              <MenuSelect
                id="task-status"
                name="status"
                defaultValue="open"
                className="mt-1"
                aria-label="Status"
                options={[
                  { value: "open", label: "Open" },
                  { value: "in_progress", label: "In progress" },
                  { value: "blocked", label: "Blocked" },
                  { value: "done", label: "Done" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
              />
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <MenuSelect
                id="task-priority"
                name="priority"
                defaultValue="medium"
                className="mt-1"
                aria-label="Priority"
                options={[
                  { value: "none", label: "No priority" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input id="task-due" name="dueAt" type="date" className="mt-1" aria-label="Due date" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
