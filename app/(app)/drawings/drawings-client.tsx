"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAnchors } from "@/lib/store";
import {
  addAttachment,
  removeAttachment,
  unpinAnchor,
  useDrawings,
} from "@/lib/drawings-store";
import type {
  AnchorStatus,
  Drawing,
  DrawingAttachment,
  DrawingPin,
} from "@/lib/types";
import {
  Plus,
  FileUp,
  ImagePlus,
  FileText,
  ExternalLink,
  Trash2,
  Loader2,
  Paperclip,
  X,
} from "lucide-react";

const PIN_REF_W = 760;
const PIN_REF_H = 420;
import { useSession } from "@/components/shell/session-provider";
import { useProjectContext } from "@/components/shell/project-provider";
import { can } from "@/lib/permissions";
import { UploadDrawingDialog } from "@/components/drawings/upload-drawing-dialog";
import { PinAnchorDialog } from "@/components/drawings/pin-anchor-dialog";
import { formatDate } from "@/lib/utils";

const statusColor: Record<AnchorStatus, string> = {
  pass: "var(--color-success)",
  due: "var(--color-warning)",
  failed: "var(--color-error)",
};

const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

export function DrawingsClient() {
  const router = useRouter();
  const anchors = useAnchors();
  const session = useSession();
  const { currentProjectId } = useProjectContext();
  const canUpload = can.uploadDrawings(session.role);
  const { notify } = useToast();
  const allDrawings = useDrawings();
  const drawings = React.useMemo(
    () =>
      currentProjectId
        ? allDrawings.filter(
            (d) => !d.projectId || d.projectId === currentProjectId,
          )
        : allDrawings,
    [allDrawings, currentProjectId],
  );

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [pinDrawing, setPinDrawing] = React.useState<Drawing | null>(null);
  const [busyAttachOn, setBusyAttachOn] = React.useState<string | null>(null);

  // Reflect live anchor status into pin colors.
  const drawingsWithLiveStatus = React.useMemo(() => {
    return drawings.map((d) => ({
      ...d,
      anchors: d.anchors.map((pin) => {
        const live = anchors.find((a) => a.id === pin.id);
        return live ? { ...pin, status: live.status } : pin;
      }),
    }));
  }, [drawings, anchors]);

  async function handleAttachment(
    drawingId: string,
    file: File,
    kind: "detail" | "pdf",
  ) {
    if (kind === "pdf" && !file.type.includes("pdf")) {
      notify("Pick a PDF file.", "error");
      return;
    }
    if (kind === "detail" && !file.type.startsWith("image/")) {
      notify("Detail sheet must be an image.", "error");
      return;
    }
    if (file.size > ATTACHMENT_MAX_BYTES) {
      notify("File must be 5 MB or smaller.", "error");
      return;
    }
    setBusyAttachOn(drawingId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/photos", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Upload failed (${res.status})`);
      }
      const j = (await res.json()) as { url: string; contentType?: string };
      addAttachment(drawingId, {
        kind,
        label:
          kind === "pdf"
            ? "PDF"
            : file.name.replace(/\.[^.]+$/, "").slice(0, 32) || "Detail",
        url: j.url,
        contentType: j.contentType ?? file.type,
      });
      notify(
        kind === "pdf" ? "PDF attached." : "Detail sheet added.",
        "success",
      );
    } catch (e) {
      notify(e instanceof Error ? e.message : "Upload failed.", "error");
    } finally {
      setBusyAttachOn(null);
    }
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Drawing library</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              Roof plans linked to buildings and anchors
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {drawings.length} drawings ·{" "}
              {drawingsWithLiveStatus.reduce(
                (n, d) => n + d.anchors.length,
                0,
              )}{" "}
              anchors pinned
            </p>
          </div>
          {canUpload ? (
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <FileUp size={16} /> Upload plan
            </Button>
          ) : null}
        </div>
      </Card>

      {drawingsWithLiveStatus.map((d) => (
        <DrawingCard
          key={d.id}
          drawing={d}
          canUpload={canUpload}
          onPin={() => setPinDrawing(d)}
          onUnpin={(anchorId) => {
            unpinAnchor(d.id, anchorId);
            notify(`${anchorId} unpinned.`);
          }}
          busyAttach={busyAttachOn === d.id}
          onAttachDetail={(file) => handleAttachment(d.id, file, "detail")}
          onAttachPdf={(file) => handleAttachment(d.id, file, "pdf")}
          onRemoveAttachment={(attId) => {
            if (!confirm("Remove this attachment?")) return;
            removeAttachment(d.id, attId);
            notify("Attachment removed.");
          }}
          onOpenAnchor={(id) =>
            router.push(`/anchors/${encodeURIComponent(id)}`)
          }
        />
      ))}

      {canUpload ? (
        <>
          <UploadDrawingDialog
            open={uploadOpen}
            onClose={() => setUploadOpen(false)}
          />
          {pinDrawing ? (
            <PinAnchorDialog
              drawing={pinDrawing}
              open={!!pinDrawing}
              onClose={() => setPinDrawing(null)}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

function DrawingCard({
  drawing: d,
  canUpload,
  onPin,
  onUnpin,
  busyAttach,
  onAttachDetail,
  onAttachPdf,
  onRemoveAttachment,
  onOpenAnchor,
}: {
  drawing: Drawing;
  canUpload: boolean;
  onPin: () => void;
  onUnpin: (anchorId: string) => void;
  busyAttach: boolean;
  onAttachDetail: (file: File) => void;
  onAttachPdf: (file: File) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onOpenAnchor: (id: string) => void;
}) {
  const detailRef = React.useRef<HTMLInputElement | null>(null);
  const pdfRef = React.useRef<HTMLInputElement | null>(null);
  const planAttachment = (d.attachments ?? []).find((a) => a.kind === "plan");
  const otherAttachments = (d.attachments ?? []).filter(
    (a) => a.kind !== "plan",
  );

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <strong>
            {d.building} · {d.level}
          </strong>
          <p className="text-sm text-[var(--color-text-muted)]">
            {d.anchors.length} anchors pinned
            {(d.attachments?.length ?? 0) > 0
              ? ` · ${d.attachments?.length} attachments`
              : ""}
            {d.custom ? " · custom" : ""}
          </p>
        </div>
        <Badge variant="blue">{d.reference}</Badge>
      </div>

      {planAttachment ? (
        isPdfAttachment(planAttachment) ? (
          <UploadedPlan attachment={planAttachment} />
        ) : (
          <UploadedPlanWithPins
            drawing={d}
            attachment={planAttachment}
            onOpenAnchor={onOpenAnchor}
            onUnpin={canUpload ? onUnpin : undefined}
          />
        )
      ) : (
        <DrawingSvg
          drawing={d}
          onOpenAnchor={onOpenAnchor}
          onUnpin={canUpload ? onUnpin : undefined}
        />
      )}

      {otherAttachments.length > 0 ? (
        <AttachmentsRow
          attachments={otherAttachments}
          canRemove={canUpload}
          onRemove={onRemoveAttachment}
        />
      ) : null}

      {canUpload ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onPin}>
            <Plus size={16} /> Pin anchor
          </Button>
          <Button
            onClick={() => detailRef.current?.click()}
            disabled={busyAttach}
          >
            {busyAttach ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ImagePlus size={16} />
            )}
            Add detail sheet
          </Button>
          <Button
            onClick={() => pdfRef.current?.click()}
            disabled={busyAttach}
          >
            {busyAttach ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            Attach PDF
          </Button>
          <input
            ref={detailRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAttachDetail(f);
              e.target.value = "";
            }}
          />
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onAttachPdf(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}

function isPdfAttachment(attachment: DrawingAttachment): boolean {
  return (
    attachment.contentType?.includes("pdf") === true ||
    attachment.url.toLowerCase().endsWith(".pdf")
  );
}

function UploadedPlanWithPins({
  drawing,
  attachment,
  onOpenAnchor,
  onUnpin,
}: {
  drawing: Drawing;
  attachment: DrawingAttachment;
  onOpenAnchor: (id: string) => void;
  onUnpin?: (anchorId: string) => void;
}) {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <Link
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label="Open plan in new tab"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt="Uploaded plan"
          className="w-full h-auto block group-hover:opacity-95 transition"
          draggable={false}
        />
      </Link>
      {drawing.anchors.map((pin) => (
        <PinMarker
          key={pin.id}
          pin={pin}
          onOpen={() => onOpenAnchor(pin.id)}
          onUnpin={onUnpin ? () => onUnpin(pin.id) : undefined}
        />
      ))}
    </div>
  );
}

function PinMarker({
  pin,
  onOpen,
  onUnpin,
}: {
  pin: DrawingPin;
  onOpen: () => void;
  onUnpin?: () => void;
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${(pin.x / PIN_REF_W) * 100}%`,
        top: `${(pin.y / PIN_REF_H) * 100}%`,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open anchor ${pin.id}`}
        className="relative block"
      >
        <span
          aria-hidden
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full opacity-40"
          style={{ border: `3px solid ${statusColor[pin.status]}` }}
        />
        <span
          className="block w-5 h-5 rounded-full"
          style={{ background: statusColor[pin.status] }}
        />
        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 text-xs font-semibold whitespace-nowrap rounded-md px-1.5 py-0.5 bg-[var(--color-surface)]/85 backdrop-blur-sm border border-[var(--color-border)]">
          {pin.id}
        </span>
      </button>
      {onUnpin ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Unpin ${pin.id} from this drawing?`)) onUnpin();
          }}
          aria-label={`Unpin ${pin.id}`}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full grid place-items-center bg-[var(--color-surface)] border"
          style={{ borderColor: "var(--color-error)" }}
        >
          <X size={10} style={{ color: "var(--color-error)" }} />
        </button>
      ) : null}
    </div>
  );
}

function UploadedPlan({ attachment }: { attachment: DrawingAttachment }) {
  const isPdf =
    attachment.contentType?.includes("pdf") ||
    attachment.url.toLowerCase().endsWith(".pdf");
  return (
    <Link
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)] block group"
      aria-label="Open plan in new tab"
    >
      {isPdf ? (
        <div className="aspect-[16/9] grid place-items-center text-[var(--color-text-muted)] gap-2">
          <FileText size={36} className="text-[var(--color-primary)]" />
          <span className="text-sm font-semibold">PDF plan attached</span>
          <span className="text-xs">Tap to open</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={attachment.url}
          alt="Uploaded plan"
          className="w-full h-auto group-hover:opacity-90 transition"
        />
      )}
    </Link>
  );
}

function DrawingSvg({
  drawing: d,
  onOpenAnchor,
  onUnpin,
}: {
  drawing: Drawing;
  onOpenAnchor: (id: string) => void;
  onUnpin?: (anchorId: string) => void;
}) {
  return (
    <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <svg
        viewBox="0 0 760 420"
        role="img"
        aria-label={`${d.building} roof plan`}
        className="w-full h-auto"
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
        <rect
          x="90"
          y="80"
          width="180"
          height="110"
          rx="14"
          fill="currentColor"
          opacity="0.05"
        />
        <rect
          x="495"
          y="88"
          width="150"
          height="95"
          rx="14"
          fill="currentColor"
          opacity="0.05"
        />
        <path
          d="M118 286H624"
          stroke="currentColor"
          opacity="0.2"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        <path
          d="M384 54V340"
          stroke="currentColor"
          opacity="0.18"
          strokeWidth="2"
          strokeDasharray="8 8"
        />
        {d.anchors.map((pin) => (
          <g key={pin.id}>
            <g
              className="cursor-pointer"
              onClick={() => onOpenAnchor(pin.id)}
              role="button"
              aria-label={`Open anchor ${pin.id}`}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpenAnchor(pin.id);
              }}
            >
              <circle
                cx={pin.x}
                cy={pin.y}
                r="22"
                fill="none"
                stroke={statusColor[pin.status]}
                strokeWidth="3"
                opacity="0.4"
              />
              <circle
                cx={pin.x}
                cy={pin.y}
                r="14"
                fill={statusColor[pin.status]}
              />
              <text
                x={pin.x + 22}
                y={pin.y + 4}
                fontSize="14"
                fill="currentColor"
              >
                {pin.id}
              </text>
            </g>
            {onUnpin ? (
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Unpin ${pin.id} from this drawing?`)) {
                    onUnpin(pin.id);
                  }
                }}
                role="button"
                aria-label={`Unpin ${pin.id}`}
                className="cursor-pointer"
              >
                <circle
                  cx={pin.x + 18}
                  cy={pin.y - 18}
                  r="9"
                  fill="var(--color-surface)"
                  stroke="var(--color-error)"
                  strokeWidth="1.5"
                />
                <line
                  x1={pin.x + 14}
                  y1={pin.y - 22}
                  x2={pin.x + 22}
                  y2={pin.y - 14}
                  stroke="var(--color-error)"
                  strokeWidth="1.5"
                />
                <line
                  x1={pin.x + 22}
                  y1={pin.y - 22}
                  x2={pin.x + 14}
                  y2={pin.y - 14}
                  stroke="var(--color-error)"
                  strokeWidth="1.5"
                />
              </g>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

function AttachmentsRow({
  attachments,
  canRemove,
  onRemove,
}: {
  attachments: DrawingAttachment[];
  canRemove: boolean;
  onRemove: (id: string) => void;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2 inline-flex items-center gap-1.5">
        <Paperclip size={12} /> Attachments ({attachments.length})
      </div>
      <div className="flex gap-2 overflow-auto -mx-1 px-1 pb-1">
        {attachments.map((a) => (
          <AttachmentTile
            key={a.id}
            attachment={a}
            canRemove={canRemove}
            onRemove={() => onRemove(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AttachmentTile({
  attachment,
  canRemove,
  onRemove,
}: {
  attachment: DrawingAttachment;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const isPdf =
    attachment.kind === "pdf" ||
    attachment.contentType?.includes("pdf") ||
    attachment.url.toLowerCase().endsWith(".pdf");
  return (
    <div className="relative shrink-0 w-32">
      <Link
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label={`Open attachment ${attachment.label}`}
      >
        <div
          className="
            w-32 h-24 rounded-xl overflow-hidden
            border border-[var(--color-border)]
            bg-[var(--color-surface-2)]
            grid place-items-center
            transition-all duration-200
            group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-sm)]
          "
        >
          {isPdf ? (
            <FileText size={28} className="text-[var(--color-primary)]" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={attachment.url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )}
        </div>
        <div className="mt-1 text-xs flex items-center gap-1">
          <span className="truncate flex-1">{attachment.label}</span>
          <ExternalLink
            size={10}
            className="shrink-0 text-[var(--color-text-faint)]"
            aria-hidden
          />
        </div>
        <div className="text-[0.65rem] text-[var(--color-text-faint)]">
          {formatDate(attachment.addedAt)}
        </div>
      </Link>
      {canRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
          aria-label={`Remove ${attachment.label}`}
          className="absolute top-1 right-1 inline-flex w-6 h-6 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <Trash2 size={12} />
        </button>
      ) : null}
    </div>
  );
}

