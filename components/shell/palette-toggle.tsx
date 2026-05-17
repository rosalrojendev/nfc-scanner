"use client";

import * as React from "react";
import { Segmented } from "@/components/ui/segmented";

type Palette = "anchor" | "kra";

function readPalette(): Palette {
  if (typeof document === "undefined") return "anchor";
  return document.documentElement.getAttribute("data-palette") === "kra"
    ? "kra"
    : "anchor";
}

function subscribeToPalette(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-palette"],
  });
  return () => observer.disconnect();
}

function usePalette(): Palette {
  return React.useSyncExternalStore(
    subscribeToPalette,
    readPalette,
    () => "anchor",
  );
}

export function PaletteToggle() {
  const palette = usePalette();

  const onChange = React.useCallback((next: Palette) => {
    document.documentElement.setAttribute("data-palette", next);
    try {
      localStorage.setItem("atp-palette", next);
    } catch {
      // storage unavailable — silently continue
    }
  }, []);

  return (
    <Segmented<Palette>
      ariaLabel="Brand palette"
      value={palette}
      onChange={onChange}
      options={[
        { value: "anchor", label: "Anchor" },
        { value: "kra", label: "Classic" },
      ]}
    />
  );
}
