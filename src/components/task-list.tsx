import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon, SyncStateIcon, syncStateLabel } from "@/components/task-meta-icons";
import { TaskPreviewButton, type TaskPreviewData } from "@/components/task-preview-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatWhen } from "@/lib/utils";

export type TaskListItem = TaskPreviewData & {
  id: string;
};

export function TaskList({ tasks, canWrite }: { tasks: TaskListItem[]; canWrite: boolean }) {
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {tasks.map((task) => (
        <li
          key={task.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 p-3 sm:p-4 lg:grid-cols-[auto_minmax(14rem,2.2fr)_minmax(10rem,1.2fr)_7rem_8rem_8rem_auto] lg:items-center lg:gap-x-5"
        >
          {canWrite ? (
            <div className="pt-1 lg:pt-0">
              <Checkbox name="ids" value={task.id} aria-label={`Select ${task.title}`} />
            </div>
          ) : (
            <span className="size-4" aria-hidden="true" />
          )}

          <div className="min-w-0">
            <p className="font-medium leading-snug">{task.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">
                <span className="font-medium text-foreground/70">Project</span>
                <span className="truncate">{task.projectName}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5 text-muted">
                <span className="font-medium text-foreground/70">Assignee</span>
                <span className="truncate">{task.assigneeLabel || "Unassigned"}</span>
              </span>
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

          <div className="col-start-3 row-start-1 lg:col-auto lg:row-auto">
            <TaskPreviewButton task={task} className="shrink-0" />
          </div>
        </li>
      ))}
    </ul>
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
