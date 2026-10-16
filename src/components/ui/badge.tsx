import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  neutral: "bg-accent text-foreground",
  open: "bg-sky-100 text-sky-900",
  in_progress: "bg-amber-100 text-amber-950",
  blocked: "bg-rose-100 text-rose-900",
  done: "bg-emerald-100 text-emerald-950",
  cancelled: "bg-stone-200 text-stone-700",
  urgent: "bg-rose-700 text-white",
  high: "bg-orange-200 text-orange-950",
  medium: "bg-amber-100 text-amber-950",
  low: "bg-stone-200 text-stone-700",
  none: "bg-stone-100 text-stone-600",
  native: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200",
  external: "bg-sky-50 text-sky-950 ring-1 ring-sky-200",
  pending: "bg-amber-50 text-amber-950",
  synced: "bg-emerald-50 text-emerald-900",
  error: "bg-rose-50 text-rose-900",
  tombstone: "bg-stone-200 text-stone-700",
  connected: "bg-emerald-50 text-emerald-900",
  revoked: "bg-stone-200 text-stone-700",
  project: "bg-teal-50 text-teal-950 ring-1 ring-teal-200",
  due: "bg-indigo-50 text-indigo-950 ring-1 ring-indigo-200",
};

export function Badge({ tone = "neutral", children }: { tone?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", tones[tone] ?? tones.neutral)}>
      {children}
    </span>
  );
}
