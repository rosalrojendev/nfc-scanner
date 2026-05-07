"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, ImagePlus, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  max?: number;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({ photos, onChange, max = 6 }: PhotoUploadProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(0);

  async function handleFiles(list: FileList) {
    setError(null);
    const next = [...photos];
    const remainingSlots = max - next.length;
    const files = Array.from(list).slice(0, Math.max(0, remainingSlots));

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        setError("Only image files are supported.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Each photo must be 5 MB or smaller.");
        continue;
      }

      setUploading((n) => n + 1);
      try {
        const downscaled = await downscaleFile(file, 1280);
        const url = await uploadPhoto(downscaled);
        next.push(url);
        onChange([...next]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
  }

  function removeAt(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 overflow-auto -mx-1 px-1">
        {photos.map((src, idx) => (
          <div
            key={idx}
            className="relative shrink-0 w-28 h-20 rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Inspection photo ${idx + 1}`}
              className="w-full h-full object-cover"
            />
            <Link
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open photo ${idx + 1} in new tab`}
              className="absolute bottom-1 left-1 bg-black/60 text-white rounded-full w-6 h-6 grid place-items-center"
            >
              <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              aria-label={`Remove photo ${idx + 1}`}
              onClick={() => removeAt(idx)}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 grid place-items-center"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {uploading > 0 ? (
          <div className="shrink-0 w-28 h-20 rounded-xl border border-dashed border-[var(--color-border)] grid place-items-center text-[var(--color-text-muted)] text-xs gap-1">
            <Loader2 size={18} className="animate-spin" />
            <span>Uploading…</span>
          </div>
        ) : null}
        {photos.length < max && uploading === 0 ? (
          <div className="shrink-0 w-28 h-20 rounded-xl border border-dashed border-[var(--color-border)] grid place-items-center text-[var(--color-text-muted)] text-xs px-2 text-center">
            {photos.length}/{max} photos
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading > 0 || photos.length >= max}
        >
          <Camera size={16} /> Capture photo
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading > 0 || photos.length >= max}
        >
          <ImagePlus size={16} /> Add from gallery
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Photos are uploaded to cloud storage. Only the URL is saved with the
        inspection record.
      </p>
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

async function uploadPhoto(file: File): Promise<string> {
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
  const json = (await res.json()) as { url: string };
  return json.url;
}

async function downscaleFile(file: File, max: number): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      if (scale >= 1) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(
            new File(
              [blob],
              file.name.replace(/\.[^.]+$/, "") + ".jpg",
              { type: "image/jpeg" },
            ),
          );
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}
