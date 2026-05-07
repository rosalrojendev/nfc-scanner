"use client";

import * as React from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/button";
import { Camera, ImagePlus, X } from "lucide-react";

interface QrScannerProps {
  onResult: (text: string) => void;
}

export function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [active, setActive] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const stop = React.useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setActive(false);
  }, []);

  React.useEffect(() => {
    return () => stop();
  }, [stop]);

  const tickRef = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    const fn = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(() => tickRef.current());
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code && code.data) {
        stop();
        onResult(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    };
    tickRef.current = fn;
  }, [onResult, stop]);

  async function start() {
    setError(null);
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera is not available in this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setActive(true);
      rafRef.current = requestAnimationFrame(() => tickRef.current());
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not access camera.";
      setError(
        message.includes("Permission")
          ? "Camera permission was denied. Use image upload below."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    setError(null);
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load image."));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        throw new Error("Canvas unavailable.");
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code || !code.data) {
        setError("No QR code detected in this image.");
        return;
      }
      onResult(code.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not scan image.");
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-black aspect-[4/3] relative grid place-items-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        {!active ? (
          <div
            className="absolute inset-0 grid place-items-center text-center text-white/80 p-4"
            style={{ background: "rgba(0,0,0,0.55)" }}
          >
            <div>
              <Camera size={28} className="mx-auto mb-2 opacity-80" />
              <p className="text-sm">
                Camera preview appears here while scanning a QR plate.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop scanning"
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-9 h-9 grid place-items-center"
          >
            <X size={18} />
          </button>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button variant="primary" onClick={start} disabled={busy}>
            <Camera size={16} /> Start camera
          </Button>
        ) : (
          <Button variant="default" onClick={stop}>
            <X size={16} /> Stop
          </Button>
        )}
        <Button onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={16} /> Upload image
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="text-sm"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
