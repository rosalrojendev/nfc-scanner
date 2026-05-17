import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value: string | number | Date | null | undefined) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function daysUntil(target: string | Date): number {
  const t = new Date(target).getTime();
  const now = Date.now();
  return Math.ceil((t - now) / (1000 * 60 * 60 * 24));
}

export function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

// `prefix-YYYYMMDD-HHMMSS.ext` — short, sortable, UTC for cross-device
// consistency. Used so uploaded blobs (signatures, etc.) don't all share the
// same generic filename in the storage bucket.
export function timestampFilename(prefix: string, ext = "png"): string {
  const iso = new Date().toISOString();
  const date = iso.slice(0, 10).replace(/-/g, "");
  const time = iso.slice(11, 19).replace(/:/g, "");
  return `${prefix}-${date}-${time}.${ext}`;
}
