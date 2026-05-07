"use client";

import * as React from "react";
import Link from "next/link";
import { Anchor as AnchorIcon, ScanLine, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-border)] backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingBottom: "0.75rem",
        paddingLeft: "1rem",
        paddingRight: "1rem",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl grid place-items-center"
            style={{
              background: "var(--color-primary-highlight)",
              color: "var(--color-primary)",
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 18%, transparent)",
            }}
            aria-hidden
          >
            <AnchorIcon size={22} />
          </div>
          <div className="leading-tight">
            <strong className="block text-[1.05rem] tracking-tight">
              Anchor Tag Pro
            </strong>
            <span className="block text-xs text-[var(--color-text-muted)]">
              {user.name} · {user.role}
            </span>
          </div>
        </Link>
        <div className="flex gap-2">
          <Link href="/scan" aria-label="Open scanner">
            <Button variant="default" size="icon">
              <ScanLine size={20} />
            </Button>
          </Link>
          <ThemeToggle compact />
          <Button
            variant="default"
            size="icon"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
