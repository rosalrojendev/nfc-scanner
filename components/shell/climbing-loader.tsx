"use client";

import * as React from "react";

interface ClimbingLoaderProps {
  label?: string;
  /** Total vertical space (px) reserved for the spinner column. */
  height?: number;
  /** Wrap in vertical padding. Default true. Set false for tight inline use. */
  padded?: boolean;
}

// Brand-mark loader: the Anchor Tag icon spins in place while data loads.
export function ClimbingLoader({
  label = "Loading",
  height = 140,
  padded = true,
}: ClimbingLoaderProps) {
  const size = Math.max(40, Math.min(height - 36, 96));
  return (
    <div
      role="status"
      aria-label={label}
      className={"grid place-items-center gap-3 " + (padded ? "py-10" : "")}
    >
      <div
        className="grid place-items-center"
        style={{ height, width: size }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          style={{
            color: "var(--color-primary)",
            transformOrigin: "50% 50%",
            animation: "atp-anchor-spin 1.4s linear infinite",
          }}
        >
          <path d="M12 3v8M8 7h8M6 12a6 6 0 0 0 12 0M6 18l-2 3M18 18l2 3" />
        </svg>
      </div>
      <p className="text-sm text-[var(--color-text-muted)] inline-flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: "var(--color-primary)",
            animation: "atp-climb-pulse 1.2s ease-in-out infinite",
          }}
        />
        {label}…
      </p>
      <style>{`
        @keyframes atp-anchor-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes atp-climb-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50%      { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
