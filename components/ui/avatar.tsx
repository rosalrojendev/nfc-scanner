import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

const PALETTE = [
  { bg: "#fde2d4", fg: "#b94d22" }, // peach (KRA orange)
  { bg: "#dbe6f5", fg: "#1f3a5f" }, // cool navy
  { bg: "#dcefcd", fg: "#3f6a23" }, // sage
  { bg: "#f5d8e3", fg: "#9d2c5e" }, // mauve
  { bg: "#f0e2c5", fg: "#866018" }, // wheat
  { bg: "#cde6e1", fg: "#176258" }, // teal
  { bg: "#e7d6f1", fg: "#5d2885" }, // violet
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, src, size = 36, className }: AvatarProps) {
  const tone = PALETTE[hash(name) % PALETTE.length];
  const initials = initialsFor(name);
  const fontSize = Math.max(11, Math.round(size * 0.38));

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 select-none",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
        fontSize,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow:
          "inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent)",
      }}
      role="img"
      aria-label={name}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
    </span>
  );
}
