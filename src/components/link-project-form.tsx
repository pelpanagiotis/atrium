"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function LinkProjectForm({
  workspaceId,
  integrationId,
  projects,
  action,
}: {
  workspaceId: string;
  integrationId: string;
  projects: Array<{ providerId: string; name: string; key: string | null; url: string | null }>;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  const [selected, setSelected] = useState(projects[0]);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="integrationId" value={integrationId} />
      <input type="hidden" name="name" value={selected?.name ?? ""} />
      <input type="hidden" name="key" value={selected?.key ?? ""} />
      <input type="hidden" name="url" value={selected?.url ?? ""} />
      <ul className="divide-y rounded-lg border bg-card">
        {projects.map((project) => (
          <li key={project.providerId} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="providerProjectId"
                value={project.providerId}
                required
                defaultChecked={project.providerId === selected?.providerId}
                onChange={() => setSelected(project)}
              />
              <span>{project.name}{project.key ? ` (${project.key})` : ""}</span>
            </label>
          </li>
        ))}
      </ul>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button disabled={pending} type="submit">{pending ? "Linking…" : "Create external project"}</Button>
    </form>
  );
}
