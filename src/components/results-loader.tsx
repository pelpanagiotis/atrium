import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ResultsLoader({
  label = "Loading results",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "flex min-h-[min(28rem,calc(100dvh-16rem))] w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/60",
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-foreground/70" aria-hidden="true" />
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
