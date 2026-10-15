"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export function InviteForm({
  workspaceId,
  action,
}: {
  workspaceId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const link = state.token ? `/invitations/${state.token}` : null;
  return (
    <form action={formAction} className="rounded-lg border bg-card p-4">
      <h2 className="text-xl">Invite someone</h2>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Input name="email" type="email" required placeholder="person@company.com" />
        <Select name="role" defaultValue="member" aria-label="Invitation role">
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </Select>
        <Button disabled={pending} type="submit">{pending ? "Creating…" : "Create invite"}</Button>
      </div>
      {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
      {link ? (
        <p className="mt-3 text-sm">
          {state.notice} <a className="underline" href={link}>{link}</a>
        </p>
      ) : null}
    </form>
  );
}
