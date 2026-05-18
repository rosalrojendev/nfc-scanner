"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Field, Label } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import {
  useAnchors,
  useInspections,
  useStoreLoaded,
  deleteInspectionById,
} from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import {
  ClipboardCheck,
  Trash2,
  PencilLine,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
} from "lucide-react";
import { SubmittedByChip } from "@/components/submitted-by";
import { InspectorTag } from "@/components/inspector-tag";
import type { InspectionResult, Inspection } from "@/lib/types";

type ResultFilter = "all" | InspectionResult;

const RESULT_COLOR: Record<InspectionResult, string> = {
  pass: "var(--color-success)",
  review: "var(--color-warning)",
  failed: "var(--color-error)",
};

function ResultPill({ result }: { result: InspectionResult }) {
  if (result === "pass")
    return (
      <Badge variant="success">
        <CheckCircle2 size={12} /> Pass
      </Badge>
    );
  if (result === "review")
    return (
      <Badge variant="warning">
        <AlertTriangle size={12} /> Review
      </Badge>
    );
  return (
    <Badge variant="error">
      <AlertOctagon size={12} /> Failed
    </Badge>
  );
}

export function InspectionsClient() {
  const allInspections = useInspections();
  const anchors = useAnchors();
  const storeLoaded = useStoreLoaded();
  const { currentProjectId } = useProjectContext();
  const inspections = React.useMemo(
    () =>
      currentProjectId
        ? allInspections.filter((i) => i.projectId === currentProjectId)
        : allInspections,
    [allInspections, currentProjectId],
  );
  const [query, setQuery] = React.useState("");
  const [result, setResult] = React.useState<ResultFilter>("all");
  const [inspectorFilter, setInspectorFilter] = React.useState<string>("__all");
  const { notify } = useToast();
  const session = useSession();
  const canLog = can.logInspection(session.role);
  const canEdit = can.editInspection(session.role);
  const canDelete = can.deleteInspection(session.role);

  const anchorById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const a of anchors) m.set(a.id, a.label);
    return m;
  }, [anchors]);

  // Build the dropdown from every place an inspector name surfaces in the
  // current project scope, so the filter never hides someone the user can
  // actually see referenced as an inspector elsewhere in the app:
  //   - active inspections (the obvious source),
  //   - anchor.inspector (sticky; survives even if the inspection was
  //     soft-deleted, which would otherwise drop the name from the list),
  //   - the logged-in user's display name (so "filter to me" always works,
  //     even on a fresh project where they haven't saved one yet).
  // Dedup is case-insensitive, preserving the first-seen casing.
  const anchorsInScope = React.useMemo(
    () =>
      currentProjectId
        ? anchors.filter((a) => a.projectId === currentProjectId)
        : anchors,
    [anchors, currentProjectId],
  );

  const inspectorOptions = React.useMemo(() => {
    const seen = new Map<string, string>();
    const addName = (raw: string | null | undefined) => {
      if (!raw) return;
      const trimmed = raw.trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    };
    for (const i of inspections) addName(i.inspector);
    for (const a of anchorsInScope) addName(a.inspector);
    if (session.name) addName(session.name);
    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [inspections, anchorsInScope, session.name]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return inspections
      .slice()
      .sort(
        (a, b) =>
          new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
      )
      .filter((i) => {
        if (result !== "all" && i.result !== result) return false;
        if (
          inspectorFilter !== "__all" &&
          (i.inspector || "").trim().toLowerCase() !==
            inspectorFilter.trim().toLowerCase()
        )
          return false;
        if (!q) return true;
        return (
          i.anchorId.toLowerCase().includes(q) ||
          i.inspector.toLowerCase().includes(q) ||
          i.result.toLowerCase().includes(q) ||
          i.notes.toLowerCase().includes(q) ||
          (anchorById.get(i.anchorId) || "").toLowerCase().includes(q)
        );
      });
  }, [inspections, query, anchorById, result, inspectorFilter]);

  async function remove(id: string) {
    if (!confirm("Delete this inspection record?")) return;
    try {
      await deleteInspectionById(id);
      notify("Inspection deleted.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  const activeFilters =
    (result !== "all" ? 1 : 0) + (inspectorFilter !== "__all" ? 1 : 0);

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Inspection log</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              All inspection records
            </h1>
            {storeLoaded ? (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Showing {filtered.length} of {inspections.length}
              </p>
            ) : (
              <span
                className="skeleton block h-3 w-32 mt-2"
                aria-label="Loading inspection count"
              />
            )}
          </div>
          {canLog ? (
            <Link href="/inspections/new">
              <Button variant="primary" size="sm">
                <ClipboardCheck size={16} /> New
              </Button>
            </Link>
          ) : null}
        </div>
        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder="Search anchor, inspector, notes, or result"
          aria-label="Search inspections"
        />
        <Segmented<ResultFilter>
          value={result}
          onChange={setResult}
          options={[
            { value: "all", label: "All" },
            { value: "pass", label: "Pass" },
            { value: "review", label: "Review" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <Field>
          <Label htmlFor="f-inspector">Inspector</Label>
          <Select
            id="f-inspector"
            value={inspectorFilter}
            onChange={(e) => setInspectorFilter(e.target.value)}
          >
            <option value="__all">All inspectors</option>
            {inspectorOptions.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
        {activeFilters > 0 || query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResult("all");
              setInspectorFilter("__all");
            }}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline justify-self-start"
          >
            Reset filters
          </button>
        ) : null}
      </Card>

      {!storeLoaded ? (
        <div className="grid gap-3" aria-label="Loading inspections">
          <span className="skeleton block h-24 rounded-2xl" />
          <span className="skeleton block h-24 rounded-2xl" aria-hidden />
          <span className="skeleton block h-24 rounded-2xl" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-[var(--color-text-muted)]">
            No inspection records match your filters.
          </p>
          {canLog ? (
            <div className="justify-self-center">
              <Link href="/inspections/new">
                <Button variant="primary">Log your first inspection</Button>
              </Link>
            </div>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((rec) => (
            <InspectionRow
              key={rec.id}
              rec={rec}
              anchorLabel={anchorById.get(rec.anchorId)}
              canEdit={canEdit}
              canDelete={canDelete}
              onDelete={remove}
            />
          ))}
        </div>
      )}
    </>
  );
}

function InspectionRow({
  rec,
  anchorLabel,
  canEdit,
  canDelete,
  onDelete,
}: {
  rec: Inspection;
  anchorLabel?: string;
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="relative group">
      <Link
        href={`/anchors/${encodeURIComponent(rec.anchorId)}`}
        aria-label={`Open anchor ${rec.anchorId}`}
        className="block focus-visible:outline-none"
      >
        <article
          className="
            relative overflow-hidden
            rounded-2xl
            bg-[var(--color-surface)]
            border border-[var(--color-border)]
            shadow-[var(--shadow-sm)]
            pl-5 pr-4 py-4
            grid gap-3
            transition-all duration-200
            group-hover:-translate-y-0.5
            group-hover:shadow-[var(--shadow-md)]
            group-hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]
            group-active:translate-y-0
            group-active:scale-[0.997]
          "
        >
          <div
            aria-hidden
            className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
            style={{ background: RESULT_COLOR[rec.result] }}
          />
          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-[var(--color-text)]">
                  {rec.anchorId}
                </strong>
                <span className="text-sm text-[var(--color-text-muted)] truncate">
                  {anchorLabel || "Unknown anchor"}
                </span>
                <ResultPill result={rec.result} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 inline-flex items-center gap-1.5 flex-wrap">
                <strong className="text-[var(--color-text)] font-semibold">
                  {formatDate(rec.testDate)}
                </strong>
                <span className="text-[var(--color-text-faint)]">·</span>
                <InspectorTag name={rec.inspector} size={18} />
              </p>
              <SubmittedByChip
                name={rec.submittedByName}
                role={rec.submittedByRole}
                className="mt-1.5"
              />
              {rec.notes ? (
                <p className="text-xs text-[var(--color-text-muted)] mt-2 line-clamp-2">
                  {rec.notes}
                </p>
              ) : null}
            </div>
            <ChevronRight
              size={20}
              className="shrink-0 text-[var(--color-text-faint)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)] mt-1"
              aria-hidden
            />
          </div>
        </article>
      </Link>
      {canEdit || canDelete ? (
        <div
          className="
            absolute right-3 bottom-3 flex items-center gap-1
            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
            transition-opacity
            sm:opacity-100
          "
        >
          {canEdit ? (
            <Link
              href={`/inspections/new?id=${encodeURIComponent(rec.id)}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]"
              aria-label="Edit inspection"
            >
              <PencilLine size={14} />
            </Link>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete(rec.id)}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-error-highlight)] text-[var(--color-error)] hover:opacity-90"
              aria-label="Delete inspection"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
