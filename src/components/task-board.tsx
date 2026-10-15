"use client";

import { useState } from "react";
import { updateTaskAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";

const COLUMNS = ["open", "in_progress", "blocked", "done", "cancelled"] as const;

export function TaskBoard({
  workspaceId,
  tasks,
}: {
  workspaceId: string;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    version: number;
    provider: string | null;
    project_name: string;
    external_url: string | null;
  }>;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => (
          <section
            key={column}
            className="min-w-64 flex-1 rounded-lg border bg-card p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const raw = event.dataTransfer.getData("text/plain");
              const payload = JSON.parse(raw) as { id: string; version: number };
              const data = new FormData();
              data.set("workspaceId", workspaceId);
              data.set("taskId", payload.id);
              data.set("version", String(payload.version));
              data.set("status", column);
              data.set("returnTo", "/tasks?view=board");
              updateTaskAction(data).catch((reason: unknown) => {
                setError(reason instanceof Error ? reason.message : "Could not move the task");
              });
            }}
          >
            <h2 className="text-sm font-medium capitalize">{column.replace("_", " ")}</h2>
            <div className="mt-3 space-y-2">
              {tasks.filter((task) => task.status === column).map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id, version: task.version }))}
                  className="cursor-grab rounded-md border bg-background p-3 text-sm"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted">{task.project_name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone={task.priority}>{task.priority}</Badge>
                    <Badge tone={task.provider ? "external" : "native"}>{task.provider ?? "native"}</Badge>
                  </div>
                  {task.external_url ? <a className="mt-2 inline-block text-xs underline" href={task.external_url}>Source</a> : null}
                  <form action={updateTaskAction} className="mt-2 md:hidden">
                    <input type="hidden" name="workspaceId" value={workspaceId} />
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="version" value={task.version} />
                    <input type="hidden" name="returnTo" value="/tasks?view=board" />
                    <select name="status" defaultValue={task.status} className="h-8 w-full rounded border bg-card text-xs" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
                      {COLUMNS.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                    </select>
                  </form>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
