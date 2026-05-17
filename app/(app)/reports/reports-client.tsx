"use client";

import * as React from "react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAnchors, useInspections, useStoreLoaded } from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { formatDate, daysUntil } from "@/lib/utils";
import { FileText, Mail, Download, Eye } from "lucide-react";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import type { Anchor, Inspection } from "@/lib/types";

interface DynamicReport {
  id: string;
  title: string;
  description: string;
  building: string | null; // null = all buildings
  status: "ready" | "draft" | "scheduled";
  anchorCount: number;
  inspectionCount: number;
  dueCount: number;
  overdueCount: number;
}

export function ReportsClient() {
  const { notify } = useToast();
  const allAnchors = useAnchors();
  const allInspections = useInspections();
  const storeLoaded = useStoreLoaded();
  const { currentProjectId, currentProject } = useProjectContext();
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

  // Derive one report per building in the current project, plus an
  // "all buildings" combined export. Status falls out of the data:
  // - no inspections yet → "scheduled" (work hasn't started)
  // - anything overdue or due in 30 days → "draft" (needs follow-up before sharing)
  // - otherwise → "ready"
  const reports = React.useMemo<DynamicReport[]>(() => {
    const buildings = Array.from(
      new Set(anchors.map((a) => a.building).filter(Boolean)),
    ).sort();

    const summarize = (
      scopedAnchors: Anchor[],
      scopedInspections: Inspection[],
    ) => {
      const overdueCount = scopedAnchors.filter(
        (a) => a.nextDue && daysUntil(a.nextDue) < 0,
      ).length;
      const dueCount = scopedAnchors.filter((a) => {
        if (!a.nextDue) return false;
        const d = daysUntil(a.nextDue);
        return d >= 0 && d <= 30;
      }).length;
      let status: DynamicReport["status"] = "ready";
      if (scopedInspections.length === 0) status = "scheduled";
      else if (overdueCount > 0 || dueCount > 0) status = "draft";
      return {
        anchorCount: scopedAnchors.length,
        inspectionCount: scopedInspections.length,
        overdueCount,
        dueCount,
        status,
      };
    };

    const perBuilding: DynamicReport[] = buildings.map((b) => {
      const buildingAnchors = anchors.filter((a) => a.building === b);
      const ids = new Set(buildingAnchors.map((a) => a.id));
      const buildingInspections = inspections.filter((i) => ids.has(i.anchorId));
      const s = summarize(buildingAnchors, buildingInspections);
      return {
        id: `b-${b}`,
        title: `${b} certification snapshot`,
        description: `${s.anchorCount} anchors · ${s.inspectionCount} inspections${
          s.overdueCount > 0 ? ` · ${s.overdueCount} overdue` : ""
        }${s.dueCount > 0 ? ` · ${s.dueCount} due in 30 days` : ""}`,
        building: b,
        ...s,
      };
    });

    if (anchors.length > 0) {
      const s = summarize(anchors, inspections);
      perBuilding.push({
        id: "all",
        title: currentProject
          ? `${currentProject.name} — full inspection log`
          : "Full inspection log",
        description: `Every anchor and inspection across ${buildings.length} building${buildings.length === 1 ? "" : "s"} · CSV export`,
        building: null,
        ...s,
      });
    }

    return perBuilding;
  }, [anchors, inspections, currentProject]);

  function buildCSV(scopedInspections: Inspection[]): string {
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
      ...scopedInspections.map((i) => {
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
    return rows
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
  }

  function csvFilename(report: DynamicReport | null): string {
    const today = new Date().toISOString().slice(0, 10);
    if (!report || !report.building)
      return `inspections-${today}.csv`;
    const slug = report.building
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `inspections-${slug}-${today}.csv`;
  }

  function inspectionsForReport(report: DynamicReport | null): Inspection[] {
    if (!report || !report.building) return inspections;
    const buildingIds = new Set(
      anchors.filter((a) => a.building === report.building).map((a) => a.id),
    );
    return inspections.filter((i) => buildingIds.has(i.anchorId));
  }

  function downloadCSV(report: DynamicReport | null) {
    const scoped = inspectionsForReport(report);
    const csv = buildCSV(scoped);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const filename = csvFilename(report);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  }

  function exportCSV(report?: DynamicReport | null) {
    downloadCSV(report ?? null);
    notify("CSV exported.", "success");
  }

  function emailReport(report: DynamicReport) {
    // mailto can't carry attachments cross-client, so we download the CSV
    // and pre-fill the message body with instructions to attach it. Opens
    // whatever default mail client the user has (Gmail web handler, Mail.app,
    // Outlook, etc.).
    const filename = downloadCSV(report);
    const today = formatDate(new Date());
    const subject = encodeURIComponent(`${report.title} — ${today}`);
    const projectLine = currentProject ? `Project: ${currentProject.name}\n` : "";
    const summaryLines = [
      `Building: ${report.building ?? "All buildings"}`,
      `Anchors: ${report.anchorCount}`,
      `Inspections logged: ${report.inspectionCount}`,
      ...(report.overdueCount > 0
        ? [`Overdue: ${report.overdueCount}`]
        : []),
      ...(report.dueCount > 0
        ? [`Due in next 30 days: ${report.dueCount}`]
        : []),
    ].join("\n");
    const body = encodeURIComponent(
      `Hi,\n\n` +
        `Attached is the ${report.title}.\n\n` +
        projectLine +
        summaryLines +
        `\n\n` +
        `The CSV file "${filename}" has been downloaded to your device — ` +
        `please attach it to this email before sending. (Browsers can't pre-attach files to mailto links.)\n\n` +
        `Best,\n${session.name}`,
    );
    window.location.assign(`mailto:?subject=${subject}&body=${body}`);
    notify(
      "Mail composer opened. Attach the downloaded CSV before sending.",
      "success",
    );
  }

  const previewReport = reports.find((r) => r.id === previewId) ?? null;
  const previewAnchors = previewReport
    ? previewReport.building
      ? anchors.filter((a) => a.building === previewReport.building)
      : anchors
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
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              One report per building plus a full-project export, generated
              live from the current inspection data.
            </p>
          </div>
          {storeLoaded ? (
            <Badge variant="default">
              {reports.length} report{reports.length === 1 ? "" : "s"}
            </Badge>
          ) : (
            <span
              className="skeleton inline-block h-6 w-20 rounded-full"
              aria-hidden
            />
          )}
        </div>

        {!storeLoaded ? (
          <div className="grid gap-3" aria-label="Loading reports">
            <span className="skeleton block h-24 rounded-2xl" />
            <span className="skeleton block h-24 rounded-2xl" aria-hidden />
            <span className="skeleton block h-24 rounded-2xl" aria-hidden />
          </div>
        ) : reports.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No anchors in this project yet — once anchors are added and
            inspected, reports will appear here automatically.
          </p>
        ) : (
          reports.map((r) => (
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
                  <Badge variant="warning">Needs review</Badge>
                ) : (
                  <Badge variant="blue">Awaiting inspections</Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPreviewId(r.id)}>
                  <Eye size={16} /> Preview
                </Button>
                {canEmail ? (
                  <Button onClick={() => emailReport(r)}>
                    <Mail size={16} /> Email client
                  </Button>
                ) : null}
                {canExport ? (
                  <Button onClick={() => exportCSV(r)}>
                    <Download size={16} /> Export CSV
                  </Button>
                ) : null}
              </div>
            </article>
          ))
        )}
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
                <Button
                  variant="primary"
                  onClick={() => exportCSV(previewReport)}
                >
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
