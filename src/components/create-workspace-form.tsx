"use client";

import { useActionState } from "react";
import { createWorkspaceAction, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export function CreateWorkspaceForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createWorkspaceAction, {});
  return (
    <form action={action} className="rounded-lg border bg-card p-4">
      <h2 className="text-xl">Create a workspace</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px_auto]">
        <Input name="name" placeholder="Northwind Studio" required />
        <Select name="kind" defaultValue="work" aria-label="Kind">
          <option value="work">Work</option>
          <option value="personal">Personal</option>
        </Select>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create"}
        </Button>
      </div>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
    </form>
  );
}
