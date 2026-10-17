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

type DropIndicator = {
  column: BoardStatus;
  index: number;
};

function DropInsertBar() {
  return (
    <div className="board-drop-bar relative h-3" aria-hidden="true">
      <div className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/80" />
      <div className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-foreground" />
      <div className="absolute right-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-foreground" />
    </div>
  );
}

function orderColumnTasks(tasks: BoardTask[], order: string[] | undefined): BoardTask[] {
  if (!order || order.length === 0) return tasks;
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const ordered: BoardTask[] = [];
  for (const id of order) {
    const task = byId.get(id);
    if (task) {
      ordered.push(task);
      byId.delete(id);
    }
  }
  for (const task of tasks) {
    if (byId.has(task.id)) ordered.push(task);
  }
  return ordered;
}

function insertIndexFromPointer(list: HTMLElement, clientY: number, draggedId: string | null): number {
  const cards = [...list.querySelectorAll<HTMLElement>("[data-task-card]")].filter(
    (card) => card.dataset.taskId !== draggedId,
  );
  for (let index = 0; index < cards.length; index += 1) {
    const rect = cards[index]!.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return index;
  }
  return cards.length;
}

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
  const [columnOrders, setColumnOrders] = useState<Partial<Record<BoardStatus, string[]>>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
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
    setDropIndicator(null);
  }

  function applyDropOrder(taskId: string, column: BoardStatus, index: number) {
    setColumnOrders((current) => {
      const next: Partial<Record<BoardStatus, string[]>> = { ...current };
      for (const status of COLUMNS) {
        const existing =
          next[status] ??
          visibleTasks.filter((task) => task.status === status).map((task) => task.id);
        next[status] = existing.filter((id) => id !== taskId);
      }
      const target = [...(next[column] ?? [])];
      const clamped = Math.max(0, Math.min(index, target.length));
      target.splice(clamped, 0, taskId);
      next[column] = target;
      return next;
    });
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

  async function moveTask(task: BoardTask, nextStatus: BoardStatus, insertIndex: number) {
    if (savingIdsRef.current[task.id]) return;
    const sameColumn = task.status === nextStatus;
    applyDropOrder(task.id, nextStatus, insertIndex);
    if (sameColumn) return;

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
          const columnTasks = orderColumnTasks(
            visibleTasks.filter((task) => task.status === column),
            columnOrders[column],
          );
          const isOver = dropIndicator?.column === column && drag !== null;
          const insertAt = isOver ? dropIndicator.index : -1;
          const listTasks = columnTasks.filter((task) => task.id !== drag?.taskId);

          function updateColumnIndicator(event: DragEvent<HTMLElement>) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            updateDragPosition(event);
            const list = event.currentTarget.querySelector<HTMLElement>("[data-column-list]");
            if (!list) {
              setDropIndicator({ column, index: 0 });
              return;
            }
            setDropIndicator({
              column,
              index: insertIndexFromPointer(list, event.clientY, drag?.taskId ?? null),
            });
          }

          return (
            <section
              key={column}
              className={cn(
                "board-column min-w-64 flex-1 rounded-lg border bg-card p-3 transition-[background-color,border-color,box-shadow] duration-200",
                isOver && "border-foreground/30 bg-accent/40 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent)]",
              )}
              onDragEnter={updateColumnIndicator}
              onDragOver={updateColumnIndicator}
              onDragLeave={(event) => {
                const related = event.relatedTarget as Node | null;
                if (related && event.currentTarget.contains(related)) return;
                setDropIndicator((current) => (current?.column === column ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const raw = event.dataTransfer.getData("application/x-atrium-task") || event.dataTransfer.getData("text/plain");
                const list = event.currentTarget.querySelector<HTMLElement>("[data-column-list]");
                const index = list
                  ? insertIndexFromPointer(list, event.clientY, drag?.taskId ?? null)
                  : listTasks.length;
                clearDrag();
                if (!raw) return;
                try {
                  const payload = JSON.parse(raw) as { id: string; version: number };
                  const task = visibleTasks.find((item) => item.id === payload.id);
                  if (!task) return;
                  void moveTask(task, column, index);
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
                data-column-list
                className={cn(
                  "mt-3 flex min-h-24 flex-col rounded-md transition-colors duration-200",
                  isOver && "bg-accent/30",
                )}
              >
                {insertAt === 0 ? <DropInsertBar /> : null}
                {listTasks.length === 0 && !isOver ? (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/80 text-xs text-muted">
                    No tasks
                  </div>
                ) : null}
                {listTasks.map((task, index) => {
                  const isEntering = Boolean(enteringIds[task.id]);
                  const isSaving = Boolean(savingIds[task.id]);
                  return (
                    <div key={task.id} className="contents">
                      <article
                        data-task-card
                        data-task-id={task.id}
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
                          setDropIndicator({ column, index });
                        }}
                        onDrag={(event) => updateDragPosition(event)}
                        onDragEnd={() => {
                          clearDrag();
                          window.setTimeout(() => {
                            suppressClickRef.current = false;
                          }, 0);
                        }}
                        className={cn(
                          "board-card group relative my-1 rounded-md border bg-background text-sm",
                          "transition-[opacity,transform,box-shadow,background-color] duration-200 ease-out",
                          isSaving
                            ? "cursor-wait"
                            : "cursor-grab hover:bg-accent/40 active:cursor-grabbing",
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
                      {insertAt === index + 1 ? <DropInsertBar /> : null}
                    </div>
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
