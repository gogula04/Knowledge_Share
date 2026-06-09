import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-accent text-accent-fg shadow-glow hover:brightness-110 focus-visible:ring-accent/40",
  secondary:
    "bg-panel text-fg border border-border hover:bg-panel2 focus-visible:ring-accent/30",
  ghost: "bg-transparent text-fg hover:bg-white/5 focus-visible:ring-accent/30",
  outline: "bg-transparent text-fg border border-border hover:bg-white/5 focus-visible:ring-accent/30",
  danger: "bg-danger text-white shadow-glow hover:brightness-110 focus-visible:ring-danger/40"
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 rounded-xl px-3 text-xs",
  md: "h-10 rounded-xl px-4 text-sm",
  lg: "h-11 rounded-xl px-5 text-sm"
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
