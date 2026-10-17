"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
};

type DropIndicator = {
  column: BoardStatus;
  index: number;
};

function DropInsertBar() {
  return (
    <div className="board-drop-bar pointer-events-none relative z-10 h-0" aria-hidden="true">
      <div className="absolute inset-x-1 top-0 h-0.5 -translate-y-1/2 rounded-full bg-foreground/80" />
      <div className="absolute left-0 top-0 size-2 -translate-y-1/2 rounded-full bg-foreground" />
      <div className="absolute right-0 top-0 size-2 -translate-y-1/2 rounded-full bg-foreground" />
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
      data-no-drag
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
  const savingIdsRef = useRef<Record<string, true>>({});
  const dropIndicatorRef = useRef<DropIndicator | null>(null);
  const dragSessionRef = useRef<{ pointerId: number; active: boolean } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const frameRef = useRef(0);

  function placePreview() {
    const node = previewRef.current;
    if (!node) return;
    const { x, y, offsetX, offsetY } = pointerRef.current;
    node.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0) rotate(2deg) scale(1.03)`;
  }

  const visibleTasks = tasks.map((task) => {
    const status = statusOverrides[task.id];
    const version = versionOverrides[task.id];
    let next = task;
    if (status && status !== task.status) next = { ...next, status };
    if (version !== undefined && version > task.version) next = { ...next, version };
    return next;
  });

  const draggedTask = drag ? visibleTasks.find((task) => task.id === drag.taskId) ?? null : null;

  function setBoardDragging(active: boolean) {
    document.body.classList.toggle("board-dragging", active);
    if (active) window.dispatchEvent(new Event("atrium-board-drag-start"));
  }

  function clearDrag() {
    dragSessionRef.current = null;
    dropIndicatorRef.current = null;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    setBoardDragging(false);
    setDrag(null);
    setDropIndicator(null);
  }

  useEffect(() => () => document.body.classList.remove("board-dragging"), []);

  useLayoutEffect(() => {
    if (!drag) return;
    placePreview();
  }, [drag]);

  function showDropIndicator(next: DropIndicator | null) {
    const current = dropIndicatorRef.current;
    if (current === next) return;
    if (current && next && current.column === next.column && current.index === next.index) return;
    dropIndicatorRef.current = next;
    setDropIndicator(next);
  }

  function columnAtPoint(x: number, y: number): BoardStatus | null {
    const hits = document.elementsFromPoint(x, y);
    for (const hit of hits) {
      if (!(hit instanceof Element)) continue;
      const section = hit.closest<HTMLElement>("[data-board-column]");
      const status = section?.dataset.boardColumn;
      if (status && COLUMNS.includes(status as BoardStatus)) return status as BoardStatus;
    }
    for (const section of document.querySelectorAll<HTMLElement>("[data-board-column]")) {
      const rect = section.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const status = section.dataset.boardColumn;
        if (status && COLUMNS.includes(status as BoardStatus)) return status as BoardStatus;
      }
    }
    return null;
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

  function updateIndicatorFromPoint(clientX: number, clientY: number, taskId: string) {
    const column = columnAtPoint(clientX, clientY);
    if (!column) {
      showDropIndicator(null);
      return;
    }
    const list = document.querySelector<HTMLElement>(`[data-column-list="${column}"]`);
    showDropIndicator({
      column,
      index: list ? insertIndexFromPointer(list, clientY, taskId) : 0,
    });
  }

  function onCardPointerDown(event: ReactPointerEvent<HTMLElement>, task: BoardTask) {
    if (event.button !== 0) return;
    if (savingIdsRef.current[task.id]) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-drag], form, button, input, select, textarea")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const width = rect.width;
    const session = { pointerId, active: false };
    dragSessionRef.current = session;
    pointerRef.current = { x: event.clientX, y: event.clientY, offsetX, offsetY };

    function onMove(moveEvent: PointerEvent) {
      if (moveEvent.pointerId !== pointerId || dragSessionRef.current !== session) return;
      pointerRef.current.x = moveEvent.clientX;
      pointerRef.current.y = moveEvent.clientY;
      if (!session.active) {
        const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
        if (distance < 5) return;
        session.active = true;
        suppressClickRef.current = true;
        setBoardDragging(true);
        setDrag({ taskId: task.id, width });
      }
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = 0;
        if (dragSessionRef.current !== session) return;
        placePreview();
        updateIndicatorFromPoint(pointerRef.current.x, pointerRef.current.y, task.id);
      });
    }

    function finish(endEvent: PointerEvent) {
      if (endEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      if (dragSessionRef.current !== session) return;
      const wasActive = session.active;
      const indicator = dropIndicatorRef.current;
      clearDrag();
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      if (!wasActive || !indicator) return;
      void moveTask(task, indicator.column, indicator.index);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
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
          const visualCount = columnTasks.filter((task) => task.id !== drag?.taskId).length;

          return (
            <section
              key={column}
              data-board-column={column}
              className={cn(
                "board-column min-w-64 flex-1 rounded-lg border bg-card p-3 transition-[background-color,border-color,box-shadow] duration-200",
                isOver && "border-foreground/30 bg-accent/40 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_12%,transparent)]",
              )}
            >
              <h2 className="flex items-center gap-1.5 text-sm font-medium capitalize">
                <StatusIcon status={column} className="size-3.5" />
                {column.replace("_", " ")}
                <span className="ml-auto text-xs font-normal text-muted">{columnTasks.length}</span>
              </h2>
              <div
                data-column-list={column}
                className={cn(
                  "mt-3 flex min-h-24 flex-col rounded-md transition-colors duration-200",
                  isOver && "bg-accent/30",
                )}
              >
                {insertAt === 0 ? <DropInsertBar /> : null}
                {visualCount === 0 && !isOver ? (
                  <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-border/80 text-xs text-muted">
                    No tasks
                  </div>
                ) : null}
                {columnTasks.map((task, index) => {
                  const isDragSource = drag?.taskId === task.id;
                  const visualIndex = columnTasks
                    .slice(0, index)
                    .filter((item) => item.id !== drag?.taskId).length;
                  const isEntering = Boolean(enteringIds[task.id]);
                  const isSaving = Boolean(savingIds[task.id]);
                  return (
                    <div key={task.id} className="contents">
                      <article
                        data-task-card
                        data-task-id={task.id}
                        aria-busy={isSaving}
                        aria-hidden={isDragSource || undefined}
                        onPointerDown={(event) => onCardPointerDown(event, task)}
                        onDragStart={(event) => event.preventDefault()}
                        className={cn(
                          "board-card group relative my-1 rounded-md border bg-background text-sm",
                          "transition-[opacity,transform,box-shadow,background-color] duration-200 ease-out",
                          isSaving
                            ? "cursor-wait"
                            : "cursor-grab hover:bg-accent/40 active:cursor-grabbing",
                          isEntering && "board-card-enter",
                          isSaving && "board-card-saving",
                          isDragSource && "board-card-drag-source",
                        )}
                      >
                        <SourceLinkButton task={task} />
                        <Link
                          href={`/tasks/${task.id}`}
                          className={cn("block p-3", isSaving && "pointer-events-none")}
                          draggable={false}
                          onDragStart={(event) => event.preventDefault()}
                          tabIndex={isSaving || isDragSource ? -1 : undefined}
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
                      {!isDragSource && insertAt === visualIndex + 1 ? <DropInsertBar /> : null}
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
          ref={previewRef}
          aria-hidden="true"
          className="board-drag-preview pointer-events-none fixed top-0 left-0 z-[80] rounded-md border bg-background p-3 text-sm shadow-xl"
          style={{ width: drag.width }}
        >
          <TaskCardBody task={draggedTask} reserveSourceSlot />
        </div>
      ) : null}
    </div>
  );
}
