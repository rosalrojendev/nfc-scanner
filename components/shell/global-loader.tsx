"use client";

import * as React from "react";
import { useIsFetching } from "@/lib/loading-state";

// Centered overlay loader scoped to the main content region.
// - On mobile: spans the full screen width, sits between the topbar and bottom
//   nav so it never overlaps the chrome and stays visible across the page.
// - On desktop (lg+): offset right of the 280px side nav and aligned with the
//   main column, so it reads as "the page is loading", not "the whole UI".
// A short delay before showing avoids a flash on quick fetches.
export function GlobalLoader() {
  const isFetching = useIsFetching();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (!isFetching) {
      setVisible(false);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 180);
    return () => window.clearTimeout(t);
  }, [isFetching]);

  return (
    <>
      <div
        role="status"
        aria-label="Loading"
        aria-live="polite"
        aria-hidden={!visible}
        className="atp-global-loader"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 220ms ease",
        }}
      >
        <div
          className="flex items-center gap-3 px-5 py-3 rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--color-surface) 92%, transparent)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-md)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            transform: visible ? "scale(1)" : "scale(0.96)",
            transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <svg
            width={24}
            height={24}
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
              animation: visible
                ? "atp-anchor-spin 1.4s linear infinite"
                : "none",
            }}
          >
            <path d="M12 3v8M8 7h8M6 12a6 6 0 0 0 12 0M6 18l-2 3M18 18l2 3" />
          </svg>
          <span className="text-sm font-semibold text-[var(--color-text)]">
            Loading…
          </span>
        </div>
      </div>
      <style>{`
        @keyframes atp-anchor-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .atp-global-loader {
          position: fixed;
          z-index: 100;
          pointer-events: none;
          display: grid;
          place-items: center;
          left: 0;
          right: 0;
          top: calc(env(safe-area-inset-top) + 4.5rem);
          bottom: calc(env(safe-area-inset-bottom) + 6rem);
        }
        @media (min-width: 1024px) {
          .atp-global-loader {
            left: 280px;
            right: 0;
            top: calc(env(safe-area-inset-top) + 4.5rem);
            bottom: 0;
          }
        }
      `}</style>
    </>
  );
}
