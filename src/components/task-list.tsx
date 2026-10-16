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
        <li key={task.id} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
          {canWrite ? (
            <div className="pt-1">
              <Checkbox name="ids" value={task.id} aria-label={`Select ${task.title}`} />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{task.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {task.projectName}
                  {task.assigneeLabel ? ` · ${task.assigneeLabel}` : ""}
                </p>
              </div>
              <TaskPreviewButton task={task} className="shrink-0" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={task.status}>
                <StatusIcon status={task.status} className="size-3.5" />
                {task.status.replace("_", " ")}
              </Badge>
              <Badge tone={task.priority}>
                <PriorityIcon priority={task.priority} className="size-3.5" />
                {task.priority}
              </Badge>
              <span className="text-xs text-muted">Due {formatWhen(task.dueAt)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">Sync</span>
                <SyncStateIcon state={task.syncState} className="size-3.5" />
                {syncStateLabel(task.syncState)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">Source</span>
                <ProviderIcon provider={task.provider} />
                {providerLabel(task.provider)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
