import * as React from "react";
import { cn } from "@/lib/utils";

/** Custom radio control — use instead of bare `<input type="radio">`. */
export function Radio({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="radio"
      className={cn(
        "size-4 shrink-0 appearance-none rounded-full border border-border bg-card shadow-sm transition",
        "checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_3px_var(--card)]",
        "hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
