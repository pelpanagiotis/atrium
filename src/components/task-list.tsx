"use client";

import { useState } from "react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon, SyncStateIcon, syncStateLabel } from "@/components/task-meta-icons";
import { TaskPreviewDialog, type TaskPreviewData } from "@/components/task-preview-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatWhen } from "@/lib/utils";

export type TaskListItem = TaskPreviewData & {
  id: string;
};

export function TaskList({ tasks, canWrite }: { tasks: TaskListItem[]; canWrite: boolean }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {tasks.map((task) => (
        <TaskListRow key={task.id} task={task} canWrite={canWrite} />
      ))}
    </ul>
  );
}

function TaskListRow({ task, canWrite }: { task: TaskListItem; canWrite: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open ${task.title}`}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 p-3 sm:p-4",
          "lg:grid-cols-[auto_minmax(14rem,2.2fr)_minmax(10rem,1.2fr)_7rem_8rem_8rem] lg:items-center lg:gap-x-5",
          "cursor-pointer transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
      >
        {canWrite ? (
          <div
            className="pt-1 lg:pt-0"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox name="ids" value={task.id} aria-label={`Select ${task.title}`} />
          </div>
        ) : (
          <span className="size-4" aria-hidden="true" />
        )}

        <div className="min-w-0">
          <p className="font-medium leading-snug">{task.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="project">{task.projectName}</Badge>
            <Badge tone={task.assigneeLabel ? "due" : "none"}>
              {task.assigneeLabel || "Unassigned"}
            </Badge>
          </div>
        </div>

        <div className="col-span-2 col-start-2 flex flex-wrap items-center gap-x-5 gap-y-2 lg:col-span-1 lg:col-start-auto lg:contents">
          <div className="flex flex-wrap items-center gap-1.5 lg:flex-col lg:items-start lg:gap-1.5">
            <Badge tone={task.status}>
              <StatusIcon status={task.status} className="size-3.5" />
              {task.status.replace("_", " ")}
            </Badge>
            <Badge tone={task.priority}>
              <PriorityIcon priority={task.priority} className="size-3.5" />
              {task.priority}
            </Badge>
          </div>
          <Meta label="Due">{formatWhen(task.dueAt)}</Meta>
          <Meta label="Sync">
            <SyncStateIcon state={task.syncState} className="size-3.5" />
            {syncStateLabel(task.syncState)}
          </Meta>
          <Meta label="Source">
            <ProviderIcon provider={task.provider} />
            {providerLabel(task.provider)}
          </Meta>
        </div>
      </div>
      <TaskPreviewDialog task={task} open={open} onOpenChange={setOpen} />
    </li>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-xs">
      <span className="font-medium text-foreground/70">{label}</span>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">{children}</span>
    </div>
  );
}
