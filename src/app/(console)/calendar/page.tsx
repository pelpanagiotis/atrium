import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getSessionUser } from "@/server/auth/session";
import { workspaceContext } from "@/server/auth/workspace";
import { calendarTasks } from "@/server/home/service";
import { sql } from "drizzle-orm";
import { withUser } from "@/server/db/client";

export const instant = false;

export default function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading the calendar…</p>}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CalendarContent({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { current } = await workspaceContext(user.id);
  const prefs = await withUser(user.id, (tx) => tx.execute<{ timezone: string }>(sql`
    select timezone from user_preferences where user_id = current_setting('app.current_user_id', true)
  `));
  const timeZone = prefs[0]?.timezone ?? "UTC";
  const monthParam = (await searchParams).month;
  const anchor = monthParam ? new Date(`${monthParam}-01T00:00:00Z`) : new Date();
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  const end = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
  const tasks = await calendarTasks(user.id, current.id, start.toISOString(), end.toISOString());
  const days = Math.round((end.getTime() - start.getTime()) / 86400000);
  const label = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone }).format(start);
  return (
    <div className="space-y-4">
      <h1 className="text-4xl">Calendar</h1>
      <p className="text-sm text-muted">{label} in {timeZone}. Only tasks with a deadline appear.</p>
      {tasks.length === 0 ? <p className="rounded-lg border border-dashed bg-card p-8 text-sm text-muted">Nothing is due this month.</p> : null}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
        {Array.from({ length: days }, (_, index) => {
          const day = new Date(start.getTime() + index * 86400000);
          const due = tasks.filter((task) => {
            const value = new Date(task.due_at as string);
            return value.getUTCFullYear() === day.getUTCFullYear() && value.getUTCMonth() === day.getUTCMonth() && value.getUTCDate() === day.getUTCDate();
          });
          return (
            <section key={day.toISOString()} className="min-h-28 rounded-md border bg-card p-2">
              <p className="text-xs text-muted">{day.getUTCDate()}</p>
              <ul className="mt-1 space-y-1">
                {due.map((task) => (
                  <li key={String(task.id)} className="text-xs">
                    <span className="font-medium">{String(task.title)}</span>
                    <Badge tone={task.provider ? "external" : "native"}>{task.provider ? String(task.provider) : "native"}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
