import * as React from "react";

export function AnchorTagIcon({ size = 24 }: { size?: number }) {
  return (
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
    >
      <path d="M12 3v8M8 7h8M6 12a6 6 0 0 0 12 0M6 18l-2 3M18 18l2 3" />
    </svg>
  );
}
