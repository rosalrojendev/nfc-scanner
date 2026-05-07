"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SearchFieldProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value: string;
  onValueChange: (value: string) => void;
  containerClassName?: string;
}

export function SearchField({
  value,
  onValueChange,
  containerClassName,
  className,
  placeholder = "Search…",
  ...rest
}: SearchFieldProps) {
  const showClear = value.length > 0;
  return (
    <div className={cn("relative", containerClassName)}>
      <span
        aria-hidden
        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-full pointer-events-none"
        style={{
          background: "var(--color-primary)",
          color: "var(--color-text-inverse)",
          boxShadow:
            "0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent)",
        }}
      >
        <Search size={18} strokeWidth={2.6} />
      </span>
      <Input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn("pl-14 pr-11", className)}
        {...rest}
      />
      {showClear ? (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
