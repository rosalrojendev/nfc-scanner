"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/avatar";
import { inspectorByName, useSettings } from "@/lib/settings-store";
import { cn } from "@/lib/utils";

interface InspectorTagProps {
  name: string | null | undefined;
  size?: number;
  className?: string;
  showName?: boolean;
  /**
   * When true, renders just the avatar with no inline gap. Use when you only
   * want the photo (e.g. to overlay onto a metadata row).
   */
  iconOnly?: boolean;
}

export function InspectorTag({
  name,
  size = 20,
  className,
  showName = true,
  iconOnly = false,
}: InspectorTagProps) {
  const settings = useSettings();
  if (!name) return null;
  const insp = inspectorByName(name, settings);

  if (iconOnly) {
    return <Avatar name={name} src={insp?.avatar} size={size} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 align-middle",
        className,
      )}
    >
      <Avatar name={name} src={insp?.avatar} size={size} />
      {showName ? (
        <strong className="text-[var(--color-text)] font-semibold">
          {name}
        </strong>
      ) : null}
    </span>
  );
}
