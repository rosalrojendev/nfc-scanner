"use client";

import * as React from "react";

interface ClimbingLoaderProps {
  label?: string;
  /** Height in pixels of the rope+climber column. */
  height?: number;
  /** Wrap in vertical padding. Default true. Set false for tight inline use. */
  padded?: boolean;
}

// Centered, vertical climbing animation. A small stick-figure climber
// ascends a rope from the bottom, fades out at the top, and respawns at
// the bottom — continuous loop suggesting work is in progress.
export function ClimbingLoader({
  label = "Loading",
  height = 140,
  padded = true,
}: ClimbingLoaderProps) {
  const climberH = 30;
  const ropeH = height - 4; // leave room for the top anchor
  return (
    <div
      role="status"
      aria-label={label}
      className={
        "grid place-items-center gap-3 " +
        (padded ? "py-10" : "")
      }
    >
      <div
        className="relative"
        style={{
          width: 80,
          height,
          // Custom prop the keyframes pluck out so multiple sizes coexist.
          ["--atp-rope-h" as string]: `${ropeH - climberH}px`,
        }}
      >
        {/* Anchor bracket at the top */}
        <div
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-sm"
          style={{
            width: 18,
            height: 5,
            background:
              "color-mix(in srgb, var(--color-text) 35%, transparent)",
          }}
        />
        {/* Bolt / hanger glints */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{
            top: 1,
            width: 4,
            height: 4,
            background: "var(--color-primary)",
            boxShadow: "0 0 6px var(--color-primary)",
          }}
        />
        {/* The rope */}
        <div
          className="absolute left-1/2 top-1 -translate-x-1/2"
          style={{
            width: 2,
            height: ropeH,
            background:
              "color-mix(in srgb, var(--color-text) 18%, transparent)",
            borderRadius: 1,
          }}
        />
        {/* The climber */}
        <div
          className="absolute left-1/2 -translate-x-1/2 will-change-transform"
          style={{
            top: 4,
            color: "var(--color-primary)",
            animation:
              "atp-climb-vertical 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        >
          <svg
            width="22"
            height={climberH}
            viewBox="0 0 22 30"
            fill="none"
            aria-hidden
          >
            {/* head */}
            <circle cx="11" cy="4.5" r="2.5" fill="currentColor" />
            {/* torso (slightly leaning) */}
            <line
              x1="11"
              y1="7"
              x2="10"
              y2="17"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* one arm reaching straight up to the rope */}
            <line
              x1="11"
              y1="9"
              x2="11"
              y2="2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* other arm bent at the elbow */}
            <line
              x1="11"
              y1="9"
              x2="14"
              y2="6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line
              x1="14"
              y1="6"
              x2="13"
              y2="2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* legs */}
            <line
              x1="10"
              y1="17"
              x2="7"
              y2="22"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="17"
              x2="13"
              y2="21"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line
              x1="13"
              y1="21"
              x2="14"
              y2="27"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
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
        @keyframes atp-climb-vertical {
          0%   { transform: translateY(var(--atp-rope-h)) translateX(-50%); opacity: 0; }
          10%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(0px) translateX(-50%); opacity: 0; }
        }
        @keyframes atp-climb-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.5; }
          50%      { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
