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
import { Input, Label, Select, Textarea } from "@/components/ui/field";

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
  const showProjectPicker = (projects?.length ?? 0) > 1;

  useEffect(() => {
    if (state.error) setOpen(true);
  }, [state]);

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
              <Select
                id="task-project"
                name="projectId"
                defaultValue={projectId}
                className="mt-1"
                aria-label="Project"
                required
              >
                {projects!.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
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
              <Select id="task-status" name="status" defaultValue="open" className="mt-1" aria-label="Status">
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="blocked">Blocked</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <Select id="task-priority" name="priority" defaultValue="medium" className="mt-1" aria-label="Priority">
                <option value="none">No priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
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
