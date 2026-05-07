"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { pinAnchor } from "@/lib/drawings-store";
import { useAnchors } from "@/lib/store";
import type { Anchor, AnchorStatus, Drawing } from "@/lib/types";
import { Anchor as AnchorIcon, Check, MousePointerClick } from "lucide-react";

interface PinAnchorDialogProps {
  drawing: Drawing;
  open: boolean;
  onClose: () => void;
}

const STATUS_COLOR: Record<AnchorStatus, string> = {
  pass: "var(--color-success)",
  due: "var(--color-warning)",
  failed: "var(--color-error)",
};

export function PinAnchorDialog({
  drawing,
  open,
  onClose,
}: PinAnchorDialogProps) {
  const { notify } = useToast();
  const anchors = useAnchors();
  const [chosen, setChosen] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) setChosen(null);
  }, [open]);

  // Anchors that aren't already pinned on this drawing first
  const sorted = React.useMemo(() => {
    const pinnedIds = new Set(drawing.anchors.map((a) => a.id));
    return anchors
      .slice()
      .sort((a, b) => {
        const ap = pinnedIds.has(a.id) ? 1 : 0;
        const bp = pinnedIds.has(b.id) ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.id.localeCompare(b.id);
      });
  }, [anchors, drawing.anchors]);

  function place(svg: SVGSVGElement, e: React.MouseEvent) {
    if (!chosen) return;
    const anchor = anchors.find((a) => a.id === chosen);
    if (!anchor) return;
    const rect = svg.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const x = Math.round(px * 760);
    const y = Math.round(py * 420);
    pinAnchor(drawing.id, { id: anchor.id, x, y, status: anchor.status });
    notify(`${anchor.id} pinned.`, "success");
    setChosen(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Pin anchor on drawing">
      <Eyebrow>Pin anchor</Eyebrow>
      <h3 className="text-lg font-semibold tracking-tight">
        {drawing.building} · {drawing.level}
      </h3>
      {!chosen ? (
        <>
          <p className="text-sm text-[var(--color-text-muted)]">
            Step 1 — pick an anchor to pin on this drawing.
          </p>
          <div className="grid gap-2 max-h-[50vh] overflow-auto -mx-1 px-1">
            {sorted.map((a) => (
              <RosterRow
                key={a.id}
                anchor={a}
                pinned={drawing.anchors.some((p) => p.id === a.id)}
                onPick={() => setChosen(a.id)}
              />
            ))}
          </div>
        </>
      ) : (
        <PlaceStep
          anchorId={chosen}
          drawing={drawing}
          onCancel={() => setChosen(null)}
          onPlace={place}
        />
      )}
      <div className="flex justify-end">
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </Dialog>
  );
}

function RosterRow({
  anchor,
  pinned,
  onPick,
}: {
  anchor: Anchor;
  pinned: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-left hover:-translate-y-0.5 transition-transform"
    >
      <span
        className="w-9 h-9 rounded-full grid place-items-center"
        style={{
          background: STATUS_COLOR[anchor.status],
          color: "var(--color-text-inverse)",
        }}
        aria-hidden
      >
        <AnchorIcon size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <strong className="block truncate">{anchor.label}</strong>
        <span className="text-xs text-[var(--color-text-muted)]">
          {anchor.building}
        </span>
      </div>
      {pinned ? (
        <span
          className="text-xs font-bold inline-flex items-center gap-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Check size={12} /> Already pinned
        </span>
      ) : null}
    </button>
  );
}

function PlaceStep({
  anchorId,
  drawing,
  onCancel,
  onPlace,
}: {
  anchorId: string;
  drawing: Drawing;
  onCancel: () => void;
  onPlace: (svg: SVGSVGElement, e: React.MouseEvent) => void;
}) {
  return (
    <>
      <p className="text-sm text-[var(--color-text-muted)] inline-flex items-center gap-1.5">
        <MousePointerClick size={14} /> Step 2 — tap anywhere on the plan to
        drop the {anchorId} pin.
      </p>
      <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
        <svg
          viewBox="0 0 760 420"
          className="w-full h-auto cursor-crosshair"
          onClick={(e) => {
            const target = e.currentTarget;
            onPlace(target, e);
          }}
        >
          <rect
            x="30"
            y="30"
            width="700"
            height="360"
            rx="22"
            fill="none"
            stroke="currentColor"
            opacity="0.18"
            strokeWidth="2"
          />
          {drawing.anchors.map((p) => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r="10"
              fill={STATUS_COLOR[p.status]}
              opacity="0.6"
            />
          ))}
        </svg>
      </div>
      <Button onClick={onCancel}>Pick a different anchor</Button>
    </>
  );
}
