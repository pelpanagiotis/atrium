import type { LucideIcon } from "lucide-react";
import { ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyResults({
  title,
  description,
  icon: Icon = ListFilter,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[min(28rem,calc(100dvh-16rem))] w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-card p-8 text-center",
        className,
      )}
    >
      <div className="inline-flex size-14 items-center justify-center rounded-full border bg-background text-muted">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl">{title}</h2>
        <p className="mx-auto max-w-md text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
