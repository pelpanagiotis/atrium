"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { ExternalLink } from "lucide-react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { updateTaskAction } from "@/app/actions";
import { ProviderIcon, providerLabel } from "@/components/provider-icon";
import { PriorityIcon, StatusIcon } from "@/components/task-meta-icons";
import { Badge } from "@/components/ui/badge";
import { MenuSelect } from "@/components/ui/menu-select";
import { cn } from "@/lib/utils";

const COLUMNS = ["open", "in_progress", "blocked", "done", "cancelled"] as const;
type BoardStatus = (typeof COLUMNS)[number];

const STATUS_OPTIONS = COLUMNS.map((status) => ({
  value: status,
  label: status.replace("_", " "),
}));

type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  version: number;
  provider: string | null;
  project_name: string;
  external_url: string | null;
};

type DragState = {
  taskId: string;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
};

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

function TaskCardBody({ task, reserveSourceSlot = false }: { task: BoardTask; reserveSourceSlot?: boolean }) {
  return (
    <>
      <p className={cn("font-medium", reserveSourceSlot && task.external_url && "pr-8")}>{task.title}</p>
      <p className="text-xs text-muted">{task.project_name}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge tone={task.priority}>
          <PriorityIcon priority={task.priority} className="size-3.5" />
          {task.priority}
        </Badge>
        <ProviderIcon provider={task.provider} />
      </div>
    </>
  );
}

function SourceLinkButton({ task }: { task: BoardTask }) {
  if (!task.external_url) return null;
  const label = `Open in ${providerLabel(task.provider)}`;
  return (
    <a
      href={task.external_url}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      draggable={false}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "absolute right-2 top-2 z-10 inline-flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted",
        "transition hover:border-foreground/20 hover:bg-accent hover:text-foreground",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <ExternalLink className="size-3.5" aria-hidden="true" />
    </a>
  );
}

export function TaskBoard({
  workspaceId,
  tasks,
}: {
  workspaceId: string;
  tasks: BoardTask[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, BoardStatus>>({});
  const [versionOverrides, setVersionOverrides] = useState<Record<string, number>>({});
  const [savingIds, setSavingIds] = useState<Record<string, true>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overColumn, setOverColumn] = useState<BoardStatus | null>(null);
  const [enteringIds, setEnteringIds] = useState<Record<string, true>>({});
  const suppressClickRef = useRef(false);
  const emptyDragImageRef = useRef<HTMLCanvasElement | null>(null);
  const savingIdsRef = useRef<Record<string, true>>({});

  const visibleTasks = tasks.map((task) => {
    const status = statusOverrides[task.id];
    const version = versionOverrides[task.id];
    let next = task;
    if (status && status !== task.status) next = { ...next, status };
    if (version !== undefined && version > task.version) next = { ...next, version };
    return next;
  });

  const draggedTask = drag ? visibleTasks.find((task) => task.id === drag.taskId) ?? null : null;

  function clearDrag() {
    setDrag(null);
    setOverColumn(null);
  }

  function updateDragPosition(event: DragEvent) {
    if (event.clientX === 0 && event.clientY === 0) return;
    setDrag((current) =>
      current
        ? {
            ...current,
            x: event.clientX,
            y: event.clientY,
          }
        : null,
    );
  }

  async function moveTask(task: BoardTask, nextStatus: BoardStatus) {
    if (task.status === nextStatus) return;
    if (savingIdsRef.current[task.id]) return;
    savingIdsRef.current = { ...savingIdsRef.current, [task.id]: true };
    setError(null);
    setSavingIds((current) => ({ ...current, [task.id]: true }));
    setStatusOverrides((current) => ({ ...current, [task.id]: nextStatus }));
    setEnteringIds((current) => ({ ...current, [task.id]: true }));
    window.setTimeout(() => {
      setEnteringIds((current) => {
        if (!current[task.id]) return current;
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }, 280);

    const data = new FormData();
    data.set("workspaceId", workspaceId);
    data.set("taskId", task.id);
    data.set("version", String(task.version));
    data.set("status", nextStatus);
    data.set("returnTo", "/tasks?view=board");
    data.set("silent", "1");
    try {
      await updateTaskAction(data);
      setVersionOverrides((current) => ({ ...current, [task.id]: task.version + 1 }));
      router.refresh();
    } catch (reason: unknown) {
      if (isRedirectError(reason)) {
        setVersionOverrides((current) => ({ ...current, [task.id]: task.version + 1 }));
        router.refresh();
        return;
      }
      setStatusOverrides((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      setError(reason instanceof Error ? reason.message : "Could not move the task");
    } finally {
      const nextSaving = { ...savingIdsRef.current };
      delete nextSaving[task.id];
      savingIdsRef.current = nextSaving;
      setSavingIds(nextSaving);
    }
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => {
          const columnTasks = visibleTasks.filter((task) => task.status === column);
          const isOver = overColumn === column && drag !== null;
          return (
            <section
              key={column}
              className={cn(
                "board-column min-w-64 flex-1 rounded-lg border bg-card p-3 transition-[background-color,border-color,box-shadow] duration-200",
                isOver && "border-foreground/30 bg-accent/40 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent)]",
              )}
              onDragEnter={(event) => {
                event.preventDefault();
                setOverColumn(column);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverColumn(column);
                updateDragPosition(event);
              }}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (related && event.currentTarget.contains(related)) return;
                setOverColumn((current) => (current === column ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const raw = event.dataTransfer.getData("application/x-atrium-task") || event.dataTransfer.getData("text/plain");
                clearDrag();
                if (!raw) return;
                try {
                  const payload = JSON.parse(raw) as { id: string; version: number };
                  const task = visibleTasks.find((item) => item.id === payload.id);
                  if (!task) return;
                  void moveTask(task, column);
                } catch {
                  setError("Could not move the task");
                }
              }}
            >
              <h2 className="flex items-center gap-1.5 text-sm font-medium capitalize">
                <StatusIcon status={column} className="size-3.5" />
                {column.replace("_", " ")}
                <span className="ml-auto text-xs font-normal text-muted">{columnTasks.length}</span>
              </h2>
              <div
                className={cn(
                  "mt-3 min-h-24 space-y-2 rounded-md transition-colors duration-200",
                  isOver && "bg-accent/30",
                )}
              >
                {isOver && columnTasks.length === 0 ? (
                  <div className="board-drop-placeholder flex h-20 items-center justify-center rounded-md border border-dashed border-foreground/25 text-xs text-muted">
                    Drop here
                  </div>
                ) : null}
                {columnTasks.map((task) => {
                  const isDragging = drag?.taskId === task.id;
                  const isEntering = Boolean(enteringIds[task.id]);
                  const isSaving = Boolean(savingIds[task.id]);
                  return (
                    <article
                      key={task.id}
                      draggable={!isSaving}
                      aria-busy={isSaving}
                      onDragStart={(event) => {
                        if (isSaving || savingIdsRef.current[task.id]) {
                          event.preventDefault();
                          return;
                        }
                        suppressClickRef.current = true;
                        const rect = event.currentTarget.getBoundingClientRect();
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/x-atrium-task",
                          JSON.stringify({ id: task.id, version: task.version }),
                        );
                        event.dataTransfer.setData(
                          "text/plain",
                          JSON.stringify({ id: task.id, version: task.version }),
                        );
                        if (!emptyDragImageRef.current) {
                          const canvas = document.createElement("canvas");
                          canvas.width = 1;
                          canvas.height = 1;
                          emptyDragImageRef.current = canvas;
                        }
                        event.dataTransfer.setDragImage(emptyDragImageRef.current, 0, 0);
                        setDrag({
                          taskId: task.id,
                          width: rect.width,
                          height: rect.height,
                          offsetX: event.clientX - rect.left,
                          offsetY: event.clientY - rect.top,
                          x: event.clientX,
                          y: event.clientY,
                        });
                        setOverColumn(column);
                      }}
                      onDrag={(event) => updateDragPosition(event)}
                      onDragEnd={() => {
                        clearDrag();
                        window.setTimeout(() => {
                          suppressClickRef.current = false;
                        }, 0);
                      }}
                      className={cn(
                        "board-card group relative rounded-md border bg-background text-sm",
                        "transition-[opacity,transform,box-shadow,background-color] duration-200 ease-out",
                        isSaving
                          ? "cursor-wait"
                          : "cursor-grab hover:bg-accent/40 active:cursor-grabbing",
                        isDragging && "board-card-dragging opacity-35",
                        isEntering && "board-card-enter",
                        isSaving && "board-card-saving",
                      )}
                    >
                      <SourceLinkButton task={task} />
                      <Link
                        href={`/tasks/${task.id}`}
                        className={cn("block p-3", isSaving && "pointer-events-none")}
                        draggable={false}
                        tabIndex={isSaving ? -1 : undefined}
                        onClick={(event) => {
                          if (suppressClickRef.current || isSaving) {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        }}
                      >
                        <TaskCardBody task={task} reserveSourceSlot />
                      </Link>
                      <div className="px-3 pb-3 md:hidden">
                        <MobileStatusForm
                          workspaceId={workspaceId}
                          taskId={task.id}
                          version={task.version}
                          status={task.status}
                        />
                      </div>
                      {isSaving ? (
                        <div
                          className="absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/65 backdrop-blur-[1px]"
                          aria-hidden="true"
                        >
                          <span className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted">
                            Saving…
                          </span>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {drag && draggedTask ? (
        <div
          aria-hidden="true"
          className="board-drag-preview pointer-events-none fixed z-[80] rounded-md border bg-background p-3 text-sm shadow-xl"
          style={{
            width: drag.width,
            left: drag.x - drag.offsetX,
            top: drag.y - drag.offsetY,
          }}
        >
          <TaskCardBody task={draggedTask} reserveSourceSlot />
        </div>
      ) : null}
    </div>
  );
}
