"use client";

import { switchWorkspaceAction } from "@/app/actions";

export function WorkspaceSwitch({
  currentId,
  workspaces,
}: {
  currentId: string;
  workspaces: Array<{ id: string; name: string; role: string }>;
}) {
  return (
    <form action={switchWorkspaceAction}>
      <label className="sr-only" htmlFor="workspace-switch">Workspace</label>
      <select
        id="workspace-switch"
        name="workspaceId"
        defaultValue={currentId}
        className="h-9 max-w-[220px] rounded-md border bg-card px-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} · {workspace.role}
          </option>
        ))}
      </select>
    </form>
  );
}
