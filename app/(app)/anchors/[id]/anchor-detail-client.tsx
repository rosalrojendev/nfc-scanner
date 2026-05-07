"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/input";
import { useAnchors, useInspections, patchAnchor } from "@/lib/store";
import { formatDate, daysUntil } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/components/shell/session-provider";
import { can } from "@/lib/permissions";
import {
  ChevronLeft,
  ClipboardCheck,
  Map as MapIcon,
  PencilLine,
  History,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import type { Anchor } from "@/lib/types";
import { NfcWriter } from "@/components/scan/nfc-writer";
import { buildPayload } from "@/lib/nfc-payload";

export function AnchorDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const anchors = useAnchors();
  const inspections = useInspections();
  const anchor = anchors.find((a) => a.id === id);
  const history = React.useMemo(
    () =>
      inspections
        .filter((i) => i.anchorId === id)
        .sort(
          (a, b) =>
            new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
        ),
    [inspections, id],
  );

  const session = useSession();
  const canEdit = can.editAnchor(session.role);
  const canLog = can.logInspection(session.role);
  const canWriteTag = can.writeNfc(session.role);
  const [editOpen, setEditOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Partial<Anchor>>({});

  if (!anchor) {
    return (
      <Card>
        <div>
          <Eyebrow>Not found</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight mt-1">
            Anchor {id} could not be located
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            It may have been deleted or never existed.
          </p>
        </div>
        <div>
          <Link href="/anchors">
            <Button>
              <ChevronLeft size={16} /> Back to anchors
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  const days = anchor.nextDue ? daysUntil(anchor.nextDue) : null;

  function startEdit() {
    setDraft({
      label: anchor!.label,
      building: anchor!.building,
      location: anchor!.location,
      drawing: anchor!.drawing,
    });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!anchor) return;
    try {
      await patchAnchor(anchor.id, {
        label: draft.label,
        building: draft.building,
        location: draft.location,
        drawing: draft.drawing,
      });
      setEditOpen(false);
      notify("Anchor updated.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 -mb-2">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft size={18} /> Back
        </button>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Anchor record</Eyebrow>
            <h1 className="text-xl font-semibold tracking-tight mt-1">
              {anchor.label}
            </h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {anchor.building} · {anchor.location}
            </p>
          </div>
          {anchor.status === "pass" ? (
            <Badge variant="success">
              <ShieldCheck size={14} /> Pass
            </Badge>
          ) : anchor.status === "due" ? (
            <Badge variant="warning">
              <AlertTriangle size={14} /> Due soon
            </Badge>
          ) : (
            <Badge variant="error">
              <AlertOctagon size={14} /> Failed
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <KV label="Anchor ID" value={anchor.id} />
          <KV label="NFC tag" value={anchor.nfcTag || "—"} />
          <KV label="QR code" value={anchor.qrCode || anchor.id} />
          <KV label="Drawing" value={anchor.drawing} />
          <KV label="Last tested" value={formatDate(anchor.lastTested)} />
          <KV
            label="Retest due"
            value={
              anchor.nextDue
                ? `${formatDate(anchor.nextDue)}${days !== null ? ` (${days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`})` : ""}`
                : "—"
            }
          />
          <KV label="Inspector" value={anchor.inspector || "—"} />
          <KV label="Proof result" value={anchor.proofResult || "—"} />
        </div>

        <div className="flex flex-wrap gap-2">
          {canLog ? (
            <Link
              href={`/inspections/new?anchor=${encodeURIComponent(anchor.id)}`}
            >
              <Button variant="primary">
                <ClipboardCheck size={16} /> Add re-test
              </Button>
            </Link>
          ) : null}
          <Link href="/drawings">
            <Button>
              <MapIcon size={16} /> Open drawing
            </Button>
          </Link>
          {canEdit ? (
            <Button onClick={startEdit}>
              <PencilLine size={16} /> Edit metadata
            </Button>
          ) : null}
        </div>
      </Card>

      {canWriteTag ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>NFC tag</Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                Write latest metadata to tag
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                Encodes asset ID, last inspector, timestamp, status, and notes
                (≤ 5 MB). Photos stay in cloud storage.
              </p>
            </div>
          </div>
          <NfcWriter
            payload={buildPayload({
              anchor,
              inspection: history[0] ?? null,
            })}
          />
        </Card>
      ) : null}

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow>Test history</Eyebrow>
            <h2 className="text-lg font-semibold tracking-tight mt-1">
              <History size={16} className="inline mr-2" />
              Previous inspections
            </h2>
          </div>
          <Badge variant="default">{history.length} record{history.length === 1 ? "" : "s"}</Badge>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No inspections recorded for this anchor yet.
          </p>
        ) : (
          history.map((rec) => (
            <article
              key={rec.id}
              className="p-4 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-sm">
                    {formatDate(rec.testDate)} · {rec.inspector}
                  </strong>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {rec.proofLoad || "—"} · Drawing {rec.drawingRef || "—"}
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
              {rec.photos.length > 0 ? (
                <>
                  <div className="flex gap-2 overflow-auto -mx-1 px-1">
                    {rec.photos.map((p, i) => (
                      <Link
                        key={i}
                        href={p}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative shrink-0 group"
                        aria-label={`Open photo ${i + 1} in new tab`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p}
                          alt={`Inspection photo ${i + 1}`}
                          className="w-28 h-20 object-cover rounded-xl border border-[var(--color-border)] group-hover:opacity-80 transition"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 grid place-items-center">
                          <ExternalLink size={12} />
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    {rec.photos.map((p, i) => (
                      <Link
                        key={i}
                        href={p}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--color-primary)] font-semibold"
                      >
                        <ImageIcon size={12} /> Photo {i + 1} URL
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}
              {can.editInspection(session.role) ? (
                <div className="flex justify-end">
                  <Link
                    href={`/inspections/new?id=${encodeURIComponent(rec.id)}`}
                    className="text-sm text-[var(--color-primary)] font-semibold"
                  >
                    Edit
                  </Link>
                </div>
              ) : null}
            </article>
          ))
        )}
      </Card>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        ariaLabel="Edit anchor metadata"
      >
        <Eyebrow>Edit anchor</Eyebrow>
        <h3 className="text-lg font-semibold tracking-tight">
          Update {anchor.id}
        </h3>
        <div className="grid gap-3">
          <Field>
            <Label htmlFor="anchor-label">Label</Label>
            <Input
              id="anchor-label"
              value={draft.label || ""}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="anchor-building">Building</Label>
            <Input
              id="anchor-building"
              value={draft.building || ""}
              onChange={(e) =>
                setDraft({ ...draft, building: e.target.value })
              }
            />
          </Field>
          <Field>
            <Label htmlFor="anchor-location">Location</Label>
            <Input
              id="anchor-location"
              value={draft.location || ""}
              onChange={(e) =>
                setDraft({ ...draft, location: e.target.value })
              }
            />
          </Field>
          <Field>
            <Label htmlFor="anchor-drawing">Drawing reference</Label>
            <Input
              id="anchor-drawing"
              value={draft.drawing || ""}
              onChange={(e) =>
                setDraft({ ...draft, drawing: e.target.value })
              }
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit}>
            Save changes
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm">
      <span className="block text-[var(--color-text-muted)] text-[0.72rem] uppercase tracking-wider mb-1">
        {label}
      </span>
      {value}
    </div>
  );
}
