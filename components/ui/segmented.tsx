"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
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
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 basis-0 min-w-0 h-[44px] px-3 rounded-full text-sm font-bold transition-colors duration-200 inline-flex items-center justify-center gap-1.5 overflow-hidden",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-md)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]",
            )}
          >
            {Icon ? <Icon size={16} aria-hidden /> : null}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
