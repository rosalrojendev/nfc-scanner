"use client";

import * as React from "react";
import { useIsFetching } from "@/lib/loading-state";

// Climbing-themed top loader: a tiny climber traverses a horizontal rope
// across the top of the viewport while data is loading. The rope "fills in"
// behind them as they go (think tyrolean traversal). When idle, the whole
// bar fades out.
export function GlobalLoader() {
  const isFetching = useIsFetching();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isFetching) {
      setVisible(true);
      return;
    }
    // Linger briefly so a quick traversal finishes its arc.
    const t = window.setTimeout(() => setVisible(false), 280);
    return () => window.clearTimeout(t);
  }, [isFetching]);

  return (
    <>
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 h-5 z-[100] pointer-events-none overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 250ms ease",
        }}
      >
        {/* The rope (static dim line) */}
        <div
          className="absolute left-0 right-0 top-[10px] h-px"
          style={{
            background:
              "color-mix(in srgb, var(--color-text) 14%, transparent)",
          }}
        />
        {/* The climbed segment — fills as the climber traverses */}
        <div
          className="absolute left-0 top-[9px] h-[3px] rounded-full origin-left will-change-transform"
          style={{
            width: "100%",
            background:
              "linear-gradient(90deg, var(--color-primary), color-mix(in srgb, var(--color-primary) 60%, #10b981))",
            animation: visible
              ? "atp-rope-fill 2.4s ease-in-out infinite"
              : "none",
          }}
        />
        {/* The climber */}
        <div
          className="absolute top-0 will-change-transform"
          style={{
            color: "var(--color-primary)",
            animation: visible
              ? "atp-climber-traverse 2.4s ease-in-out infinite, atp-climber-bob 0.6s ease-in-out infinite"
              : "none",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            {/* head */}
            <circle cx="10" cy="4.2" r="1.9" fill="currentColor" />
            {/* torso, slightly forward-leaning */}
            <line
              x1="10"
              y1="6"
              x2="9"
              y2="11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* arms — both reaching up to the rope */}
            <line
              x1="10"
              y1="7"
              x2="7"
              y2="3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="10"
              y1="7"
              x2="13"
              y2="3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* legs — bent, climbing */}
            <line
              x1="9"
              y1="11"
              x2="7"
              y2="14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="9"
              y1="11"
              x2="11"
              y2="13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="11"
              y1="13"
              x2="13"
              y2="17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
      <style>{`
        @keyframes atp-rope-fill {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        @keyframes atp-climber-traverse {
          0%   { transform: translateX(-22px); }
          100% { transform: translateX(calc(100vw - 0px)); }
        }
        @keyframes atp-climber-bob {
          0%, 100% { translate: 0 0; }
          50%      { translate: 0 -2px; }
        }
      `}</style>
    </>
  );
}
