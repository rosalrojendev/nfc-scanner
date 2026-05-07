"use client";

const AVATAR_MAX_BYTES = 4 * 1024 * 1024;

export const AVATAR_LIMITS = {
  maxBytes: AVATAR_MAX_BYTES,
  squareSize: 256,
};

export async function uploadAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Avatar must be an image.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error("Avatar must be 4 MB or smaller.");
  }
  const downscaled = await downscaleSquare(file, AVATAR_LIMITS.squareSize);
  const fd = new FormData();
  fd.append("file", downscaled);
  const res = await fetch("/api/photos", { method: "POST", body: fd });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `Upload failed (${res.status})`);
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

async function downscaleSquare(file: File, size: number): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
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
