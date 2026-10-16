"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { updateTaskAction } from "@/app/actions";
import { ProviderIcon } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon } from "@/components/task-meta-icons";
import { Badge } from "@/components/ui/badge";
import { MenuSelect } from "@/components/ui/menu-select";

const COLUMNS = ["open", "in_progress", "blocked", "done", "cancelled"] as const;

const STATUS_OPTIONS = COLUMNS.map((status) => ({
  value: status,
  label: status.replace("_", " "),
}));

function MobileStatusForm({
  workspaceId,
  taskId,
  version,
  status,
}: {
  workspaceId: string;
  taskId: string;
  version: number;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={updateTaskAction} className="mt-2 md:hidden">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="returnTo" value="/tasks?view=board" />
      <MenuSelect
        name="status"
        defaultValue={status}
        aria-label="Status"
        triggerClassName="h-8 text-xs"
        options={STATUS_OPTIONS}
        onValueChange={() => formRef.current?.requestSubmit()}
      />
    </form>
  );
}

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
            <h2 className="flex items-center gap-1.5 text-sm font-medium capitalize">
              <StatusIcon status={column} className="size-3.5" />
              {column.replace("_", " ")}
            </h2>
            <div className="mt-3 space-y-2">
              {tasks.filter((task) => task.status === column).map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id, version: task.version }))}
                  className="cursor-grab rounded-md border bg-background text-sm"
                >
                  <Link href={`/tasks/${task.id}`} className="block p-3 transition-colors hover:bg-accent/40">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted">{task.project_name}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone={task.priority}>
                        <PriorityIcon priority={task.priority} className="size-3.5" />
                        {task.priority}
                      </Badge>
                      <ProviderIcon provider={task.provider} />
                    </div>
                  </Link>
                  {task.external_url ? (
                    <a
                      className="mx-3 mb-2 inline-block text-xs underline"
                      href={task.external_url}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Source
                    </a>
                  ) : null}
                  <div className="px-3 pb-3">
                    <MobileStatusForm
                      workspaceId={workspaceId}
                      taskId={task.id}
                      version={task.version}
                      status={task.status}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
