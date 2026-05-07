"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ScanLine, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { ROLE_META } from "@/lib/role-meta";
import { can } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { avatarFor, useSettings } from "@/lib/settings-store";

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const meta = ROLE_META[user.role];
  const RoleIcon = meta.icon;
  const canScan = can.scan(user.role);
  const settings = useSettings();
  const myAvatar = avatarFor(user.id, user.name, settings);

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
            className="relative w-11 h-11 rounded-2xl overflow-hidden shrink-0"
            style={{ boxShadow: "var(--shadow-sm)" }}
            aria-hidden
          >
            <Image
              src="/kra-logo.png"
              alt=""
              fill
              sizes="44px"
              priority
              className="object-cover"
            />
          </div>
          <div className="leading-tight">
            <strong className="block text-[1.05rem] tracking-tight">
              Anchor Tag Pro
            </strong>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  background: meta.accentHighlight,
                  color: meta.accent,
                }}
              >
                <RoleIcon size={12} />
                {meta.label}
              </span>
              · {user.name}
            </span>
            <span className="sm:hidden text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
              <RoleIcon size={12} style={{ color: meta.accent }} />
              {user.name}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {canScan ? (
            <Link href="/scan" aria-label="Open scanner">
              <Button variant="default" size="icon">
                <ScanLine size={20} />
              </Button>
            </Link>
          ) : null}
          <ThemeToggle compact />
          <Link
            href="/settings"
            aria-label={`Open settings for ${user.name}`}
            className="relative inline-flex shrink-0 transition-transform duration-200 hover:scale-[1.04]"
          >
            <Avatar name={user.name} src={myAvatar} size={40} />
            <span
              aria-hidden
              className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full"
              style={{
                background: meta.accent,
                color: "var(--color-text-inverse)",
                boxShadow: "0 0 0 2px var(--color-bg)",
              }}
            >
              <RoleIcon size={9} />
            </span>
          </Link>
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
