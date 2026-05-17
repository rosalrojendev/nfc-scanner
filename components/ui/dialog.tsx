"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  // "sheet" (default) docks to the bottom on mobile, centers on desktop —
  // the right pattern for forms with multiple inputs. "center" centers on
  // every viewport — better for short confirmation dialogs.
  placement?: "sheet" | "center";
}

export function Dialog({
  open,
  onClose,
  children,
  ariaLabel = "Dialog",
  className,
  placement = "sheet",
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

  const centered = placement === "center";

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={cn(
        "fixed inset-0 z-[60] flex justify-center",
        centered ? "items-center p-4" : "items-end sm:items-center",
      )}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative w-full sm:max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-lg)] p-5 grid gap-4",
          centered
            ? "max-w-md rounded-[20px]"
            : "rounded-t-[24px] sm:rounded-[20px]",
          "animate-[toastIn_220ms_ease-out]",
          className,
        )}
        style={
          centered
            ? undefined
            : { paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }
        }
      >
        {centered ? null : (
          <div className="w-14 h-1.5 bg-[color-mix(in_srgb,var(--color-text)_14%,transparent)] rounded-full justify-self-center sm:hidden" />
        )}
        {children}
      </div>
    </div>
  );

  // Portal to <body> so the dialog escapes any ancestor that creates a
  // containing block for fixed children (transforms, backdrop-filter, etc.).
  // Component is "use client" + only renders when `open`, so `document` is
  // always defined by the time we hit createPortal.
  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
