"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Anchor as AnchorIcon,
  ClipboardCheck,
  Map as MapIcon,
  FileText,
  Settings,
  ScanLine,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "./session-provider";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  match: (path: string) => boolean;
  showOnMobile?: boolean;
  visibleTo: (role: Role) => boolean;
}

const items: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: LayoutDashboard,
    match: (p) => p === "/dashboard",
    showOnMobile: true,
    visibleTo: can.viewDashboard,
  },
  {
    href: "/anchors",
    label: "Anchors",
    icon: AnchorIcon,
    match: (p) => p.startsWith("/anchors"),
    showOnMobile: true,
    visibleTo: can.viewAnchors,
  },
  {
    href: "/scan",
    label: "Scan",
    icon: ScanLine,
    match: (p) => p.startsWith("/scan"),
    showOnMobile: true,
    visibleTo: can.scan,
  },
  {
    href: "/inspections",
    label: "Tests",
    icon: ClipboardCheck,
    match: (p) => p.startsWith("/inspections"),
    showOnMobile: true,
    visibleTo: can.viewInspections,
  },
  {
    href: "/drawings",
    label: "Drawings",
    icon: MapIcon,
    match: (p) => p.startsWith("/drawings"),
    showOnMobile: true,
    visibleTo: can.viewDrawings,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: FileText,
    match: (p) => p.startsWith("/reports"),
    showOnMobile: true,
    visibleTo: can.viewReports,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
    showOnMobile: true,
    visibleTo: can.viewSettings,
  },
];

const sideLinkBase =
  "min-h-[52px] flex items-center gap-3 px-3 rounded-2xl text-sm font-bold transition";
const sideLinkInactive =
  "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]";
const sideLinkActive =
  "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]";

const mobileLinkBase =
  "min-h-[58px] flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold tracking-[0.02em] transition";
const mobileLinkInactive = "text-[var(--color-text-muted)]";
const mobileLinkActive =
  "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]";

export function SideNav() {
  const pathname = usePathname() || "/";
  const session = useSession();
  const visibleItems = items.filter((i) => i.visibleTo(session.role));
  return (
    <aside
      className="hidden lg:grid content-start gap-2 p-4 border-r border-[var(--color-border)] bg-[var(--color-surface)]"
      aria-label="Primary navigation"
    >
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              sideLinkBase,
              active ? sideLinkActive : sideLinkInactive,
            )}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}

const MOBILE_NAV_LIMIT = 5;

export function BottomNav() {
  const pathname = usePathname() || "/";
  const session = useSession();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const mobileItems = React.useMemo(
    () => items.filter((i) => i.showOnMobile && i.visibleTo(session.role)),
    [session.role],
  );

  const overflowing = mobileItems.length > MOBILE_NAV_LIMIT;
  // When overflowing: rightmost slot is "More". The first 4 nav items take
  // slots 1-4, anything past index 3 lives inside the More drawer.
  const visibleAsTabs = overflowing
    ? mobileItems.slice(0, MOBILE_NAV_LIMIT - 1)
    : mobileItems;
  const overflowItems = overflowing
    ? mobileItems.slice(MOBILE_NAV_LIMIT - 1)
    : [];

  // If the current page lives in the overflow set, mark "More" as active so
  // the user keeps a sense of place.
  const moreActive =
    overflowing && overflowItems.some((i) => i.match(pathname));

  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const cols = Math.min(
    MOBILE_NAV_LIMIT,
    Math.max(2, visibleAsTabs.length + (overflowing ? 1 : 0)),
  );

  return (
    <>
      <nav
        className="lg:hidden fixed inset-x-0 bottom-0 z-[45] border-t border-[var(--color-border)] backdrop-blur-md"
        aria-label="Mobile navigation"
        style={{
          background: "color-mix(in srgb, var(--color-bg) 92%, transparent)",
          paddingTop: "0.5rem",
          paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
          paddingLeft: "0.75rem",
          paddingRight: "0.75rem",
        }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {visibleAsTabs.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  mobileLinkBase,
                  active ? mobileLinkActive : mobileLinkInactive,
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          {overflowing ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              aria-label={`More options (${overflowItems.length})`}
              className={cn(
                mobileLinkBase,
                moreActive ? mobileLinkActive : mobileLinkInactive,
              )}
            >
              <MoreHorizontal size={20} />
              <span>More</span>
            </button>
          ) : null}
        </div>
      </nav>

      <Dialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        ariaLabel="More navigation options"
      >
        <div className="grid gap-1">
          <div className="text-[0.72rem] uppercase tracking-[0.08em] text-[var(--color-text-muted)] font-semibold">
            More
          </div>
          <h3 className="text-lg font-semibold tracking-tight">
            Other sections
          </h3>
        </div>
        <div className="grid gap-2">
          {overflowItems.map((item) => {
            const Icon = item.icon;
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "min-h-[52px] flex items-center gap-3 px-3 rounded-2xl text-sm font-bold transition border border-transparent",
                  active
                    ? "bg-[var(--color-primary)] text-[var(--color-text-inverse)] shadow-[var(--shadow-sm)]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text)] hover:border-[var(--color-border)]",
                )}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </Dialog>
    </>
  );
}
