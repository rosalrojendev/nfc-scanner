import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "py-10 px-4 rounded-[1.2rem] border border-dashed border-[color-mix(in_srgb,var(--color-text)_18%,transparent)] bg-[var(--color-surface)] grid gap-3 justify-items-center text-center",
        className,
      )}
    >
      {icon}
      <h3 className="font-semibold text-lg tracking-tight">{title}</h3>
      {description ? (
        <p className="text-[var(--color-text-muted)] text-sm max-w-sm">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
