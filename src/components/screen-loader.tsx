import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScreenLoader({
  label = "Loading",
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
      data-no-reveal=""
      className={cn(
        "flex min-h-dvh w-full flex-1 flex-col items-center justify-center gap-3",
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-foreground/70" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
