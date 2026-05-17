"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ScanLine, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/card";
import { ThemeToggle } from "./theme-toggle";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/types";
import { ROLE_META } from "@/lib/role-meta";
import { can } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { avatarFor, useSettings } from "@/lib/settings-store";
import { ProjectSwitcher } from "./project-switcher";

export function TopBar({ user }: { user: SessionUser }) {
  const router = useRouter();
  const meta = ROLE_META[user.role];
  const RoleIcon = meta.icon;
  const canScan = can.scan(user.role);
  const settings = useSettings();
  const myAvatar = avatarFor(user.id, user.name, settings);

  const [logoutOpen, setLogoutOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      // Network hiccup — push to /login anyway so the user isn't stuck;
      // the session cookie may already be cleared.
      router.replace("/login");
    } finally {
      // Don't reset state — the page is unmounting on success. Only matters
      // if the user opens the dialog again on the same render.
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  }

  return (
    <>
    <header
      className="sticky top-0 z-40 border-b border-[var(--color-border)] backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingBottom: "0.75rem",
        paddingLeft: "0.75rem",
        paddingRight: "0.75rem",
      }}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
        >
          <div
            className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl overflow-hidden shrink-0"
            style={{ boxShadow: "var(--shadow-sm)" }}
            aria-hidden
          >
            <Image
              src="/anchor-tag.png"
              alt=""
              fill
              sizes="44px"
              priority
              className="object-cover"
            />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <strong className="block text-[0.95rem] sm:text-[1.05rem] tracking-tight truncate">
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
            <span className="sm:hidden text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1 truncate max-w-full">
              <RoleIcon
                size={12}
                style={{ color: meta.accent, flexShrink: 0 }}
              />
              <span className="truncate">{user.name}</span>
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ProjectSwitcher />
          {/* Scan button is duplicated in the bottom nav — hide on mobile to free up topbar space. */}
          {canScan ? (
            <Link href="/scan" aria-label="Open scanner" className="hidden sm:inline-flex">
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
            <Avatar name={user.name} src={myAvatar} size={36} />
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
            onClick={() => setLogoutOpen(true)}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </Button>
        </div>
      </div>
    </header>

      <Dialog
        open={logoutOpen}
        onClose={() => (loggingOut ? undefined : setLogoutOpen(false))}
        ariaLabel="Confirm sign out"
        placement="center"
      >
        <Eyebrow>Session</Eyebrow>
        <h3 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
          <LogOut size={18} aria-hidden /> Sign out of Anchor Tag Pro?
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          You&apos;ll be signed out as <strong>{user.name}</strong>. Any
          unsaved changes in open dialogs will be lost. You can sign back in
          anytime.
        </p>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => setLogoutOpen(false)}
            disabled={loggingOut}
          >
            Stay signed in
          </Button>
          <Button
            variant="primary"
            onClick={confirmLogout}
            disabled={loggingOut}
          >
            <LogOut size={16} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
