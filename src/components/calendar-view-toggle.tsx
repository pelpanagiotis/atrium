import Link from "next/link";
import { CalendarDays, GanttChart } from "lucide-react";
import { calendarMonthHref, type CalendarView } from "@/lib/calendar-month";
import { cn } from "@/lib/utils";

export function CalendarViewToggle({
  monthKey,
  todayKey,
  view,
}: {
  monthKey: string;
  todayKey: string;
  view: CalendarView;
}) {
  return (
    <nav
      className="flex items-center gap-1 rounded-md border bg-card p-0.5 text-sm"
      aria-label="Schedule views"
    >
      {(
        [
          { value: "month" as const, label: "Month", icon: CalendarDays },
          { value: "timeline" as const, label: "Timeline", icon: GanttChart },
        ] as const
      ).map(({ value, label, icon: Icon }) => {
        const active = view === value;
        return (
          <Link
            key={value}
            href={calendarMonthHref(monthKey, todayKey, value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 transition",
              active
                ? "bg-foreground text-background"
                : "text-muted hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
