import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  neutral: "bg-accent text-foreground",
  open: "bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-200",
  in_progress: "bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200",
  blocked: "bg-rose-100 text-rose-900 dark:bg-rose-500/15 dark:text-rose-200",
  done: "bg-emerald-100 text-emerald-950 dark:bg-emerald-500/15 dark:text-emerald-200",
  cancelled: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  urgent: "bg-rose-100 text-rose-950 dark:bg-rose-500/15 dark:text-rose-200",
  high: "bg-orange-200 text-orange-950 dark:bg-orange-500/15 dark:text-orange-200",
  medium: "bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200",
  low: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  none: "bg-stone-100 text-stone-600 dark:bg-stone-500/15 dark:text-stone-300",
  native: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/30",
  external: "bg-sky-50 text-sky-950 ring-1 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:ring-sky-500/30",
  pending: "bg-amber-50 text-amber-950 dark:bg-amber-500/10 dark:text-amber-200",
  synced: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  error: "bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200",
  tombstone: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  connected: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
  revoked: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  project: "bg-teal-50 text-teal-950 ring-1 ring-teal-200 dark:bg-teal-500/10 dark:text-teal-200 dark:ring-teal-500/30",
  due: "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
