"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function subscribeToTheme(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function useTheme(): Theme {
  return React.useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => "light",
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  const isDark = theme === "dark";

  const toggle = React.useCallback(() => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("atp-theme", next);
    } catch {
      // storage unavailable — silently continue
    }
  }, [isDark]);

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (compact) {
    return (
      <Button
        variant="default"
        size="icon"
        onClick={toggle}
        aria-label={label}
        suppressHydrationWarning
      >
        <span suppressHydrationWarning>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </span>
      </Button>
    );
  }

  return (
    <Button
      variant="default"
      onClick={toggle}
      className="px-4"
      aria-label={label}
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>
        {isDark ? "Light mode" : "Dark mode"}
      </span>
    </Button>
  );
}
