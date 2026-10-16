"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon, SyncStateIcon } from "@/components/task-meta-icons";
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

export function TaskSourceCell({
  syncState,
  provider,
  externalUrl,
  title,
  description,
  status,
  priority,
  dueAt,
  projectName,
  assigneeLabel,
}: {
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
}) {
  const [open, setOpen] = useState(false);
  const sourceLabel = providerLabel(provider);
  const body = description.trim();

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <SyncStateIcon state={syncState} className="size-4" />
        <ProviderIcon provider={provider} />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Open
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(85dvh,44rem)] w-[min(100%-2rem,40rem)] max-w-none flex-col gap-4 overflow-hidden p-5">
          <DialogHeader className="shrink-0 space-y-3">
            <div className="flex items-center gap-2">
              <ProviderIcon provider={provider} />
              <DialogDescription className="text-xs">
                {sourceLabel}
                {externalUrl ? " · synced into Atrium" : " · native in Atrium"}
              </DialogDescription>
            </div>
            <DialogTitle className="pr-8 text-xl leading-snug">{title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status}>
                <StatusIcon status={status} className="size-3.5" />
                {status.replace("_", " ")}
              </Badge>
              <Badge tone={priority}>
                <PriorityIcon priority={priority} className="size-3.5" />
                {priority}
              </Badge>
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <SyncStateIcon state={syncState} className="size-3.5" />
                {syncState}
              </span>
            </div>
          </DialogHeader>

          <dl className="grid shrink-0 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Project</dt>
              <dd className="mt-0.5">{projectName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Assignee</dt>
              <dd className="mt-0.5">{assigneeLabel || "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Due</dt>
              <dd className="mt-0.5">{formatWhen(dueAt)}</dd>
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

          {externalUrl ? (
            <div className="flex shrink-0 border-t pt-3">
              <Button asChild variant="outline" size="sm">
                <a href={externalUrl} target="_blank" rel="noreferrer">
                  Open in {sourceLabel}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
