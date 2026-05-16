"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/animated-counter";
import { useAnchors, useInspections } from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { useIsFetching } from "@/lib/loading-state";
import { ClimbingLoader } from "@/components/shell/climbing-loader";
import { daysUntil } from "@/lib/utils";
import { ScanLine, FileText, ClipboardCheck, Map as MapIcon } from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import { ROLE_META } from "@/lib/role-meta";

export function DashboardClient() {
  const allAnchors = useAnchors();
  const allInspections = useInspections();
  const { currentProjectId } = useProjectContext();
  const isFetching = useIsFetching();
  const initialBoot = isFetching && allAnchors.length === 0;
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
  const role = session.role;
  const canScan = can.scan(role);
  const canLog = can.logInspection(role);
  const canViewReports = can.viewReports(role);

  const dueSoon = React.useMemo(() => {
    return anchors
      .map((a) => ({ ...a, days: a.nextDue ? daysUntil(a.nextDue) : 9999 }))
      .sort((a, b) => a.days - b.days)
      .filter((a) => a.days <= 60)
      .slice(0, 3);
  }, [anchors]);

  const buildings = new Set(anchors.map((a) => a.building)).size;
  const inspectorsCount = new Set(
    inspections.map((i) => i.inspector).filter(Boolean),
  ).size;
  const overdue = anchors.filter(
    (a) => a.nextDue && daysUntil(a.nextDue) < 0,
  ).length;
  const reportsReady = 8;

  // First-load state: still fetching and nothing's arrived yet.
  if (initialBoot) {
    return (
      <Card className="p-6 sm:p-7">
        <ClimbingLoader label="Pulling your dashboard data" height={180} />
      </Card>
    );
  }

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
          <Badge variant="success">{anchors.length} anchors active</Badge>
          <Badge variant="warning">{dueSoon.length} due in 60 days</Badge>
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
        <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2 shadow-[var(--shadow-sm)]">
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Buildings
          </span>
          <AnimatedCounter target={buildings} />
        </article>
        <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2 shadow-[var(--shadow-sm)]">
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Inspectors
          </span>
          <AnimatedCounter target={inspectorsCount || 5} />
        </article>
        <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2 shadow-[var(--shadow-sm)]">
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Overdue
          </span>
          <AnimatedCounter target={overdue} />
        </article>
        <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2 shadow-[var(--shadow-sm)]">
          <span className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Reports ready
          </span>
          <AnimatedCounter target={reportsReady} />
        </article>
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
            <Badge variant="warning">{dueSoon.length} due</Badge>
          </div>
          {dueSoon.length === 0 ? (
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
          <TimelineItem icon={<ScanLine size={18} />} title="NFC tag scanned">
            RA-03 opened with certification status, last tester, roof drawing,
            and retest date.
          </TimelineItem>
          <TimelineItem
            icon={<ClipboardCheck size={18} />}
            title="Inspection saved"
          >
            Proof test, signature, and attached photos stored. Due date
            recalculated.
          </TimelineItem>
          <TimelineItem icon={<MapIcon size={18} />} title="Drawing linked">
            Roof plan B-1 pinned to RA-03 with marker position.
          </TimelineItem>
        </div>
      </Card>
    </>
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

function TimelineItem({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="grid grid-cols-[44px_1fr] gap-3">
      <div
        className="w-11 h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] grid place-items-center"
        style={{ color: "var(--color-primary)" }}
      >
        {icon}
      </div>
      <div className="p-3 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm">
        <strong className="block">{title}</strong>
        <span className="text-[var(--color-text-muted)]">{children}</span>
      </div>
    </article>
  );
}
