"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Eraser,
  PenTool,
  Save,
  ImagePlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { uploadFiles } from "@/lib/uploadthing";
import { timestampFilename } from "@/lib/utils";

interface SignaturePadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  height?: number;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function drawImageOnto(canvas: HTMLCanvasElement, src: string): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const rect = canvas.getBoundingClientRect();
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(img, 0, 0, rect.width, rect.height);
  };
  img.src = src;
}

export function SignaturePad({
  value,
  onChange,
  height = 160,
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const drawingRef = React.useRef(false);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = React.useState(!!value);
  const [dirty, setDirty] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isUrl =
    !!value && (value.startsWith("http://") || value.startsWith("https://"));
  const isDataUrl = !!value && value.startsWith("data:");
  const saved = !!value && isUrl && !dirty;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    const styles = getComputedStyle(document.documentElement);
    ctx.strokeStyle = styles.getPropertyValue("--color-text") || "#000";
    if (value) {
      drawImageOnto(canvas, value);
      setHasInk(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = getPos(e);
    setDirty(true);
    setError(null);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    const last = lastRef.current!;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastRef.current = pos;
    setHasInk(true);
  }

  function end() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastRef.current = null;
    // Emit an immediate data-URL so the form's submit guard sees a value.
    // The user can hit "Save signature" to upload it for durable storage,
    // or the form's submit handler will upload it automatically.
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    setDirty(false);
    setError(null);
    onChange(null);
  }

  async function saveCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await canvasToBlob(canvas);
      if (!blob) throw new Error("Could not capture signature.");
      const file = new File([blob], timestampFilename("sig", "png"), {
        type: "image/png",
      });
      const [uploaded] = await uploadFiles("avatarOrSignature", {
        files: [file],
      });
      if (!uploaded) throw new Error("Upload failed.");
      onChange(uploaded.ufsUrl);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file (PNG, JPG, etc.).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const [uploaded] = await uploadFiles("avatarOrSignature", {
        files: [file],
      });
      if (!uploaded) throw new Error("Upload failed.");
      onChange(uploaded.ufsUrl);
      const canvas = canvasRef.current;
      if (canvas) drawImageOnto(canvas, uploaded.ufsUrl);
      setHasInk(true);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  const statusText = busy
    ? "Uploading…"
    : dirty
      ? "Draft — tap Save to upload"
      : saved
        ? "Signature saved"
        : isDataUrl
          ? "Draft signature (not yet uploaded)"
          : hasInk
            ? "Signed"
            : "Tap or click and draw to sign";

  const StatusIcon = busy ? Loader2 : saved ? CheckCircle2 : PenTool;

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        className="rounded-2xl border border-dashed touch-none"
        style={{
          width: "100%",
          height,
          background:
            "repeating-linear-gradient(180deg, var(--color-surface-2), var(--color-surface-2) 22px, color-mix(in srgb, var(--color-text) 7%, transparent) 22px, color-mix(in srgb, var(--color-text) 7%, transparent) 23px)",
          borderColor:
            "color-mix(in srgb, var(--color-text) 18%, transparent)",
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
        aria-label="Signature pad"
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void uploadImage(f);
          e.target.value = "";
        }}
      />
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <span
          className="text-xs inline-flex items-center gap-1"
          style={{
            color: saved
              ? "var(--color-success)"
              : "var(--color-text-muted)",
          }}
        >
          <StatusIcon size={14} className={busy ? "animate-spin" : ""} />
          {statusText}
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            type="button"
            onClick={clear}
            disabled={busy || (!hasInk && !value)}
          >
            <Eraser size={14} /> Clear
          </Button>
          <Button
            size="sm"
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            <ImagePlus size={14} /> Upload image
          </Button>
          <Button
            size="sm"
            type="button"
            variant="primary"
            onClick={saveCanvas}
            disabled={busy || !hasInk || saved}
          >
            <Save size={14} /> {saved ? "Saved" : "Save signature"}
          </Button>
        </div>
      </div>
      {error ? (
        <p
          role="alert"
          className="text-xs"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
