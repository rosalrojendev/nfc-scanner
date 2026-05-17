"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, Label, Field } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { Segmented } from "@/components/ui/segmented";
import { useAnchors, useStoreLoaded } from "@/lib/store";
import { useProjectContext } from "@/components/shell/project-provider";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { formatDate, daysUntil } from "@/lib/utils";
import type { AnchorStatus } from "@/lib/types";
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Plus,
} from "lucide-react";
import { InspectorTag } from "@/components/inspector-tag";
import { NewAnchorDialog } from "@/components/anchors/new-anchor-dialog";

type Filter = "all" | "pass" | "due" | "failed";
type Sort = "due" | "tested" | "alpha";

const STATUS_COLOR: Record<AnchorStatus, string> = {
  pass: "var(--color-success)",
  due: "var(--color-warning)",
  failed: "var(--color-error)",
};

function StatusPill({ status }: { status: AnchorStatus }) {
  if (status === "pass")
    return (
      <Badge variant="success">
        <CheckCircle2 size={12} /> Pass
      </Badge>
    );
  if (status === "due")
    return (
      <Badge variant="warning">
        <AlertTriangle size={12} /> Due
      </Badge>
    );
  return (
    <Badge variant="error">
      <AlertOctagon size={12} /> Failed
    </Badge>
  );
}

export function AnchorsClient() {
  const allAnchors = useAnchors();
  const storeLoaded = useStoreLoaded();
  const { currentProjectId } = useProjectContext();
  const session = useSession();
  const canCreate = can.editAnchor(session.role);
  const anchors = React.useMemo(
    () =>
      currentProjectId
        ? allAnchors.filter((a) => a.projectId === currentProjectId)
        : allAnchors,
    [allAnchors, currentProjectId],
  );
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");
  const [building, setBuilding] = React.useState<string>("__all");
  const [sort, setSort] = React.useState<Sort>("due");
  const [newOpen, setNewOpen] = React.useState(false);

  const buildings = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of anchors) set.add(a.building);
    return Array.from(set).sort();
  }, [anchors]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = anchors.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (building !== "__all" && a.building !== building) return false;
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q) ||
        a.building.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.drawing.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      if (sort === "alpha") return a.id.localeCompare(b.id);
      if (sort === "tested") {
        const at = a.lastTested ? new Date(a.lastTested).getTime() : 0;
        const bt = b.lastTested ? new Date(b.lastTested).getTime() : 0;
        return bt - at;
      }
      // due soonest
      const ad = a.nextDue ? daysUntil(a.nextDue) : 9999;
      const bd = b.nextDue ? daysUntil(b.nextDue) : 9999;
      return ad - bd;
    });

    return list;
  }, [anchors, query, filter, building, sort]);

  const activeFilters =
    (filter !== "all" ? 1 : 0) + (building !== "__all" ? 1 : 0);

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Anchor registry</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              Search and inspect anchors
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {storeLoaded ? (
              <Badge variant="default">
                {filtered.length} of {anchors.length}
              </Badge>
            ) : (
              <span className="skeleton inline-block h-6 w-20 rounded-full" aria-hidden />
            )}
            {canCreate ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setNewOpen(true)}
              >
                <Plus size={14} /> New anchor
              </Button>
            ) : null}
          </div>
        </div>
        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder="Search anchor ID, building, zone, or drawing"
          aria-label="Search anchors"
        />
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "pass", label: "Pass" },
            { value: "due", label: "Due" },
            { value: "failed", label: "Failed" },
          ]}
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field>
            <Label htmlFor="f-building">Building</Label>
            <Select
              id="f-building"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              <option value="__all">All buildings</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="f-sort">Sort by</Label>
            <Select
              id="f-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
            >
              <option value="due">Due soonest</option>
              <option value="tested">Most recently tested</option>
              <option value="alpha">Anchor ID (A → Z)</option>
            </Select>
          </Field>
        </div>
        {activeFilters > 0 || query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setBuilding("__all");
            }}
            className="text-xs font-semibold text-[var(--color-primary)] hover:underline justify-self-start"
          >
            Reset filters
          </button>
        ) : null}
      </Card>

      {!storeLoaded ? (
        <div className="grid gap-3" aria-label="Loading anchors">
          <span className="skeleton block h-24 rounded-2xl" />
          <span className="skeleton block h-24 rounded-2xl" aria-hidden />
          <span className="skeleton block h-24 rounded-2xl" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-[var(--color-text-muted)]">
            No anchors match your filters.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((a) => (
            <AnchorRow key={a.id} anchor={a} />
          ))}
        </div>
      )}
      {canCreate ? (
        <NewAnchorDialog
          open={newOpen}
          onClose={() => setNewOpen(false)}
        />
      ) : null}
    </>
  );
}

function AnchorRow({
  anchor: a,
}: {
  anchor: ReturnType<typeof useAnchors>[number];
}) {
  const days = a.nextDue ? daysUntil(a.nextDue) : null;
  const dueText =
    days === null
      ? "—"
      : days < 0
        ? `${Math.abs(days)}d overdue`
        : days <= 60
          ? `Due in ${days}d`
          : `Due ${formatDate(a.nextDue)}`;
  return (
    <Link
      href={`/anchors/${a.id}`}
      aria-label={`Open anchor ${a.id}`}
      className="group block focus-visible:outline-none"
    >
      <article
        className="
          relative overflow-hidden
          rounded-2xl
          bg-[var(--color-surface)]
          border border-[var(--color-border)]
          shadow-[var(--shadow-sm)]
          pl-5 pr-4 py-4
          grid grid-cols-[1fr_auto] items-center gap-3
          transition-all duration-200
          group-hover:-translate-y-0.5
          group-hover:shadow-[var(--shadow-md)]
          group-hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]
          group-active:translate-y-0
          group-active:scale-[0.997]
        "
      >
        {/* Status accent strip */}
        <div
          aria-hidden
          className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
          style={{ background: STATUS_COLOR[a.status] }}
        />

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <strong className="truncate">{a.label}</strong>
            <StatusPill status={a.status} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] truncate mt-0.5">
            {a.building} · {a.location}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>
              <span className="text-[var(--color-text-faint)] mr-1">
                Last tested
              </span>
              <strong className="text-[var(--color-text)] font-semibold">
                {formatDate(a.lastTested)}
              </strong>
            </span>
            <span
              className={
                days !== null && days < 0
                  ? "text-[var(--color-error)] font-semibold"
                  : days !== null && days <= 30
                    ? "text-[var(--color-warning)] font-semibold"
                    : ""
              }
            >
              <span className="text-[var(--color-text-faint)] mr-1">
                Retest
              </span>
              {dueText}
            </span>
            {a.inspector ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="text-[var(--color-text-faint)] mr-0.5">By</span>
                <InspectorTag name={a.inspector} size={18} />
              </span>
            ) : null}
            {a.drawing ? (
              <span>
                <span className="text-[var(--color-text-faint)] mr-1">
                  Drawing
                </span>
                {a.drawing}
              </span>
            ) : null}
          </div>
        </div>

        <ChevronRight
          size={20}
          className="shrink-0 text-text-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </article>
    </Link>
  );
}
