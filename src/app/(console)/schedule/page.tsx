import { Suspense } from "react";
import Link from "next/link";
import { ScreenLoader } from "@/components/screen-loader";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { CalendarGantt, type CalendarGanttTask } from "@/components/calendar-gantt";
import { CalendarMonthNav } from "@/components/calendar-month-nav";
import { CalendarViewToggle } from "@/components/calendar-view-toggle";
import { ProviderIcon } from "@/components/provider-icon";
import { parseCalendarView, toMonthKey } from "@/lib/calendar-month";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { calendarTasks } from "@/server/home/service";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/client";

export const instant = false;

function parseMonthParam(monthParam: string | undefined): Date {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return new Date();
  }
  const [year, month] = monthParam.split("-").map(Number);
  const anchor = new Date(Date.UTC(year!, (month ?? 1) - 1, 1));
  if (Number.isNaN(anchor.getTime())) return new Date();
  return anchor;
}

export default function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  return (
    <Suspense fallback={<ScreenLoader />}>
      <ScheduleContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ScheduleContent({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const prefs = await withUser(user.id, (tx) =>
    tx.execute<{ timezone: string }>(sql`
      select timezone from user_preferences where user_id = current_setting('app.current_user_id', true)
    `),
  );
  const timeZone = prefs[0]?.timezone ?? "UTC";
  const params = await searchParams;
  const view = parseCalendarView(params.view);
  const anchor = parseMonthParam(params.month);
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  const monthKey = toMonthKey(start);
  const todayKey = toMonthKey(new Date());
  const today = new Date();
  const taskRows = await calendarTasks(user.id, current.id, start.toISOString(), end.toISOString());
  const tasks: CalendarGanttTask[] = taskRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    due_at: row.due_at as string | Date,
    created_at: row.created_at as string | Date,
    status: String(row.status),
    priority: String(row.priority),
    provider: (row.provider as string | null) ?? null,
    project_id: String(row.project_id),
    project_name: String(row.project_name),
    project_nickname: (row.project_nickname as string | null) ?? null,
  }));
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  const label = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(start);
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const startWeekday = (start.getUTCDay() + 6) % 7;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl">Schedule</h1>
          <p className="text-sm text-muted">
            Month calendar and timeline for dated work in {timeZone}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarViewToggle monthKey={monthKey} todayKey={todayKey} view={view} />
          <CalendarMonthNav monthKey={monthKey} label={label} view={view} />
        </div>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-muted">
          Nothing is due in {label}.
        </p>
      ) : null}

      {view === "timeline" ? (
        <CalendarGantt monthStart={start} days={days} tasks={tasks} today={today} />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card" data-reveal-whole="">
          <div className="grid grid-cols-7 border-b text-center text-xs font-medium text-muted">
            {weekdayLabels.map((day) => (
              <div key={day} className="px-2 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: startWeekday }, (_, index) => (
              <div key={`pad-${index}`} className="min-h-28 border-b border-r bg-background/40 last:border-r-0" />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const day = new Date(start.getTime() + index * 86400000);
              const isToday =
                monthKey === todayKey &&
                day.getUTCFullYear() === today.getUTCFullYear() &&
                day.getUTCMonth() === today.getUTCMonth() &&
                day.getUTCDate() === today.getUTCDate();
              const due = tasks.filter((task) => {
                const value = new Date(task.due_at);
                return (
                  value.getUTCFullYear() === day.getUTCFullYear() &&
                  value.getUTCMonth() === day.getUTCMonth() &&
                  value.getUTCDate() === day.getUTCDate()
                );
              });
              const col = (startWeekday + index) % 7;
              return (
                <section
                  key={day.toISOString()}
                  className={cn(
                    "min-h-28 border-b p-2",
                    col < 6 && "border-r",
                    isToday && "bg-accent/35",
                  )}
                >
                  <p
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs",
                      isToday ? "bg-foreground font-medium text-background" : "text-muted",
                    )}
                  >
                    {day.getUTCDate()}
                  </p>
                  <ul className="mt-1 space-y-1">
                    {due.map((task) => (
                      <li key={String(task.id)} className="text-xs">
                        <Link
                          href={`/tasks/${String(task.id)}`}
                          className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                        >
                          <span className="line-clamp-2">{String(task.title)}</span>
                          <ProviderIcon provider={task.provider} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
