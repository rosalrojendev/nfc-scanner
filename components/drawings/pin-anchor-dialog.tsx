"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { pinAnchor } from "@/lib/drawings-store";
import { useAnchors } from "@/lib/store";
import type {
  Anchor,
  AnchorStatus,
  Drawing,
  DrawingPin,
} from "@/lib/types";
import { Anchor as AnchorIcon, Check, MousePointerClick } from "lucide-react";

const PIN_REF_W = 760;
const PIN_REF_H = 420;

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
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setChosen(null);
      setShowAll(false);
    }
  }, [open]);

  // Default to anchors that belong to the same project as this drawing. If
  // the drawing has no projectId (legacy/imported data), fall back to the
  // full list so we don't accidentally show an empty roster.
  const projectScoped = React.useMemo(() => {
    if (!drawing.projectId) return anchors;
    return anchors.filter((a) => a.projectId === drawing.projectId);
  }, [anchors, drawing.projectId]);

  const visible = showAll ? anchors : projectScoped;
  const otherProjectCount = anchors.length - projectScoped.length;

  // Anchors that aren't already pinned on this drawing first
  const sorted = React.useMemo(() => {
    const pinnedIds = new Set(drawing.anchors.map((a) => a.id));
    return visible
      .slice()
      .sort((a, b) => {
        const ap = pinnedIds.has(a.id) ? 1 : 0;
        const bp = pinnedIds.has(b.id) ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.id.localeCompare(b.id);
      });
  }, [visible, drawing.anchors]);

  function place(coords: { x: number; y: number }) {
    if (!chosen) return;
    const anchor = anchors.find((a) => a.id === chosen);
    if (!anchor) return;
    pinAnchor(drawing.id, {
      id: anchor.id,
      x: coords.x,
      y: coords.y,
      status: anchor.status,
    });
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
          {drawing.projectId && otherProjectCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span>
                Showing <strong>{projectScoped.length}</strong> anchor
                {projectScoped.length === 1 ? "" : "s"} from this project
                {showAll
                  ? ` · ${otherProjectCount} from other projects`
                  : null}
                .
              </span>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="font-semibold text-[var(--color-primary)] hover:underline"
              >
                {showAll
                  ? "Show only this project"
                  : `Show all (${anchors.length})`}
              </button>
            </div>
          ) : null}
          <div className="grid gap-2 max-h-[50vh] overflow-auto -mx-1 px-1">
            {sorted.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                No anchors found in this project yet. Add one from the Anchors
                page, or pick from another project.
              </p>
            ) : (
              sorted.map((a) => (
                <RosterRow
                  key={a.id}
                  anchor={a}
                  pinned={drawing.anchors.some((p) => p.id === a.id)}
                  foreignProject={
                    !!drawing.projectId &&
                    a.projectId !== drawing.projectId
                  }
                  onPick={() => setChosen(a.id)}
                />
              ))
            )}
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
  foreignProject,
  onPick,
}: {
  anchor: Anchor;
  pinned: boolean;
  foreignProject: boolean;
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
      {foreignProject ? (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--color-text-muted) 14%, transparent)",
            color: "var(--color-text-muted)",
          }}
        >
          Other project
        </span>
      ) : null}
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
  onPlace: (coords: { x: number; y: number }) => void;
}) {
  const planAttachment = (drawing.attachments ?? []).find(
    (a) => a.kind === "plan",
  );
  const imagePlanUrl =
    planAttachment &&
    !planAttachment.contentType?.includes("pdf") &&
    !planAttachment.url.toLowerCase().endsWith(".pdf")
      ? planAttachment.url
      : null;

  function pickFromRect(rect: DOMRect, clientX: number, clientY: number) {
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    onPlace({
      x: Math.round(px * PIN_REF_W),
      y: Math.round(py * PIN_REF_H),
    });
  }

  return (
    <>
      <p className="text-sm text-[var(--color-text-muted)] inline-flex items-center gap-1.5">
        <MousePointerClick size={14} /> Step 2 — tap anywhere on the plan to
        drop the {anchorId} pin.
      </p>
      {imagePlanUrl ? (
        <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)] relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePlanUrl}
            alt="Plan"
            draggable={false}
            className="w-full h-auto block cursor-crosshair select-none"
            onClick={(e) =>
              pickFromRect(
                e.currentTarget.getBoundingClientRect(),
                e.clientX,
                e.clientY,
              )
            }
          />
          {drawing.anchors.map((p) => (
            <PinPreview key={p.id} pin={p} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
          <svg
            viewBox={`0 0 ${PIN_REF_W} ${PIN_REF_H}`}
            className="w-full h-auto cursor-crosshair"
            onClick={(e) =>
              pickFromRect(
                e.currentTarget.getBoundingClientRect(),
                e.clientX,
                e.clientY,
              )
            }
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
      )}
      <Button onClick={onCancel}>Pick a different anchor</Button>
    </>
  );
}

function PinPreview({ pin }: { pin: DrawingPin }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: `${(pin.x / PIN_REF_W) * 100}%`,
        top: `${(pin.y / PIN_REF_H) * 100}%`,
      }}
    >
      <span
        className="block w-3 h-3 rounded-full"
        style={{ background: STATUS_COLOR[pin.status], opacity: 0.85 }}
      />
    </span>
  );
}
