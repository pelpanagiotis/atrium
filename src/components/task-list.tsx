"use client";

import Link from "next/link";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon, SyncStateIcon, syncStateLabel } from "@/components/task-meta-icons";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn, formatWhen } from "@/lib/utils";

export type TaskListItem = {
  id: string;
  syncState: string;
  provider: string | null;
  externalUrl: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: Date | string | null;
  projectName: string;
  assigneeLabel: string | null;
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
  return (
    <li className="flex items-stretch">
      {canWrite ? (
        <div className="flex shrink-0 items-start px-3 pt-4 sm:px-4 sm:pt-5 lg:items-center lg:pt-0">
          <Checkbox name="ids" value={task.id} aria-label={`Select ${task.title}`} />
        </div>
      ) : null}

      <Link
        href={`/tasks/${task.id}`}
        aria-label={`Open ${task.title}`}
        className={cn(
          "grid min-w-0 flex-1 grid-cols-1 items-start gap-x-3 gap-y-3 p-3 sm:p-4",
          "lg:grid-cols-[minmax(14rem,2.2fr)_minmax(10rem,1.2fr)_7rem_8rem_8rem] lg:items-center lg:gap-x-5",
          "transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          !canWrite && "pl-3 sm:pl-4",
        )}
      >
        <div className="min-w-0">
          <p className="font-medium leading-snug">{task.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="project">{task.projectName}</Badge>
            <Badge tone={task.assigneeLabel ? "due" : "none"}>
              {task.assigneeLabel || "Unassigned"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 lg:contents">
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
      </Link>
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
