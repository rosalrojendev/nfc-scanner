"use client";

import * as React from "react";
import type { Role } from "@/lib/types";
import { ROLE_META } from "@/lib/role-meta";
import { Avatar } from "@/components/ui/avatar";
import { useSettings, inspectorByName } from "@/lib/settings-store";
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
  const settings = useSettings();
  if (!name) return null;

  const meta = role ? ROLE_META[role] : null;
  const RoleIcon = meta?.icon;
  const insp = inspectorByName(name, settings);

  return (
    <p
      className={cn(
        "text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1.5 flex-wrap",
        className,
      )}
    >
      <span>{prefix}</span>
      <span
        className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full font-bold"
        style={{
          background: meta?.accentHighlight ?? "var(--color-surface-2)",
          color: meta?.accent ?? "var(--color-text)",
        }}
      >
        <span className="relative inline-flex">
          <Avatar name={name} src={insp?.avatar} size={20} />
          {RoleIcon ? (
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full"
              style={{
                background: meta!.accent,
                color: "var(--color-text-inverse)",
                boxShadow:
                  "0 0 0 1.5px var(--color-surface)",
              }}
            >
              <RoleIcon size={8} />
            </span>
          ) : null}
        </span>
        <span className="text-[var(--color-text)]">{name}</span>
      </span>
      {role ? (
        <span className="text-[var(--color-text-muted)]">· {role}</span>
      ) : null}
    </p>
  );
}
