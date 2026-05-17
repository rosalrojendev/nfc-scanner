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
  useDrawingsLoaded,
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
  Map as MapIcon,
  Download,
  ChevronDown,
  Building2,
  FolderOpen,
  X,
} from "lucide-react";

const PIN_REF_W = 760;
const PIN_REF_H = 420;
import { useSession } from "@/components/shell/session-provider";
import { useProjectContext } from "@/components/shell/project-provider";
import { can } from "@/lib/permissions";
import { UploadDrawingDialog } from "@/components/drawings/upload-drawing-dialog";
import { PinAnchorDialog } from "@/components/drawings/pin-anchor-dialog";
import { uploadFiles } from "@/lib/uploadthing";
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
  const { currentProjectId, currentProject, clients } = useProjectContext();
  const currentClient = React.useMemo(
    () =>
      currentProject
        ? clients.find((c) => c.id === currentProject.clientId) ?? null
        : null,
    [clients, currentProject],
  );
  const canUpload = can.uploadDrawings(session.role);
  const canPin = can.pinDrawing(session.role);
  const canDownload = can.downloadDrawing(session.role);
  const { notify } = useToast();
  const allDrawings = useDrawings();
  const drawingsLoaded = useDrawingsLoaded();
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
      const [uploaded] = await uploadFiles(
        kind === "pdf" ? "drawingPdf" : "drawingImage",
        { files: [file] },
      );
      if (!uploaded) throw new Error("Upload failed.");
      addAttachment(drawingId, {
        kind,
        label:
          kind === "pdf"
            ? "PDF"
            : file.name.replace(/\.[^.]+$/, "").slice(0, 32) || "Detail",
        url: uploaded.ufsUrl,
        contentType: file.type,
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
          <div className="min-w-0">
            <Eyebrow>Drawing library</Eyebrow>
            {currentClient || currentProject ? (
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {currentClient ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                    style={{
                      background: "var(--color-primary-highlight)",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Building2 size={12} />
                    <span className="truncate max-w-[18ch]">
                      {currentClient.name}
                    </span>
                  </span>
                ) : null}
                {currentProject ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)]"
                  >
                    <FolderOpen size={12} />
                    <span className="truncate max-w-[20ch]">
                      {currentProject.name}
                    </span>
                  </span>
                ) : null}
              </div>
            ) : null}
            <h1 className="text-xl font-semibold tracking-tight mt-2">
              Roof plans linked to buildings and anchors
            </h1>
            {drawingsLoaded ? (
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {drawings.length} drawings ·{" "}
                {drawingsWithLiveStatus.reduce(
                  (n, d) => n + d.anchors.length,
                  0,
                )}{" "}
                anchors pinned
              </p>
            ) : (
              <span
                className="skeleton block h-4 w-48 mt-2"
                aria-label="Loading drawing count"
              />
            )}
          </div>
          {canUpload ? (
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <FileUp size={16} /> Upload plan
            </Button>
          ) : null}
        </div>
      </Card>

      {!drawingsLoaded ? (
        <div className="grid gap-3" aria-label="Loading drawings">
          <span className="skeleton block h-40 rounded-2xl" />
          <span className="skeleton block h-40 rounded-2xl" aria-hidden />
        </div>
      ) : drawingsWithLiveStatus.length === 0 ? (
        <Card className="py-12 px-6 text-center items-center justify-items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl grid place-items-center"
            style={{
              background: "var(--color-primary-highlight)",
              color: "var(--color-primary)",
            }}
            aria-hidden
          >
            <MapIcon size={26} />
          </div>
          <div className="grid gap-1 max-w-prose">
            <strong className="text-base">No drawings yet</strong>
            <p className="text-sm text-[var(--color-text-muted)]">
              {canUpload
                ? "Upload a roof plan to pin anchors and link drawings to inspections."
                : "Roof plans uploaded by your team will appear here once they're added."}
            </p>
          </div>
          {canUpload ? (
            <Button variant="primary" onClick={() => setUploadOpen(true)}>
              <FileUp size={16} /> Upload your first drawing
            </Button>
          ) : null}
        </Card>
      ) : (
        drawingsWithLiveStatus.map((d) => (
          <DrawingCard
            key={d.id}
            drawing={d}
            canUpload={canUpload}
            canPin={canPin}
            canDownload={canDownload}
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
        ))
      )}

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

// Solid color values for canvas export — kept theme-agnostic so the exported
// PNG looks the same regardless of whether the user is in light or dark mode.
const EXPORT_PIN_COLOR: Record<AnchorStatus, string> = {
  pass: "#4d7d2e",
  due: "#c4831a",
  failed: "#b8333a",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function fileExtFor(attachment: DrawingAttachment): string {
  const ct = attachment.contentType?.toLowerCase() ?? "";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  const m = attachment.url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "png";
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so the browser has the chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadDrawing(
  drawing: Drawing,
  attachment: DrawingAttachment,
  withPins: boolean,
): Promise<void> {
  const baseName = `plan-${slugify(drawing.building)}-${slugify(drawing.reference)}`;

  if (!withPins) {
    const res = await fetch(attachment.url);
    const blob = await res.blob();
    triggerBlobDownload(blob, `${baseName}.${fileExtFor(attachment)}`);
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Failed to load plan image"));
    img.src = attachment.url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0);

  const minSide = Math.min(canvas.width, canvas.height);
  const pinR = Math.max(8, minSide / 80);
  const ringR = pinR * 2.2;
  const fontSize = Math.max(14, minSide / 60);
  ctx.textBaseline = "top";
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;

  for (const pin of drawing.anchors) {
    const px = (pin.x / PIN_REF_W) * canvas.width;
    const py = (pin.y / PIN_REF_H) * canvas.height;
    const color = EXPORT_PIN_COLOR[pin.status];

    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(px, py, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, pinR * 0.4);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(px, py, pinR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const padX = fontSize * 0.35;
    const padY = fontSize * 0.2;
    const labelX = px + ringR + 6;
    const labelY = py - fontSize / 2;
    const textWidth = ctx.measureText(pin.id).width;

    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.fillRect(
      labelX - padX,
      labelY - padY,
      textWidth + padX * 2,
      fontSize + padY * 2,
    );
    ctx.fillStyle = "#1a212a";
    ctx.fillText(pin.id, labelX, labelY);
  }

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) triggerBlobDownload(blob, `${baseName}-with-pins.png`);
      resolve();
    }, "image/png");
  });
}

function DrawingCard({
  drawing: d,
  canUpload,
  canPin,
  canDownload,
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
  canPin: boolean;
  canDownload: boolean;
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
  const [downloading, setDownloading] = React.useState<
    "with-pins" | "original" | null
  >(null);
  const [downloadMenuOpen, setDownloadMenuOpen] = React.useState(false);
  const downloadWrapRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!downloadMenuOpen) return;
    function onDocPointer(e: MouseEvent) {
      if (
        downloadWrapRef.current &&
        !downloadWrapRef.current.contains(e.target as Node)
      ) {
        setDownloadMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDownloadMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [downloadMenuOpen]);
  const planAttachment = (d.attachments ?? []).find((a) => a.kind === "plan");
  const planIsImage =
    planAttachment != null && !isPdfAttachment(planAttachment);
  const otherAttachments = (d.attachments ?? []).filter(
    (a) => a.kind !== "plan",
  );

  async function handleDownload(mode: "with-pins" | "original") {
    if (!planAttachment) return;
    setDownloading(mode);
    try {
      await downloadDrawing(d, planAttachment, mode === "with-pins");
    } catch {
      // Silent — most failures are CORS-related. Falling back to "open in new
      // tab" would surprise users mid-click, so we just no-op and let them
      // retry or right-click → save from the inline image.
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Card id={`drawing-${d.id}`} className="scroll-mt-24">
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
            onUnpin={canPin ? onUnpin : undefined}
          />
        )
      ) : (
        <DrawingSvg
          drawing={d}
          onOpenAnchor={onOpenAnchor}
          onUnpin={canPin ? onUnpin : undefined}
        />
      )}

      {otherAttachments.length > 0 ? (
        <AttachmentsRow
          attachments={otherAttachments}
          canRemove={canUpload}
          onRemove={onRemoveAttachment}
        />
      ) : null}

      {canPin || canUpload || canDownload ? (
        <div className="flex flex-wrap gap-2">
          {canPin ? (
            <Button variant="primary" onClick={onPin}>
              <Plus size={16} /> Pin anchor
            </Button>
          ) : null}
          {canDownload && planIsImage ? (
            <div className="relative inline-flex" ref={downloadWrapRef}>
              <Button
                onClick={() => handleDownload("with-pins")}
                disabled={downloading !== null}
                className="rounded-r-none border-r-0 pr-3"
              >
                {downloading === "with-pins" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {downloading === "original" ? "Downloading original…" : "Download with pins"}
              </Button>
              <Button
                onClick={() => setDownloadMenuOpen((o) => !o)}
                aria-label="More download options"
                aria-haspopup="menu"
                aria-expanded={downloadMenuOpen}
                disabled={downloading !== null}
                className="rounded-l-none px-2"
              >
                <ChevronDown size={14} />
              </Button>
              {downloadMenuOpen ? (
                <div
                  role="menu"
                  className="absolute top-full right-0 mt-1 z-20 min-w-[220px] p-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setDownloadMenuOpen(false);
                      handleDownload("original");
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--color-surface-2)] inline-flex items-center gap-2 text-[var(--color-text)]"
                  >
                    <Download size={14} /> Download original
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                      no pins
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {canUpload ? (
            <>
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
            </>
          ) : null}
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

