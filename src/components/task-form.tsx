"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

export function TaskForm({
  workspaceId,
  projectId,
  returnTo,
  action,
}: {
  workspaceId: string;
  projectId: string;
  returnTo: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="mt-4 rounded-lg border bg-card p-4">
      <h3 className="text-lg">Add a task</h3>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required className="mt-1" />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" className="mt-1" />
        </div>
        <Select name="status" defaultValue="open" aria-label="Status">
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </Select>
        <Select name="priority" defaultValue="medium" aria-label="Priority">
          <option value="none">No priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </Select>
        <Input name="dueAt" type="date" aria-label="Due date" />
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      <Button className="mt-3" disabled={pending} type="submit">{pending ? "Saving…" : "Create task"}</Button>
    </form>
  );
}
