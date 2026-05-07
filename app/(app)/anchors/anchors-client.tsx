"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useAnchors } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import type { AnchorStatus } from "@/lib/types";
import { Search, ChevronRight } from "lucide-react";

type Filter = "all" | "pass" | "due" | "failed";

function statusBadge(status: AnchorStatus) {
  if (status === "pass")
    return <Badge variant="success">Pass</Badge>;
  if (status === "due")
    return <Badge variant="warning">Due soon</Badge>;
  return <Badge variant="error">Failed</Badge>;
}

export function AnchorsClient() {
  const anchors = useAnchors();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return anchors.filter((a) => {
      if (filter !== "all" && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.id.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q) ||
        a.building.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        a.drawing.toLowerCase().includes(q)
      );
    });
  }, [anchors, query, filter]);

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
          <Badge variant="success">{anchors.length} total</Badge>
        </div>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <Input
            type="search"
            placeholder="Search anchor ID, building, zone, or drawing"
            aria-label="Search anchors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
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
      </Card>

      {filtered.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-[var(--color-text-muted)]">
            No anchors match your search.
          </p>
        </Card>
      ) : (
        filtered.map((a) => (
          <Link
            key={a.id}
            href={`/anchors/${a.id}`}
            className="block"
            aria-label={`Open anchor ${a.id}`}
          >
            <article className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong>{a.label}</strong>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {a.building} · {a.location}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {statusBadge(a.status)}
                  <ChevronRight
                    size={18}
                    className="text-[var(--color-text-muted)]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <KV label="Last tested" value={formatDate(a.lastTested)} />
                <KV label="Retest due" value={formatDate(a.nextDue)} />
                <KV label="Inspector" value={a.inspector || "—"} />
                <KV label="Drawing" value={a.drawing} />
              </div>
            </article>
          </Link>
        ))
      )}
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface-2)] text-sm">
      <span className="block text-[var(--color-text-muted)] text-[0.72rem] uppercase tracking-wider mb-1">
        {label}
      </span>
      {value}
    </div>
  );
}
