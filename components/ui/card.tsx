import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.2rem] p-4 shadow-[var(--shadow-sm)] grid gap-3",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-start justify-between gap-3", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const Eyebrow = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "text-[0.72rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)]",
      className,
    )}
    {...props}
  />
);
