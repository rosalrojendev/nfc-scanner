import * as React from "react";
import type { Role } from "@/lib/types";
import { ROLE_META } from "@/lib/role-meta";
import { cn } from "@/lib/utils";

interface SubmittedByChipProps {
  name?: string | null;
  role?: Role | null;
  className?: string;
  prefix?: string;
}

export function SubmittedByChip({
  name,
  role,
  className,
  prefix = "Submitted by",
}: SubmittedByChipProps) {
  if (!name) return null;
  const meta = role ? ROLE_META[role] : null;
  const Icon = meta?.icon;
  return (
    <p
      className={cn(
        "text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1.5 flex-wrap",
        className,
      )}
    >
      <span>{prefix}</span>
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold"
        style={{
          background: meta?.accentHighlight ?? "var(--color-surface-2)",
          color: meta?.accent ?? "var(--color-text)",
        }}
      >
        {Icon ? <Icon size={12} aria-hidden /> : null}
        <span className="text-[var(--color-text)]">{name}</span>
      </span>
      {role ? (
        <span className="text-[var(--color-text-muted)]">· {role}</span>
      ) : null}
    </p>
  );
}
