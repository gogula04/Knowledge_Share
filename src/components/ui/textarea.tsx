import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-xl border border-border bg-panel/80 px-3 py-2 text-sm text-fg shadow-sm outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20 placeholder:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

