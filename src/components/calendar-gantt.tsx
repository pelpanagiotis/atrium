import Link from "next/link";
import { ProviderIcon } from "@/components/provider-icon";
import { projectDisplayName } from "@/lib/project-display";
import { cn } from "@/lib/utils";

export type CalendarGanttTask = {
  id: string;
  title: string;
  due_at: string | Date;
  created_at: string | Date;
  status: string;
  priority: string;
  provider: string | null;
  project_id: string;
  project_name: string;
  project_nickname: string | null;
};

const PRIORITY_BAR: Record<string, string> = {
  urgent: "bg-rose-500/85",
  high: "bg-orange-500/80",
  medium: "bg-amber-500/75",
  low: "bg-stone-400/80",
  none: "bg-primary/70",
};

function utcDayIndex(date: Date, monthStart: Date): number {
  return Math.floor((date.getTime() - monthStart.getTime()) / 86400000);
}

function barTone(priority: string, status: string): string {
  if (status === "done") return "bg-emerald-500/70";
  if (status === "blocked") return "bg-rose-600/80";
  return PRIORITY_BAR[priority] ?? PRIORITY_BAR.none!;
}

export function CalendarGantt({
  monthStart,
  days,
  tasks,
  today,
}: {
  monthStart: Date;
  days: number;
  tasks: CalendarGanttTask[];
  today: Date;
}) {
  const dayNumbers = Array.from({ length: days }, (_, index) => index + 1);
  const todayIndex =
    today.getUTCFullYear() === monthStart.getUTCFullYear() &&
    today.getUTCMonth() === monthStart.getUTCMonth()
      ? today.getUTCDate() - 1
      : -1;

  const groups = new Map<string, { label: string; tasks: CalendarGanttTask[] }>();
  for (const task of tasks) {
    const key = String(task.project_id);
    const existing = groups.get(key);
    if (existing) {
      existing.tasks.push(task);
    } else {
      groups.set(key, {
        label: projectDisplayName({
          name: task.project_name,
          nickname: task.project_nickname,
        }),
        tasks: [task],
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card" data-reveal-whole="">
      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
          <div
            className="grid border-b bg-background/50 text-xs font-medium text-muted"
            style={{ gridTemplateColumns: `14rem repeat(${days}, minmax(1.75rem, 1fr))` }}
          >
            <div className="sticky left-0 z-10 border-r bg-background/95 px-3 py-2 backdrop-blur">
              Task
            </div>
            {dayNumbers.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "border-r px-0.5 py-2 text-center last:border-r-0",
                  index === todayIndex && "bg-accent/50 text-foreground",
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {tasks.length === 0 ? (
            <p className="px-4 py-10 text-sm text-muted">No dated tasks to plot in this month.</p>
          ) : (
            <ul>
              {[...groups.values()].map((group) => (
                <li key={group.label} className="border-b last:border-b-0">
                  <div className="sticky left-0 z-10 border-b bg-accent/30 px-3 py-1.5 text-xs font-medium backdrop-blur">
                    {group.label}
                  </div>
                  <ul>
                    {group.tasks.map((task) => {
                      const created = new Date(task.created_at);
                      const due = new Date(task.due_at);
                      let startIndex = utcDayIndex(created, monthStart);
                      let endIndex = utcDayIndex(due, monthStart);
                      startIndex = Math.max(0, Math.min(days - 1, startIndex));
                      endIndex = Math.max(0, Math.min(days - 1, endIndex));
                      if (endIndex < startIndex) startIndex = endIndex;
                      const span = Math.max(1, endIndex - startIndex + 1);

                      return (
                        <li
                          key={String(task.id)}
                          className="grid items-center border-b border-border/60 last:border-b-0"
                          style={{
                            gridTemplateColumns: `14rem repeat(${days}, minmax(1.75rem, 1fr))`,
                          }}
                        >
                          <div className="sticky left-0 z-10 flex min-w-0 items-center gap-1.5 border-r bg-card/95 px-3 py-2 backdrop-blur">
                            <ProviderIcon provider={task.provider} className="shrink-0" />
                            <Link
                              href={`/tasks/${String(task.id)}`}
                              className="min-w-0 truncate text-sm font-medium hover:underline"
                              title={task.title}
                            >
                              {task.title}
                            </Link>
                          </div>
                          <div
                            className="relative col-span-full h-9"
                            style={{ gridColumn: `2 / span ${days}` }}
                          >
                            {/* Day grid lines */}
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-0 grid"
                              style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
                            >
                              {dayNumbers.map((day, index) => (
                                <div
                                  key={day}
                                  className={cn(
                                    "border-r border-border/40 last:border-r-0",
                                    index === todayIndex && "bg-accent/25",
                                  )}
                                />
                              ))}
                            </div>
                            {todayIndex >= 0 ? (
                              <div
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 w-px bg-foreground/50"
                                style={{ left: `${((todayIndex + 0.5) / days) * 100}%` }}
                              />
                            ) : null}
                            <Link
                              href={`/tasks/${String(task.id)}`}
                              title={`${task.title} · due ${due.toISOString().slice(0, 10)}`}
                              className={cn(
                                "absolute top-1/2 flex h-6 -translate-y-1/2 items-center truncate rounded-md px-2 text-[11px] font-medium text-white shadow-sm",
                                "transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                barTone(task.priority, task.status),
                              )}
                              style={{
                                left: `calc(${(startIndex / days) * 100}% + 2px)`,
                                width: `calc(${(span / days) * 100}% - 4px)`,
                              }}
                            >
                              <span className="truncate">{task.title}</span>
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 border-t px-3 py-2 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-500/85" /> Urgent
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-orange-500/80" /> High
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-amber-500/75" /> Medium
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-stone-400/80" /> Low
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-foreground/50" /> Today
        </span>
      </div>
    </div>
  );
}
