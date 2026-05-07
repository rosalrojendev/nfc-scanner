"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Eraser, PenTool } from "lucide-react";

interface SignaturePadProps {
  value: string | null;
  onChange: (value: string | null) => void;
  height?: number;
}

export function SignaturePad({
  value,
  onChange,
  height = 160,
}: SignaturePadProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const drawingRef = React.useRef(false);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = React.useState(!!value);

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
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        setHasInk(true);
      };
      img.src = value;
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
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasInk(false);
    onChange(null);
  }

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
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
          <PenTool size={14} /> {hasInk ? "Signed" : "Tap or click and draw to sign"}
        </span>
        <Button size="sm" type="button" onClick={clear}>
          <Eraser size={14} /> Clear
        </Button>
      </div>
    </div>
  );
}
