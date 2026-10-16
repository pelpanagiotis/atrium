import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  CircleDot,
  CircleSlash,
  Flame,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Siren,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  open: { icon: Circle, className: "text-sky-500" },
  in_progress: { icon: CircleDot, className: "text-amber-500" },
  blocked: { icon: AlertTriangle, className: "text-rose-500" },
  done: { icon: CheckCircle2, className: "text-emerald-500" },
  cancelled: { icon: CircleSlash, className: "text-stone-400" },
};

const PRIORITY_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  attention: { icon: Siren, className: "text-rose-600" },
  urgent: { icon: Flame, className: "text-rose-600" },
  high: { icon: SignalHigh, className: "text-orange-500" },
  medium: { icon: SignalMedium, className: "text-amber-500" },
  low: { icon: SignalLow, className: "text-stone-400" },
};

export function StatusIcon({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_ICONS[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return <Icon className={cn("size-4 shrink-0", meta.className, className)} aria-hidden="true" />;
}

export function PriorityIcon({ priority, className }: { priority: string; className?: string }) {
  const meta = PRIORITY_ICONS[priority];
  if (!meta) return null;
  const Icon = meta.icon;
  return <Icon className={cn("size-4 shrink-0", meta.className, className)} aria-hidden="true" />;
}
