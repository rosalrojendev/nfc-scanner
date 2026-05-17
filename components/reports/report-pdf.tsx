"use client";

import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Anchor, Inspection, Project } from "@/lib/types";

// Brand palette baked in. We resolve them as literals (not CSS variables)
// because react-pdf renders to PDF, not the DOM — it can't read CSS custom
// properties from globals.css.
const COLOR = {
  text: "#1a2129",
  textMuted: "#566372",
  textFaint: "#8b95a3",
  border: "#d2d8e0",
  surface: "#f8f9fb",
  surface2: "#ffffff",
  surfaceOffset: "#e3e8ee",
  primary: "#2f6a82",
  primaryHighlight: "#dde9ef",
  success: "#4d7d2e",
  warning: "#c4831a",
  error: "#b8333a",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    color: COLOR.text,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 14,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    borderBottomStyle: "solid",
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLOR.primary,
    color: COLOR.surface2,
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  },
  logoText: { color: COLOR.surface2, fontWeight: 700, fontSize: 14 },
  brandText: { fontSize: 11, fontWeight: 700 },
  brandTagline: { fontSize: 8.5, color: COLOR.textMuted },
  headerMeta: { marginLeft: "auto", textAlign: "right" },
  headerMetaLabel: {
    fontSize: 7,
    color: COLOR.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerMetaValue: { fontSize: 9, fontWeight: 700 },

  eyebrow: {
    fontSize: 8,
    color: COLOR.textFaint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: 700,
    marginBottom: 4,
  },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  h2: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 8,
  },
  caption: { fontSize: 9, color: COLOR.textMuted, marginBottom: 12 },

  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statBox: {
    flexGrow: 1,
    flexBasis: 90,
    padding: 8,
    borderRadius: 6,
    backgroundColor: COLOR.surface,
    borderWidth: 1,
    borderColor: COLOR.border,
    borderStyle: "solid",
  },
  statLabel: {
    fontSize: 7,
    color: COLOR.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statValue: { fontSize: 14, fontWeight: 700 },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLOR.surfaceOffset,
    padding: 6,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.border,
    borderBottomStyle: "solid",
    fontSize: 9,
  },
  // Anchor table column widths.
  colId: { width: "12%" },
  colLabel: { width: "26%" },
  colBuilding: { width: "20%" },
  colLastTested: { width: "16%" },
  colNextDue: { width: "16%" },
  colStatus: { width: "10%", textAlign: "right" },

  // Inspection log column widths.
  insDate: { width: "16%" },
  insAnchor: { width: "14%" },
  insInspector: { width: "22%" },
  insResult: { width: "12%" },
  insProof: { width: "16%" },
  insNotes: { width: "20%" },

  statusPill: {
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    textAlign: "center",
  },
  statusPass: {
    backgroundColor: "#e8f3dd",
    color: COLOR.success,
  },
  statusDue: {
    backgroundColor: "#f6e5c4",
    color: COLOR.warning,
  },
  statusFailed: {
    backgroundColor: "#f3d6d9",
    color: COLOR.error,
  },

  empty: {
    fontSize: 9,
    color: COLOR.textMuted,
    fontStyle: "italic",
    paddingVertical: 8,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: COLOR.textFaint,
    borderTopWidth: 0.5,
    borderTopColor: COLOR.border,
    borderTopStyle: "solid",
    paddingTop: 6,
  },
});

export interface ReportPdfProps {
  title: string;
  scopeLabel: string; // "All buildings" or "Kamloops Office Tower"
  project: Project | null;
  anchors: Anchor[];
  inspections: Inspection[];
  generatedAt: Date;
  generatedByName: string;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function daysUntil(target: string | null): number | null {
  if (!target) return null;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
}

export function ReportPdfDocument({
  title,
  scopeLabel,
  project,
  anchors,
  inspections,
  generatedAt,
  generatedByName,
}: ReportPdfProps) {
  const overdue = anchors.filter(
    (a) => a.nextDue && (daysUntil(a.nextDue) ?? 0) < 0,
  ).length;
  const dueSoon = anchors.filter((a) => {
    const d = a.nextDue ? daysUntil(a.nextDue) : null;
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const passing = anchors.filter((a) => a.status === "pass").length;
  const failed = anchors.filter((a) => a.status === "failed").length;

  const sortedAnchors = [...anchors].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  const recentInspections = [...inspections]
    .filter((i) => !i.deletedAt)
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.testDate).getTime() -
        new Date(a.createdAt || a.testDate).getTime(),
    )
    .slice(0, 30);

  const generatedAtLabel = generatedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Document
      title={title}
      author={generatedByName}
      creator="Anchor Tag Pro"
      producer="Anchor Tag Pro"
    >
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <View>
            <Text style={styles.brandText}>Anchor Tag Pro</Text>
            <Text style={styles.brandTagline}>
              Inspection certifications &amp; field reports
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.headerMetaLabel}>Generated</Text>
            <Text style={styles.headerMetaValue}>{generatedAtLabel}</Text>
          </View>
        </View>

        <Text style={styles.eyebrow}>Inspection report</Text>
        <Text style={styles.h1}>{title}</Text>
        <Text style={styles.caption}>
          {project ? `${project.name} · ` : ""}
          Scope: {scopeLabel} · Prepared by {generatedByName}
        </Text>

        <View style={styles.statsRow}>
          <Stat label="Anchors" value={String(anchors.length)} />
          <Stat label="Inspections" value={String(inspections.length)} />
          <Stat label="Passing" value={String(passing)} />
          <Stat label="Due ≤ 30d" value={String(dueSoon)} />
          <Stat label="Overdue" value={String(overdue)} />
          <Stat label="Failed" value={String(failed)} />
        </View>

        <Text style={styles.h2}>Anchor registry</Text>
        {sortedAnchors.length === 0 ? (
          <Text style={styles.empty}>No anchors in scope.</Text>
        ) : (
          <>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.colId}>ID</Text>
              <Text style={styles.colLabel}>Label</Text>
              <Text style={styles.colBuilding}>Building</Text>
              <Text style={styles.colLastTested}>Last tested</Text>
              <Text style={styles.colNextDue}>Next due</Text>
              <Text style={styles.colStatus}>Status</Text>
            </View>
            {sortedAnchors.map((a) => (
              <View key={a.id} style={styles.tableRow} wrap={false}>
                <Text style={styles.colId}>{a.id}</Text>
                <Text style={styles.colLabel}>{a.label}</Text>
                <Text style={styles.colBuilding}>{a.building}</Text>
                <Text style={styles.colLastTested}>{fmtDate(a.lastTested)}</Text>
                <Text style={styles.colNextDue}>{fmtDate(a.nextDue)}</Text>
                <View style={styles.colStatus}>
                  <StatusPill status={a.status} />
                </View>
              </View>
            ))}
          </>
        )}

        <Text style={styles.h2}>Recent inspections</Text>
        {recentInspections.length === 0 ? (
          <Text style={styles.empty}>No inspections logged yet.</Text>
        ) : (
          <>
            <View style={styles.tableHeader} fixed>
              <Text style={styles.insDate}>Date</Text>
              <Text style={styles.insAnchor}>Anchor</Text>
              <Text style={styles.insInspector}>Inspector</Text>
              <Text style={styles.insResult}>Result</Text>
              <Text style={styles.insProof}>Proof load</Text>
              <Text style={styles.insNotes}>Notes</Text>
            </View>
            {recentInspections.map((i) => (
              <View key={i.id} style={styles.tableRow} wrap={false}>
                <Text style={styles.insDate}>{fmtDate(i.testDate)}</Text>
                <Text style={styles.insAnchor}>{i.anchorId}</Text>
                <Text style={styles.insInspector}>{i.inspector}</Text>
                <View style={styles.insResult}>
                  <StatusPill
                    status={
                      i.result === "review"
                        ? "due"
                        : i.result === "failed"
                          ? "failed"
                          : "pass"
                    }
                    label={i.result}
                  />
                </View>
                <Text style={styles.insProof}>{i.proofLoad || "—"}</Text>
                <Text style={styles.insNotes}>
                  {i.notes ? truncate(i.notes, 80) : "—"}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Anchor Tag Pro · {title} · Confidential — for the named recipient
            only.
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function StatusPill({
  status,
  label,
}: {
  status: "pass" | "due" | "failed";
  label?: string;
}) {
  const style =
    status === "pass"
      ? styles.statusPass
      : status === "failed"
        ? styles.statusFailed
        : styles.statusDue;
  return (
    <Text style={[styles.statusPill, style]}>
      {(label ?? status).toUpperCase()}
    </Text>
  );
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}
