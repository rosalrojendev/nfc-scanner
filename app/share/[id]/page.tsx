import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getProject,
  getShareLink,
  listAnchors,
  listDrawings,
  listInspections,
} from "@/lib/server-store";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysUntil } from "@/lib/utils";
import { ShieldCheck, AlertTriangle, AlertOctagon, Map as MapIcon, FileText } from "lucide-react";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Shared report · Anchor Tag Pro",
  robots: { index: false, follow: false },
};

export default async function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const link = await getShareLink(id);
  if (!link) notFound();

  const project = await getProject(link.projectId);
  if (!project) notFound();

  const projectIds = new Set([project.id]);
  const [anchors, drawings, inspections] = await Promise.all([
    listAnchors({ projectIds }),
    listDrawings({ projectIds }),
    listInspections({ projectIds }),
  ]);

  const overdue = anchors.filter(
    (a) => a.nextDue && daysUntil(a.nextDue) < 0,
  ).length;
  const dueSoon = anchors.filter((a) => {
    if (!a.nextDue) return false;
    const d = daysUntil(a.nextDue);
    return d >= 0 && d <= 60;
  }).length;
  const passing = anchors.filter((a) => a.status === "pass").length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header
        className="border-b border-[var(--color-border)]"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1rem)",
          paddingBottom: "1rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          background: "var(--color-surface)",
        }}
      >
        <div className="max-w-[1140px] mx-auto flex items-center gap-3">
          <div
            className="relative w-10 h-10 rounded-2xl overflow-hidden shrink-0"
            aria-hidden
          >
            <Image
              src="/anchor-tag.png"
              alt=""
              fill
              sizes="40px"
              priority
              className="object-cover"
            />
          </div>
          <div className="leading-tight min-w-0 flex-1">
            <strong className="block text-[1.05rem] tracking-tight truncate">
              Anchor Tag Pro
            </strong>
            <span className="text-xs text-[var(--color-text-muted)]">
              Shared by your inspection team · read-only
            </span>
          </div>
          <Badge variant="primary">View only</Badge>
        </div>
      </header>

      <main
        className="px-4 lg:px-8 py-6 grid gap-5 max-w-[1140px] mx-auto"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
      >
        <Card className="p-6 sm:p-7 overflow-hidden relative">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none opacity-70"
            style={{
              background:
                "radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 55%)",
            }}
          />
          <div className="relative grid gap-2">
            <Eyebrow>{link.label}</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              Snapshot generated {formatDate(new Date())} · This page reflects
              the current state of certifications, drawings, and inspection
              records for this project.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="success">
                <ShieldCheck size={12} /> {passing} passing
              </Badge>
              <Badge variant="warning">
                <AlertTriangle size={12} /> {dueSoon} due in 60 days
              </Badge>
              {overdue > 0 ? (
                <Badge variant="error">
                  <AlertOctagon size={12} /> {overdue} overdue
                </Badge>
              ) : null}
              <Badge variant="default">
                <MapIcon size={12} /> {drawings.length} drawings
              </Badge>
              <Badge variant="default">
                <FileText size={12} /> {inspections.length} inspection
                {inspections.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>Anchor registry</Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                Certifications snapshot
              </h2>
            </div>
            <Badge variant="default">{anchors.length} total</Badge>
          </div>
          {anchors.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No anchors have been registered for this project yet.
            </p>
          ) : (
            <div className="grid gap-2">
              {anchors.map((a) => {
                const d =
                  a.nextDue !== null ? daysUntil(a.nextDue) : null;
                const overdueRow = d !== null && d < 0;
                return (
                  <article
                    key={a.id}
                    className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid grid-cols-[1fr_auto] items-start gap-3"
                  >
                    <div className="min-w-0">
                      <strong className="text-sm block truncate">
                        {a.label}
                      </strong>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {a.building} · {a.location}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                        Last tested {formatDate(a.lastTested)}
                        {a.nextDue
                          ? ` · Next due ${formatDate(a.nextDue)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {a.status === "pass" ? (
                        <Badge variant="success">Pass</Badge>
                      ) : a.status === "failed" ? (
                        <Badge variant="error">Failed</Badge>
                      ) : (
                        <Badge variant="warning">Due</Badge>
                      )}
                      {overdueRow ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-error)]">
                          {Math.abs(d)}d overdue
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>

        {drawings.length > 0 ? (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Eyebrow>Drawing library</Eyebrow>
                <h2 className="text-lg font-semibold tracking-tight mt-1">
                  Roof plans
                </h2>
              </div>
              <Badge variant="default">{drawings.length}</Badge>
            </div>
            <div className="grid gap-2">
              {drawings.map((d) => (
                <article
                  key={d.id}
                  className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)]"
                >
                  <strong className="text-sm block">
                    {d.building} · {d.level}
                  </strong>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {d.reference} · {d.anchors.length} anchor
                    {d.anchors.length === 1 ? "" : "s"} pinned
                  </p>
                </article>
              ))}
            </div>
          </Card>
        ) : null}

        <p className="text-xs text-[var(--color-text-muted)] text-center pt-2">
          This is a tokenized read-only view shared by the inspection team.
          Treat the link as confidential — anyone with it can see this snapshot.
        </p>
      </main>
    </div>
  );
}
