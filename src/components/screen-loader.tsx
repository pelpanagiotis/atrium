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
      className={cn("flex min-h-[50vh] w-full flex-col items-center justify-center gap-3", className)}
    >
      <Loader2 className="size-8 animate-spin text-foreground/70" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
