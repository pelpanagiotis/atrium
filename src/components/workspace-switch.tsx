"use client";

import { switchWorkspaceAction } from "@/app/actions";
import { workspaceIconOrFallback } from "@/lib/workspace-icons";

export function WorkspaceSwitch({
  currentId,
  workspaces,
}: {
  currentId: string;
  workspaces: Array<{ id: string; name: string; role: string; kind: "personal" | "work"; icon?: string | null }>;
}) {
  return (
    <form action={switchWorkspaceAction}>
      <label className="sr-only" htmlFor="workspace-switch">Workspace</label>
      <select
        id="workspace-switch"
        name="workspaceId"
        defaultValue={currentId}
        className="h-9 max-w-[240px] rounded-md border bg-card px-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspaceIconOrFallback(workspace.icon, workspace.kind)} {workspace.name} · {workspace.role}
          </option>
        ))}
      </select>
    </form>
  );
}
