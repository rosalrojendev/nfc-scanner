"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-1 p-1 rounded-full bg-[var(--color-surface-offset)] border border-[var(--color-border)]",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 min-h-[44px] px-3 rounded-full text-sm font-bold transition-all duration-200 will-change-transform",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-md)] ring-2 ring-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] ring-offset-2 ring-offset-[var(--color-surface)] scale-[1.02]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
