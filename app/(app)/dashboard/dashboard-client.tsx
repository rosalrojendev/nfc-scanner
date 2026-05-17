"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import {
  useAnchors,
  useInspections,
  useAllAnchors,
  useAllInspections,
  useStoreLoaded,
} from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { daysUntil, formatDate } from "@/lib/utils";
import {
  ScanLine,
  FileText,
  ClipboardCheck,
  AlertTriangle,
  AlertOctagon,
  Trash2,
  Anchor as AnchorMarkIcon,
} from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import { ROLE_META } from "@/lib/role-meta";
import { useSettings } from "@/lib/settings-store";
import type { InspectionResult } from "@/lib/types";

type ActivityEvent =
  | {
      kind: "inspection-result";
      id: string;
      date: string;
      anchorId: string;
      anchorLabel: string;
      subtitle: string;
      inspector: string;
      result: InspectionResult;
    }
  | {
      kind: "inspection-deleted";
      id: string;
      date: string;
      anchorId: string;
      anchorLabel: string;
      subtitle: string;
      actor: string | null;
    }
  | {
      kind: "anchor-deleted";
      id: string;
      date: string;
      anchorId: string;
      anchorLabel: string;
      subtitle: string;
      actor: string | null;
    };

export function DashboardClient() {
  const allAnchors = useAnchors();
  const allInspections = useInspections();
  // The activity feed needs visibility into soft-deleted records so it can
  // surface "X deleted Y" events; the active-only hooks above keep the stats
  // and due-list correct.
  const allAnchorsWithDeleted = useAllAnchors();
  const allInspectionsWithDeleted = useAllInspections();
  const { currentProjectId } = useProjectContext();
  const storeLoaded = useStoreLoaded();
  const anchors = React.useMemo(
    () =>
      currentProjectId
        ? allAnchors.filter((a) => a.projectId === currentProjectId)
        : allAnchors,
    [allAnchors, currentProjectId],
  );
  const inspections = React.useMemo(
    () =>
      currentProjectId
        ? allInspections.filter((i) => i.projectId === currentProjectId)
        : allInspections,
    [allInspections, currentProjectId],
  );
  const session = useSession();
  const settings = useSettings();
  const role = session.role;
  const canScan = can.scan(role);
  const canLog = can.logInspection(role);
  const canViewReports = can.viewReports(role);

  // Reminder windows: the longest enabled threshold sets the lookahead, so a
  // user who only ticked "7-day" doesn't see anchors 30+ days out. Overdue
  // anchors are always surfaced regardless of toggles — a missed re-test is a
  // safety issue, not a notification preference.
  const reminderAnchors = React.useMemo(() => {
    if (!settings.loaded) return [];
    const r = settings.reminders;
    const lookaheadDays = r.sixtyDay
      ? 60
      : r.thirtyDay
        ? 30
        : r.sevenDay
          ? 7
          : -1;
    return anchors
      .map((a) => ({
        ...a,
        days: a.nextDue !== null ? daysUntil(a.nextDue) : null,
      }))
      .filter((a) => {
        if (a.days === null) return false;
        if (a.days < 0) return true;
        return lookaheadDays >= 0 && a.days <= lookaheadDays;
      })
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
  }, [anchors, settings.reminders, settings.loaded]);

  const reminderOverdue = reminderAnchors.filter((a) => (a.days ?? 0) < 0);
  const reminderUpcoming = reminderAnchors.filter((a) => (a.days ?? 0) >= 0);
  const enabledThresholds: number[] = [];
  if (settings.reminders.sixtyDay) enabledThresholds.push(60);
  if (settings.reminders.thirtyDay) enabledThresholds.push(30);
  if (settings.reminders.sevenDay) enabledThresholds.push(7);

  const dueSoon = React.useMemo(() => {
    return anchors
      .map((a) => ({ ...a, days: a.nextDue ? daysUntil(a.nextDue) : 9999 }))
      .sort((a, b) => a.days - b.days)
      .filter((a) => a.days <= 60)
      .slice(0, 3);
  }, [anchors]);

  // Activity feed merges three event streams so the dashboard reads as a
  // chronological audit trail rather than a plain inspection log.
  const recentEvents = React.useMemo<ActivityEvent[]>(() => {
    const scopedInspections = currentProjectId
      ? allInspectionsWithDeleted.filter(
          (i) => i.projectId === currentProjectId,
        )
      : allInspectionsWithDeleted;
    const scopedAnchors = currentProjectId
      ? allAnchorsWithDeleted.filter((a) => a.projectId === currentProjectId)
      : allAnchorsWithDeleted;

    const lookupAnchor = (anchorId: string) =>
      scopedAnchors.find((a) => a.id === anchorId);

    const events: ActivityEvent[] = [];

    for (const insp of scopedInspections) {
      const anchor = lookupAnchor(insp.anchorId);
      const anchorLabel = anchor?.label || insp.anchorId;
      const subtitleParts = [anchor?.building, insp.drawingRef || anchor?.drawing].filter(Boolean) as string[];
      if (insp.deletedAt) {
        events.push({
          kind: "inspection-deleted",
          id: `del-ins-${insp.id}`,
          date: insp.deletedAt,
          anchorId: insp.anchorId,
          anchorLabel,
          subtitle: subtitleParts.join(" · ") || "—",
          actor: insp.deletedByName ?? null,
        });
      } else {
        events.push({
          kind: "inspection-result",
          id: insp.id,
          date: insp.createdAt || insp.testDate,
          anchorId: insp.anchorId,
          anchorLabel,
          subtitle: subtitleParts.join(" · ") || "—",
          inspector: insp.submittedByName || insp.inspector,
          result: insp.result,
        });
      }
    }

    for (const a of scopedAnchors) {
      if (!a.deletedAt) continue;
      events.push({
        kind: "anchor-deleted",
        id: `del-anc-${a.id}`,
        date: a.deletedAt,
        anchorId: a.id,
        anchorLabel: a.label,
        subtitle: [a.building, a.drawing].filter(Boolean).join(" · ") || "—",
        actor: a.deletedByName ?? null,
      });
    }

    events.sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime());
    return events.slice(0, 6);
  }, [
    currentProjectId,
    allAnchorsWithDeleted,
    allInspectionsWithDeleted,
  ]);

  const buildings = new Set(anchors.map((a) => a.building)).size;
  const inspectorsCount = new Set(
    inspections.map((i) => i.inspector).filter(Boolean),
  ).size;
  const overdue = anchors.filter(
    (a) => a.nextDue && daysUntil(a.nextDue) < 0,
  ).length;
  const reportsReady = 8;

  // Empty state: signed in but not on any project's roster.
  if (!currentProjectId && session.role !== "admin") {
    return (
      <Card className="p-6 sm:p-7 overflow-hidden relative">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 14%, transparent), transparent 55%)",
          }}
        />
        <div className="relative grid gap-3 max-w-prose">
          <Eyebrow>Welcome</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight">
            You haven&apos;t been added to any project yet
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {session.role === "inspector"
              ? "Ask the client admin who hired you to add you to their inspector roster. Once they do, the project's anchors and drawings will appear here."
              : "Your account doesn't have any client memberships. Ask a platform admin to grant you access, or sign up again as a Company / org admin if you wanted to start your own org."}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Signed in as <strong>{session.name}</strong> · {session.email}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {reminderAnchors.length > 0 ? (
        <ReminderBanner
          overdue={reminderOverdue}
          upcoming={reminderUpcoming}
          enabledThresholds={enabledThresholds}
        />
      ) : null}

      <Card className="p-6 sm:p-7 overflow-hidden relative">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-70"
          style={{
            background:
              "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 55%), radial-gradient(circle at 0% 100%, color-mix(in srgb, var(--color-blue) 14%, transparent), transparent 60%)",
          }}
        />
        <div className="relative grid gap-4">
          <RolePill />
          <Eyebrow>
            {role === "client"
              ? "Client view"
              : role === "admin"
                ? "Admin overview"
                : "Mobile-first control center"}
          </Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">
            {role === "client"
              ? "Read-only view of certifications, drawings, and reports."
              : role === "admin"
                ? "Track inspectors, anchors, drawings, and reports across all buildings."
                : "Scan tags, log proof tests, and update due dates from the roof."}
          </h1>
        <p className="text-[var(--color-text-muted)]">
          {role === "client"
            ? "You can review anchor status, drawings, and download reports. Editing and scanning are reserved for the inspection team."
            : "Designed for crews on the roof first, with NFC scan entry, QR fallback, building-level drawings, and inspection history tied to every anchor."}
        </p>
        <div className="flex flex-wrap gap-2">
          {storeLoaded ? (
            <>
              <Badge variant="success">{anchors.length} anchors active</Badge>
              <Badge variant="warning">{dueSoon.length} due in 60 days</Badge>
            </>
          ) : (
            <>
              <span className="skeleton inline-block h-6 w-32 rounded-full" aria-hidden />
              <span className="skeleton inline-block h-6 w-36 rounded-full" aria-hidden />
            </>
          )}
          {canScan ? (
            <Badge variant="blue">NFC + QR enabled</Badge>
          ) : (
            <Badge variant="primary">Read-only access</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canScan ? (
            <Link href="/scan">
              <Button variant="primary">
                <ScanLine size={18} /> Scan anchor
              </Button>
            </Link>
          ) : null}
          {canLog ? (
            <Link href="/inspections/new">
              <Button variant={canScan ? "default" : "primary"}>
                <ClipboardCheck size={18} /> Log inspection
              </Button>
            </Link>
          ) : null}
          {canViewReports && !canScan && !canLog ? (
            <Link href="/reports">
              <Button variant="primary">
                <FileText size={18} /> View reports
              </Button>
            </Link>
          ) : null}
        </div>
        </div>
      </Card>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Buildings" value={buildings} loaded={storeLoaded} />
        <StatCard
          label="Inspectors"
          value={inspectorsCount || 5}
          loaded={storeLoaded}
        />
        <StatCard label="Overdue" value={overdue} loaded={storeLoaded} />
        <StatCard
          label="Reports ready"
          value={reportsReady}
          loaded={storeLoaded}
        />
      </section>

      <section className="grid lg:grid-cols-[1.15fr_0.85fr] gap-4">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>
                {canScan ? "Live scan workflow" : "Roof plan overview"}
              </Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                {canScan
                  ? "Tap NFC or scan QR plate"
                  : "Anchor positions across buildings"}
              </h2>
            </div>
            {canScan ? (
              <Link href="/scan">
                <Button variant="primary" size="sm">
                  Open scanner
                </Button>
              </Link>
            ) : (
              <Link href="/drawings">
                <Button variant="primary" size="sm">
                  Open drawings
                </Button>
              </Link>
            )}
          </div>
          <p className="text-[var(--color-text-muted)] text-sm">
            {canScan
              ? "The same anchor record can open from NFC, QR code, or a search fallback, so crews still reach the correct asset on any phone."
              : "Inspection teams update anchor records in the field. This view aggregates the latest certification status."}
          </p>
          <div className="rounded-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-2)]">
            <svg viewBox="0 0 760 420" aria-label="Roof plan overview">
              <rect
                x="30"
                y="30"
                width="700"
                height="360"
                rx="22"
                fill="none"
                stroke="currentColor"
                opacity="0.18"
                strokeWidth="2"
              />
              <rect
                x="92"
                y="84"
                width="180"
                height="102"
                rx="14"
                fill="currentColor"
                opacity="0.05"
              />
              <rect
                x="490"
                y="88"
                width="154"
                height="94"
                rx="14"
                fill="currentColor"
                opacity="0.05"
              />
              <path
                d="M118 286H624"
                stroke="currentColor"
                opacity="0.2"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
              <path
                d="M384 54V340"
                stroke="currentColor"
                opacity="0.18"
                strokeWidth="2"
                strokeDasharray="8 8"
              />
              <circle
                cx="548"
                cy="274"
                r="18"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="4"
              />
              <circle cx="548" cy="274" r="5" fill="var(--color-primary)" />
              <path
                d="M566 258l78-42"
                stroke="var(--color-primary)"
                strokeWidth="3"
              />
              <rect
                x="644"
                y="190"
                width="76"
                height="86"
                rx="14"
                fill="var(--color-primary-highlight)"
              />
              <text
                x="660"
                y="218"
                fill="var(--color-primary)"
                fontSize="19"
              >
                RA-03
              </text>
              <text
                x="656"
                y="240"
                fill="var(--color-primary)"
                fontSize="13"
              >
                NFC + QR
              </text>
              <circle cx="222" cy="294" r="15" fill="var(--color-blue)" />
              <circle cx="392" cy="146" r="15" fill="var(--color-success)" />
            </svg>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>Due list</Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                Re-test queue
              </h2>
            </div>
            {storeLoaded ? (
            <Badge variant="warning">{dueSoon.length} due</Badge>
          ) : (
            <span className="skeleton inline-block h-6 w-16 rounded-full" aria-hidden />
          )}
          </div>
          {!storeLoaded ? (
            <div className="grid gap-2">
              <span className="skeleton block h-16 rounded-2xl" aria-label="Loading re-test queue" />
              <span className="skeleton block h-16 rounded-2xl" aria-hidden />
            </div>
          ) : dueSoon.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No anchors are due in the next 60 days.
            </p>
          ) : (
            dueSoon.map((a) => {
              const pct = Math.max(
                0,
                Math.min(100, 100 - (a.days / 60) * 100),
              );
              return (
                <Link
                  key={a.id}
                  href={`/anchors/${a.id}`}
                  className="block p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong className="text-sm">{a.label}</strong>
                    <Badge
                      variant={a.days < 0 ? "error" : "warning"}
                    >
                      {a.days < 0
                        ? `${Math.abs(a.days)}d overdue`
                        : `${a.days}d`}
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {a.building} · {a.drawing}
                  </p>
                  <div className="w-full h-2 mt-2 rounded-full bg-[color-mix(in_srgb,var(--color-text)_8%,transparent)] overflow-hidden">
                    <span
                      className="block h-full bg-[var(--color-primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </Link>
              );
            })
          )}
        </Card>
      </section>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Activity</Eyebrow>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              Recent events
            </h2>
          </div>
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <FileText size={16} /> Reports
            </Button>
          </Link>
        </div>
        <div className="grid gap-3">
          {!storeLoaded ? (
            <>
              <span className="skeleton block h-14 rounded-2xl" aria-label="Loading recent events" />
              <span className="skeleton block h-14 rounded-2xl" aria-hidden />
              <span className="skeleton block h-14 rounded-2xl" aria-hidden />
            </>
          ) : recentEvents.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No inspection activity yet. Logged inspections will appear here.
            </p>
          ) : (
            recentEvents.map((ev) => {
              if (ev.kind === "inspection-result") {
                const r = RESULT_META[ev.result];
                const Icon = r.icon;
                return (
                  <Link
                    key={ev.id}
                    href={`/anchors/${ev.anchorId}`}
                    className="block"
                  >
                    <TimelineItem
                      icon={<Icon size={18} />}
                      iconColor={r.color}
                      title={`${r.title} · ${ev.anchorLabel}`}
                      meta={formatDate(ev.date)}
                    >
                      {ev.subtitle}
                      {ev.inspector ? ` · by ${ev.inspector}` : ""}
                    </TimelineItem>
                  </Link>
                );
              }
              const title =
                ev.kind === "anchor-deleted"
                  ? `Anchor deleted · ${ev.anchorLabel}`
                  : `Inspection deleted · ${ev.anchorLabel}`;
              const Icon =
                ev.kind === "anchor-deleted" ? AnchorMarkIcon : Trash2;
              const body = (
                <>
                  {ev.subtitle}
                  {ev.actor ? ` · by ${ev.actor}` : ""}
                </>
              );
              const inner = (
                <TimelineItem
                  icon={<Icon size={18} />}
                  iconColor="var(--color-error)"
                  title={title}
                  meta={formatDate(ev.date)}
                >
                  {body}
                </TimelineItem>
              );
              // Anchor pages still render for soft-deleted anchors, but the
              // deleted inspection itself doesn't have a useful destination,
              // so we link to the anchor it belonged to either way.
              return (
                <Link
                  key={ev.id}
                  href={`/anchors/${ev.anchorId}`}
                  className="block"
                >
                  {inner}
                </Link>
              );
            })
          )}
        </div>
      </Card>
    </>
  );
}

type ReminderRow = {
  id: string;
  label: string;
  building: string;
  nextDue: string | null;
  days: number | null;
};

function ReminderBanner({
  overdue,
  upcoming,
  enabledThresholds,
}: {
  overdue: ReminderRow[];
  upcoming: ReminderRow[];
  enabledThresholds: number[];
}) {
  const headline =
    overdue.length > 0
      ? `${overdue.length} anchor${overdue.length === 1 ? "" : "s"} overdue${
          upcoming.length > 0
            ? ` · ${upcoming.length} due soon`
            : ""
        }`
      : `${upcoming.length} anchor${upcoming.length === 1 ? "" : "s"} due soon`;

  const subline =
    overdue.length > 0
      ? "Re-tests have lapsed — schedule them as soon as possible."
      : enabledThresholds.length > 0
        ? `Alerts enabled at ${enabledThresholds.join(", ")} day${enabledThresholds.length === 1 ? "" : "s"} before due date.`
        : "";

  const accent =
    overdue.length > 0 ? "var(--color-error)" : "var(--color-warning)";
  const highlight =
    overdue.length > 0
      ? "var(--color-error-highlight)"
      : "var(--color-warning-highlight)";
  const HeadIcon = overdue.length > 0 ? AlertOctagon : AlertTriangle;

  const rows = [...overdue, ...upcoming].slice(0, 4);

  return (
    <Card
      className="p-5 sm:p-6 overflow-hidden relative"
      style={{
        background: highlight,
        borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="w-10 h-10 shrink-0 rounded-2xl grid place-items-center"
          style={{ background: accent, color: "var(--color-text-inverse)" }}
        >
          <HeadIcon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <Eyebrow>Reminders</Eyebrow>
          <strong className="text-base block mt-0.5" style={{ color: accent }}>
            {headline}
          </strong>
          {subline ? (
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {subline}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2 mt-1">
        {rows.map((a) => {
          const isOverdue = (a.days ?? 0) < 0;
          return (
            <Link
              key={a.id}
              href={`/anchors/${a.id}`}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:bg-[var(--color-surface)] transition"
            >
              <div className="min-w-0">
                <strong className="text-sm block truncate">{a.label}</strong>
                <span className="text-xs text-[var(--color-text-muted)] block truncate">
                  {a.building}
                  {a.nextDue ? ` · due ${formatDate(a.nextDue)}` : ""}
                </span>
              </div>
              <Badge variant={isOverdue ? "error" : "warning"}>
                {a.days === null
                  ? "—"
                  : isOverdue
                    ? `${Math.abs(a.days)}d overdue`
                    : `${a.days}d`}
              </Badge>
            </Link>
          );
        })}
      </div>
      {overdue.length + upcoming.length > rows.length ? (
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          + {overdue.length + upcoming.length - rows.length} more — see the
          full list in <Link href="/anchors" className="font-semibold" style={{ color: accent }}>Anchors</Link>.
        </p>
      ) : null}
    </Card>
  );
}

function StatCard({
  label,
  value,
  loaded,
}: {
  label: string;
  value: number;
  loaded: boolean;
}) {
  return (
    <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2 shadow-[var(--shadow-sm)]">
      <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </span>
      {loaded ? (
        <AnimatedCounter target={value} />
      ) : (
        <span
          className="skeleton block h-8 w-12 rounded"
          aria-label={`Loading ${label.toLowerCase()}`}
        />
      )}
    </article>
  );
}

function RolePill() {
  const session = useSession();
  const meta = ROLE_META[session.role];
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold w-fit"
      style={{
        background: meta.accentHighlight,
        color: meta.accent,
        boxShadow:
          "inset 0 0 0 1px color-mix(in srgb, currentColor 22%, transparent)",
      }}
    >
      <Icon size={14} />
      <span>
        Hi, {session.name.split(" ")[0]} · {meta.label}
      </span>
    </span>
  );
}

const RESULT_META: Record<
  InspectionResult,
  {
    icon: React.ComponentType<{ size?: number }>;
    title: string;
    color: string;
  }
> = {
  pass: {
    icon: ClipboardCheck,
    title: "Proof test passed",
    color: "var(--color-success)",
  },
  review: {
    icon: AlertTriangle,
    title: "Flagged for review",
    color: "var(--color-warning)",
  },
  failed: {
    icon: AlertOctagon,
    title: "Inspection failed",
    color: "var(--color-error)",
  },
};

function TimelineItem({
  icon,
  iconColor,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  iconColor?: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="grid grid-cols-[44px_1fr] gap-3">
      <div
        className="w-11 h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] grid place-items-center"
        style={{ color: iconColor || "var(--color-primary)" }}
      >
        {icon}
      </div>
      <div className="p-3 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm">
        <div className="flex items-start justify-between gap-2">
          <strong className="block">{title}</strong>
          {meta ? (
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              {meta}
            </span>
          ) : null}
        </div>
        <span className="text-[var(--color-text-muted)] block">{children}</span>
      </div>
    </article>
  );
}
