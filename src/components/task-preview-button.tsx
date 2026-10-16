"use client";

import { ExternalLink } from "lucide-react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon, SyncStateIcon, syncStateLabel } from "@/components/task-meta-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatWhen } from "@/lib/utils";

export type TaskPreviewData = {
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

export function TaskPreviewDialog({
  task,
  open,
  onOpenChange,
}: {
  task: TaskPreviewData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sourceLabel = providerLabel(task.provider);
  const body = task.description.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85dvh,44rem)] w-[min(100%-2rem,40rem)] max-w-none flex-col gap-4 overflow-hidden p-5">
        <DialogHeader className="shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <ProviderIcon provider={task.provider} />
            <DialogDescription className="text-xs">
              {sourceLabel}
              {task.externalUrl ? " · synced into Atrium" : " · native in Atrium"}
            </DialogDescription>
          </div>
          <DialogTitle className="pr-8 text-xl leading-snug">{task.title}</DialogTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={task.status}>
              <StatusIcon status={task.status} className="size-3.5" />
              {task.status.replace("_", " ")}
            </Badge>
            <Badge tone={task.priority}>
              <PriorityIcon priority={task.priority} className="size-3.5" />
              {task.priority}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <SyncStateIcon state={task.syncState} className="size-3.5" />
              {syncStateLabel(task.syncState)}
            </span>
          </div>
        </DialogHeader>

        <dl className="grid shrink-0 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Project</dt>
            <dd className="mt-0.5">{task.projectName}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Assignee</dt>
            <dd className="mt-0.5">{task.assigneeLabel || "Unassigned"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Due</dt>
            <dd className="mt-0.5">{formatWhen(task.dueAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Source</dt>
            <dd className="mt-0.5">{sourceLabel}</dd>
          </div>
        </dl>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border bg-background p-4">
          {body ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{body}</p>
          ) : (
            <p className="text-sm text-muted">No description synced for this task.</p>
          )}
        </div>

        {task.externalUrl ? (
          <div className="flex shrink-0 border-t pt-3">
            <Button asChild variant="outline" size="sm">
              <a href={task.externalUrl} target="_blank" rel="noreferrer">
                Open in {sourceLabel}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
