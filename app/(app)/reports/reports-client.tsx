"use client";

import * as React from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { SEED_REPORTS } from "@/lib/seed";
import { useAnchors, useInspections } from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { formatDate } from "@/lib/utils";
import { FileText, Mail, Download, Eye } from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";

export function ReportsClient() {
  const { notify } = useToast();
  const allAnchors = useAnchors();
  const allInspections = useInspections();
  const { currentProjectId } = useProjectContext();
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
  const canEmail = can.emailReports(session.role);
  const canExport = can.exportReports(session.role);
  const [previewId, setPreviewId] = React.useState<string | null>(null);

  function exportCSV() {
    const rows = [
      [
        "anchor_id",
        "building",
        "test_date",
        "next_due",
        "result",
        "inspector",
        "proof_load",
        "notes",
      ],
      ...inspections.map((i) => {
        const a = anchors.find((x) => x.id === i.anchorId);
        return [
          i.anchorId,
          a?.building || "",
          i.testDate,
          i.nextDueDate,
          i.result,
          i.inspector,
          i.proofLoad,
          i.notes.replace(/\n/g, " "),
        ];
      }),
    ];
    const csv = rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("CSV exported.", "success");
  }

  const previewReport = SEED_REPORTS.find((r) => r.id === previewId);
  const previewAnchors = previewReport
    ? anchors.filter((a) => a.building === previewReport.building)
    : [];

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Client-ready outputs</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              Reports and exports
            </h1>
          </div>
          <Badge variant="success">Ready to build out</Badge>
        </div>

        {SEED_REPORTS.map((r) => (
          <article
            key={r.id}
            className="p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="inline-flex items-center gap-2">
                  <FileText size={16} /> {r.title}
                </strong>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {r.description}
                </p>
              </div>
              {r.status === "ready" ? (
                <Badge variant="success">Ready</Badge>
              ) : r.status === "draft" ? (
                <Badge variant="warning">Draft</Badge>
              ) : (
                <Badge variant="blue">Scheduled</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPreviewId(r.id)}>
                <Eye size={16} /> Preview
              </Button>
              {canEmail ? (
                <Button onClick={() => notify("Email queued (demo).", "success")}>
                  <Mail size={16} /> Email client
                </Button>
              ) : null}
              {canExport ? (
                <Button onClick={exportCSV}>
                  <Download size={16} /> Export CSV
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </Card>

      <Dialog
        open={!!previewReport}
        onClose={() => setPreviewId(null)}
        ariaLabel="Report preview"
      >
        {previewReport ? (
          <>
            <Eyebrow>Report preview</Eyebrow>
            <h3 className="text-lg font-semibold tracking-tight">
              {previewReport.title}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              {previewReport.description}
            </p>
            <div className="grid gap-2 max-h-[50vh] overflow-auto">
              {previewAnchors.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  No anchors found for {previewReport.building}.
                </p>
              ) : (
                previewAnchors.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong>{a.label}</strong>
                      <span className="text-[var(--color-text-muted)] text-xs">
                        {formatDate(a.lastTested)} → {formatDate(a.nextDue)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {a.location} · {a.proofResult}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setPreviewId(null)}>Close</Button>
              {canExport ? (
                <Button variant="primary" onClick={exportCSV}>
                  <Download size={16} /> Export
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Dialog>
    </>
  );
}
