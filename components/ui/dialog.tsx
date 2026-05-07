"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  ariaLabel = "Dialog",
  className,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative w-full sm:max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] rounded-t-[24px] sm:rounded-[20px] p-5 grid gap-4",
          "animate-[toastIn_220ms_ease-out]",
          className,
        )}
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <div className="w-14 h-1.5 bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)] rounded-full justify-self-center sm:hidden" />
        {children}
      </div>
    </div>
  );
}
