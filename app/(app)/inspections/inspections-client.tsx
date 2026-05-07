"use client";

import * as React from "react";
import Link from "next/link";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAnchors,
  useInspections,
  deleteInspectionById,
} from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import { ClipboardCheck, Search, Trash2, PencilLine } from "lucide-react";

export function InspectionsClient() {
  const inspections = useInspections();
  const anchors = useAnchors();
  const [query, setQuery] = React.useState("");
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

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return inspections
      .slice()
      .sort(
        (a, b) =>
          new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
      )
      .filter((i) => {
        if (!q) return true;
        return (
          i.anchorId.toLowerCase().includes(q) ||
          i.inspector.toLowerCase().includes(q) ||
          i.result.toLowerCase().includes(q) ||
          (anchorById.get(i.anchorId) || "").toLowerCase().includes(q)
        );
      });
  }, [inspections, query, anchorById]);

  async function remove(id: string) {
    if (!confirm("Delete this inspection record?")) return;
    try {
      await deleteInspectionById(id);
      notify("Inspection deleted.");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  }

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Inspection log</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              All inspection records
            </h1>
          </div>
          {canLog ? (
            <Link href="/inspections/new">
              <Button variant="primary" size="sm">
                <ClipboardCheck size={16} /> New
              </Button>
            </Link>
          ) : null}
        </div>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <Input
            type="search"
            placeholder="Search by anchor, inspector, or result"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-11"
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-[var(--color-text-muted)]">
            No inspection records match your search.
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
        filtered.map((rec) => (
          <article
            key={rec.id}
            className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] grid gap-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong>
                  {rec.anchorId} ·{" "}
                  <span className="text-[var(--color-text-muted)] font-normal">
                    {anchorById.get(rec.anchorId) || "Unknown anchor"}
                  </span>
                </strong>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {formatDate(rec.testDate)} · {rec.inspector}
                </p>
                {rec.submittedByName ? (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Submitted by{" "}
                    <strong className="text-[var(--color-text)]">
                      {rec.submittedByName}
                    </strong>
                    {rec.submittedByRole ? ` (${rec.submittedByRole})` : ""}
                  </p>
                ) : null}
              </div>
              {rec.result === "pass" ? (
                <Badge variant="success">Pass</Badge>
              ) : rec.result === "review" ? (
                <Badge variant="warning">Review</Badge>
              ) : (
                <Badge variant="error">Failed</Badge>
              )}
            </div>
            {rec.notes ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                {rec.notes}
              </p>
            ) : null}
            <div className="flex items-center gap-2 justify-end">
              <Link href={`/anchors/${encodeURIComponent(rec.anchorId)}`}>
                <Button size="sm" variant="ghost">
                  Open anchor
                </Button>
              </Link>
              {canEdit ? (
                <Link
                  href={`/inspections/new?id=${encodeURIComponent(rec.id)}`}
                >
                  <Button size="sm">
                    <PencilLine size={14} /> Edit
                  </Button>
                </Link>
              ) : null}
              {canDelete ? (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => remove(rec.id)}
                >
                  <Trash2 size={14} /> Delete
                </Button>
              ) : null}
            </div>
          </article>
        ))
      )}
    </>
  );
}
