"use client";

import { useActionState } from "react";
import { CalendarDays } from "lucide-react";
import { updateTaskDetailAction, type ActionState } from "@/app/actions";
import { PriorityIcon, StatusIcon } from "@/components/task-meta-icons";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { MenuSelect } from "@/components/ui/menu-select";

function dueInputValue(dueAt: Date | string | null): string {
  if (!dueAt) return "";
  const date = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open", icon: <StatusIcon status="open" /> },
  { value: "in_progress", label: "In progress", icon: <StatusIcon status="in_progress" /> },
  { value: "blocked", label: "Blocked", icon: <StatusIcon status="blocked" /> },
  { value: "done", label: "Done", icon: <StatusIcon status="done" /> },
  { value: "cancelled", label: "Cancelled", icon: <StatusIcon status="cancelled" /> },
];

const PRIORITY_OPTIONS = [
  { value: "none", label: "No priority", icon: <PriorityIcon priority="none" /> },
  { value: "low", label: "Low", icon: <PriorityIcon priority="low" /> },
  { value: "medium", label: "Medium", icon: <PriorityIcon priority="medium" /> },
  { value: "high", label: "High", icon: <PriorityIcon priority="high" /> },
  { value: "urgent", label: "Urgent", icon: <PriorityIcon priority="urgent" /> },
];

export function TaskDetailForm({
  workspaceId,
  taskId,
  version,
  title,
  description,
  status,
  priority,
  dueAt,
  canWrite,
}: {
  workspaceId: string;
  taskId: string;
  version: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueAt: Date | string | null;
  canWrite: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateTaskDetailAction, {});

  if (!canWrite) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-5">
          {description.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{description}</p>
          ) : (
            <p className="text-sm text-muted">No description for this task.</p>
          )}
        </div>
        <p className="text-sm text-muted">Your role can view this task. Members and above can edit it.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="version" value={version} />
      <input type="hidden" name="returnTo" value={`/tasks/${taskId}`} />

      <div className="rounded-lg border bg-card p-5">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="task-detail-title">Title</Label>
            <Input
              id="task-detail-title"
              name="title"
              required
              defaultValue={title}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="task-detail-description">Description</Label>
            <Textarea
              id="task-detail-description"
              name="description"
              rows={8}
              defaultValue={description}
              className="mt-1"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="task-detail-status">Status</Label>
              <MenuSelect
                id="task-detail-status"
                name="status"
                defaultValue={status}
                className="mt-1"
                aria-label="Status"
                options={STATUS_OPTIONS}
              />
            </div>
            <div>
              <Label htmlFor="task-detail-priority">Priority</Label>
              <MenuSelect
                id="task-detail-priority"
                name="priority"
                defaultValue={priority}
                className="mt-1"
                aria-label="Priority"
                options={PRIORITY_OPTIONS}
              />
            </div>
            <div>
              <Label htmlFor="task-detail-due">Due date</Label>
              <div className="relative mt-1">
                <CalendarDays
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <Input
                  id="task-detail-due"
                  name="dueAt"
                  type="date"
                  defaultValue={dueInputValue(dueAt)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.notice ? <p className="text-sm text-muted">{state.notice}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
