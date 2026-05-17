"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/input";
import {
  useAnchors,
  useInspections,
  patchAnchor,
  deleteAnchorById,
} from "@/lib/store";
import { useIsFetching } from "@/lib/loading-state";
import { ClimbingLoader } from "@/components/shell/climbing-loader";
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
  Trash2,
} from "lucide-react";
import type { Anchor } from "@/lib/types";
import { NfcWriter } from "@/components/scan/nfc-writer";
import { AnchorQrPanel } from "@/components/anchors/anchor-qr-panel";
import { buildPayload } from "@/lib/nfc-payload";
import { SubmittedByChip } from "@/components/submitted-by";
import { InspectorTag } from "@/components/inspector-tag";

export function AnchorDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const anchors = useAnchors();
  const inspections = useInspections();
  const isFetching = useIsFetching();
  const anchor = anchors.find((a) => a.id === id);
  // The server already verified this anchor exists and is accessible
  // (see page.tsx). If our local cache is still empty, we're just
  // mid-bootstrap — show the loader instead of flashing "not found".
  const stillLoading = !anchor && (anchors.length === 0 || isFetching);
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
  const canDelete = can.deleteAnchor(session.role);
  const [editOpen, setEditOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Partial<Anchor>>({});
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [serialOpen, setSerialOpen] = React.useState(false);
  const [serialDraft, setSerialDraft] = React.useState("");
  const [savingSerial, setSavingSerial] = React.useState(false);
  const confirmTokenNormalized = (anchor?.id ?? "").trim().toLowerCase();
  const canConfirmDelete =
    confirmTokenNormalized.length > 0 &&
    deleteConfirmText.trim().toLowerCase() === confirmTokenNormalized;

  if (stillLoading) {
    return (
      <Card>
        <ClimbingLoader label={`Loading anchor ${id}`} height={180} />
      </Card>
    );
  }

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
      nfcTag: anchor!.nfcTag ?? "",
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
        nfcTag: draft.nfcTag,
      });
      setEditOpen(false);
      notify("Anchor updated.", "success");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Update failed.", "error");
    }
  }

  function openDeleteDialog() {
    setDeleteConfirmText("");
    setDeleteOpen(true);
  }

  function handleNfcWritten() {
    // Only nudge the user to save a serial if we don't already have one.
    // Idea is to capture the printed sticker label once, never again.
    if (anchor && !anchor.nfcTag) {
      setSerialDraft("");
      setSerialOpen(true);
    }
  }

  async function saveSerial() {
    if (!anchor) return;
    const trimmed = serialDraft.trim();
    if (!trimmed) {
      setSerialOpen(false);
      return;
    }
    setSavingSerial(true);
    try {
      await patchAnchor(anchor.id, { nfcTag: trimmed });
      notify(`Chip serial saved for ${anchor.id}.`, "success");
      setSerialOpen(false);
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Could not save chip serial.",
        "error",
      );
    } finally {
      setSavingSerial(false);
    }
  }

  async function handleDelete() {
    if (!anchor || !canConfirmDelete) return;
    setDeleting(true);
    try {
      await deleteAnchorById(anchor.id);
      notify(`Anchor ${anchor.label} deleted.`, "success");
      router.push("/anchors");
      router.refresh();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Delete failed.", "error");
      setDeleting(false);
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
          <KV
            label="Inspector"
            value={
              anchor.inspector ? (
                <InspectorTag name={anchor.inspector} size={20} />
              ) : (
                "—"
              )
            }
          />
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
          {canDelete ? (
            <Button
              variant="danger"
              onClick={openDeleteDialog}
              disabled={deleting}
            >
              <Trash2 size={16} />
              {deleting ? "Deleting…" : "Delete anchor"}
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
            onWritten={handleNfcWritten}
          />
        </Card>
      ) : null}

      <Card>
        <AnchorQrPanel anchor={anchor} />
      </Card>

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
              className="p-5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-sm inline-flex items-center gap-1.5 flex-wrap">
                    <strong>{formatDate(rec.testDate)}</strong>
                    <span className="text-[var(--color-text-faint)]">·</span>
                    <InspectorTag name={rec.inspector} size={20} />
                  </span>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    {rec.proofLoad || "—"} · Drawing {rec.drawingRef || "—"}
                  </p>
                  <SubmittedByChip
                    name={rec.submittedByName}
                    role={rec.submittedByRole}
                    className="mt-1"
                  />
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
          <Field>
            <Label htmlFor="anchor-nfctag">
              NFC chip serial{" "}
              <span className="text-[var(--color-text-muted)] font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="anchor-nfctag"
              value={draft.nfcTag || ""}
              onChange={(e) => setDraft({ ...draft, nfcTag: e.target.value })}
              placeholder="e.g. NFC-RA-03-BC"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              Serial printed on the physical chip / sticker. Lets scans of the
              raw serial resolve to this anchor.
            </p>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={saveEdit}>
            Save changes
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => (deleting ? undefined : setDeleteOpen(false))}
        ariaLabel="Delete anchor"
      >
        <Eyebrow>Delete anchor</Eyebrow>
        <h3 className="text-lg font-semibold tracking-tight inline-flex items-center gap-2">
          <AlertOctagon
            size={20}
            style={{ color: "var(--color-error)" }}
            aria-hidden
          />
          You&apos;re about to delete {anchor.label}
        </h3>
        <div
          className="p-4 rounded-2xl text-sm grid gap-1.5"
          style={{
            background: "var(--color-error-highlight)",
            color: "var(--color-text)",
          }}
        >
          <p>
            This anchor and its inspection history will no longer appear in
            the registry. The record is soft-deleted, so:
          </p>
          <ul className="list-disc pl-5 grid gap-1 text-[var(--color-text-muted)]">
            <li>Past inspections stay in the database for audit.</li>
            <li>
              The deletion appears on the dashboard activity feed with your
              name attached.
            </li>
            <li>
              The anchor cannot be re-created with the same ID until restored
              by a platform admin.
            </li>
          </ul>
        </div>
        <Field>
          <Label htmlFor="confirm-delete">
            Type{" "}
            <code className="px-1 py-0.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] font-mono text-xs">
              {anchor.id}
            </code>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-delete"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canConfirmDelete && !deleting) {
                e.preventDefault();
                handleDelete();
              }
            }}
            placeholder={anchor.id}
            disabled={deleting}
          />
        </Field>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!canConfirmDelete || deleting}
          >
            <Trash2 size={16} />
            {deleting ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={serialOpen}
        onClose={() => (savingSerial ? undefined : setSerialOpen(false))}
        ariaLabel="Save NFC chip serial"
      >
        <Eyebrow>NFC chip</Eyebrow>
        <h3 className="text-lg font-semibold tracking-tight">
          Tag written — save the chip serial?
        </h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          Recording the serial on the sticker label lets a scanner reading the
          raw serial number resolve to {anchor.id}. Optional — skip if you
          don&apos;t have a printed serial.
        </p>
        <Field>
          <Label htmlFor="anchor-serial">Chip serial</Label>
          <Input
            id="anchor-serial"
            value={serialDraft}
            onChange={(e) => setSerialDraft(e.target.value)}
            placeholder="e.g. NFC-RA-03-BC"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            disabled={savingSerial}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                serialDraft.trim().length > 0 &&
                !savingSerial
              ) {
                e.preventDefault();
                void saveSerial();
              }
            }}
          />
        </Field>
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            onClick={() => setSerialOpen(false)}
            disabled={savingSerial}
          >
            Skip
          </Button>
          <Button
            variant="primary"
            onClick={saveSerial}
            disabled={!serialDraft.trim() || savingSerial}
          >
            {savingSerial ? "Saving…" : "Save serial"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

function KV({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-sm">
      <span className="block text-[var(--color-text-muted)] text-[0.72rem] uppercase tracking-wider mb-1">
        {label}
      </span>
      {value}
    </div>
  );
}
