"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";

interface PhotoLightboxProps {
  photos: string[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
  ariaLabel?: string;
}

// Full-screen modal viewer for inspection photos.
// - Keyboard nav (←, →, Escape)
// - Touch swipe (horizontal)
// - Tap backdrop to close
// - "Open in new tab" affordance preserved as a corner icon
// - Counter ("3 / 7") when there's more than one photo
// Rendered through a body-level portal so it always lives above app chrome,
// regardless of any backdrop-filter / transform containing blocks higher in
// the tree.
export function PhotoLightbox({
  photos,
  startIndex,
  open,
  onClose,
  ariaLabel = "Photo viewer",
}: PhotoLightboxProps) {
  const [idx, setIdx] = React.useState(startIndex);
  const len = photos.length;

  // Sync the cursor whenever the consumer opens the viewer at a new index.
  React.useEffect(() => {
    if (open) setIdx(Math.min(Math.max(startIndex, 0), Math.max(len - 1, 0)));
  }, [open, startIndex, len]);

  const next = React.useCallback(() => {
    if (len <= 1) return;
    setIdx((i) => (i + 1) % len);
  }, [len]);
  const prev = React.useCallback(() => {
    if (len <= 1) return;
    setIdx((i) => (i - 1 + len) % len);
  }, [len]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, next, prev]);

  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    touchStartX.current = t?.screenX ?? null;
    touchStartY.current = t?.screenY ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0];
    if (
      !t ||
      touchStartX.current === null ||
      touchStartY.current === null
    )
      return;
    const dx = t.screenX - touchStartX.current;
    const dy = t.screenY - touchStartY.current;
    // Only treat as swipe if horizontal movement dominates — avoids
    // misreading a vertical pinch-zoom or scroll gesture.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  if (!open || len === 0) return null;
  const url = photos[idx];
  if (!url) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[100] bg-black/90 grid place-items-center select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Backdrop click-to-close. Placed before the image so the image
          captures clicks (preventing accidental close on tap-the-photo). */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute inset-0 cursor-zoom-out"
      />

      <img
        src={url}
        alt={`Photo ${idx + 1} of ${len}`}
        className="relative max-w-[95vw] max-h-[80vh] object-contain"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Top chrome */}
      <div
        className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-3 pointer-events-none"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 grid place-items-center backdrop-blur transition"
        >
          <X size={20} />
        </button>
        {len > 1 ? (
          <span
            className="pointer-events-auto text-white/90 text-sm font-semibold bg-black/40 px-3 py-1.5 rounded-full backdrop-blur"
            aria-live="polite"
          >
            {idx + 1} / {len}
          </span>
        ) : (
          <span aria-hidden />
        )}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open photo in a new tab"
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 grid place-items-center backdrop-blur transition"
        >
          <ExternalLink size={18} />
        </a>
      </div>

      {len > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-11 h-11 grid place-items-center backdrop-blur transition"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next photo"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-11 h-11 grid place-items-center backdrop-blur transition"
          >
            <ChevronRight size={24} />
          </button>
        </>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return content;
  return createPortal(content, document.body);
}
