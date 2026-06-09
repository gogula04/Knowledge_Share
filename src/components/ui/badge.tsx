import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "muted" | "success" | "warning" | "danger" }) {
  const tones = {
    default: "bg-accent/12 text-accent border-accent/20",
    muted: "bg-white/5 text-muted-foreground border-border",
    success: "bg-success/12 text-success border-success/20",
    warning: "bg-warning/12 text-warning border-warning/20",
    danger: "bg-danger/12 text-danger border-danger/20"
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

