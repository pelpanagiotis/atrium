"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";

export function ProjectForm({
  workspaceId,
  action,
}: {
  workspaceId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  return (
    <form action={formAction} className="rounded-lg border bg-card p-4">
      <h2 className="text-xl">New native project</h2>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="project-name">Name</Label>
          <Input id="project-name" name="name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="project-description">Description</Label>
          <Textarea id="project-description" name="description" className="mt-1" />
        </div>
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      <Button className="mt-3" disabled={pending} type="submit">{pending ? "Creating…" : "Create project"}</Button>
    </form>
  );
}
