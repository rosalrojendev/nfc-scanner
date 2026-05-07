"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Eyebrow } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Label } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { NfcScanner } from "@/components/scan/nfc-scanner";
import { QrScanner } from "@/components/scan/qr-scanner";
import { useAnchors, useInspections } from "@/lib/store";
import { resolveScanPayload } from "@/lib/scan";
import { formatDate } from "@/lib/utils";
import type { NfcTagPayload } from "@/lib/nfc-payload";
import { Sparkles, Image as ImageIcon, ExternalLink } from "lucide-react";
import { SubmittedByChip } from "@/components/submitted-by";
import { InspectorTag } from "@/components/inspector-tag";

type Mode = "nfc" | "qr" | "manual";

export function ScanClient() {
  const router = useRouter();
  const { notify } = useToast();
  const anchors = useAnchors();
  const inspections = useInspections();
  const [mode, setMode] = React.useState<Mode>("qr");
  const [manual, setManual] = React.useState("");
  const [lastPayload, setLastPayload] = React.useState<string | null>(null);
  const [lastDecoded, setLastDecoded] = React.useState<NfcTagPayload | null>(
    null,
  );
  const [matchedId, setMatchedId] = React.useState<string | null>(null);
  const [autoOpen, setAutoOpen] = React.useState(true);

  const handleResult = React.useCallback(
    (payload: string, meta?: { decoded: NfcTagPayload | null }) => {
      setLastPayload(payload);
      setLastDecoded(meta?.decoded ?? null);
      const match = resolveScanPayload(payload, anchors);
      if (match) {
        setMatchedId(match.id);
        notify(`Anchor ${match.id} found.`, "success");
        if (autoOpen) {
          router.push(`/anchors/${encodeURIComponent(match.id)}`);
        }
      } else {
        setMatchedId(null);
        notify(`No anchor matches "${payload.slice(0, 40)}".`, "error");
      }
    },
    [anchors, autoOpen, router, notify],
  );

  function demoScan() {
    const sample = anchors[0]?.id || "RA-03";
    handleResult(sample);
  }

  const matchedHistory = React.useMemo(() => {
    if (!matchedId) return [];
    return inspections
      .filter((i) => i.anchorId === matchedId)
      .sort(
        (a, b) =>
          new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
      );
  }, [inspections, matchedId]);
  const matchedAnchor = matchedId
    ? anchors.find((a) => a.id === matchedId)
    : null;

  return (
    <>
      <Card>
        <div>
          <Eyebrow>Scan anchor</Eyebrow>
          <h1 className="text-xl font-semibold tracking-tight mt-1">
            Identify an anchor by NFC, QR, or ID
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            NFC tags carry lightweight metadata only (asset ID, last inspector,
            timestamp, status, notes). Photos live in cloud storage and are
            shown as clickable links.
          </p>
        </div>
        <Segmented<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "qr", label: "QR / Camera" },
            { value: "nfc", label: "NFC" },
            { value: "manual", label: "Manual" },
          ]}
        />
        {mode === "qr" ? <QrScanner onResult={handleResult} /> : null}
        {mode === "nfc" ? <NfcScanner onResult={handleResult} /> : null}
        {mode === "manual" ? (
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) handleResult(manual.trim());
            }}
          >
            <Field>
              <Label htmlFor="manual-id">Anchor ID or QR payload</Label>
              <Input
                id="manual-id"
                placeholder="e.g. RA-03"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                autoCapitalize="characters"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" type="submit">
                Open record
              </Button>
              <Button type="button" onClick={demoScan}>
                <Sparkles size={16} /> Demo bypass
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="default" onClick={demoScan}>
              <Sparkles size={16} /> Demo bypass scan
            </Button>
            <label className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                className="!min-h-0 !w-4 !h-4 !p-0"
              />
              Auto-open anchor on scan
            </label>
          </div>
        )}
      </Card>

      {lastDecoded ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>Tag contents</Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                Decoded NFC payload
              </h2>
            </div>
            <Badge variant="primary">v{lastDecoded.v}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <KV label="Asset ID" value={lastDecoded.assetId} />
            <KV
              label="Status"
              value={lastDecoded.status ? lastDecoded.status.toUpperCase() : "—"}
            />
            <KV
              label="Last inspector"
              value={lastDecoded.inspectorName || "—"}
            />
            <KV
              label="Timestamp"
              value={
                lastDecoded.timestamp
                  ? formatDate(lastDecoded.timestamp)
                  : "—"
              }
            />
            <KV label="Building" value={lastDecoded.building || "—"} />
            <KV label="Drawing" value={lastDecoded.drawing || "—"} />
          </div>
          {lastDecoded.notes ? (
            <div className="p-3 rounded-xl bg-[var(--color-surface-2)] text-sm">
              <span className="block text-[var(--color-text-muted)] text-[0.72rem] uppercase tracking-wider mb-1">
                Notes
              </span>
              {lastDecoded.notes}
            </div>
          ) : null}
        </Card>
      ) : null}

      {matchedAnchor ? (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Eyebrow>Inspection history (cloud)</Eyebrow>
              <h2 className="text-lg font-semibold tracking-tight mt-1">
                {matchedAnchor.label}
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                {matchedAnchor.building} · {matchedAnchor.location}
              </p>
            </div>
            <Link href={`/anchors/${encodeURIComponent(matchedAnchor.id)}`}>
              <Button variant="primary" size="sm">
                Open full record
              </Button>
            </Link>
          </div>
          {matchedHistory.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              No inspections recorded yet for this anchor.
            </p>
          ) : (
            matchedHistory.slice(0, 4).map((rec) => (
              <article
                key={rec.id}
                className="p-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-border)] grid gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-sm inline-flex items-center gap-1.5 flex-wrap">
                      <strong>{formatDate(rec.testDate)}</strong>
                      <span className="text-[var(--color-text-faint)]">·</span>
                      <InspectorTag name={rec.inspector} size={20} />
                    </span>
                    <SubmittedByChip
                      name={rec.submittedByName}
                      role={rec.submittedByRole}
                      className="mt-1"
                    />
                    {rec.notes ? (
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {rec.notes}
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
                {rec.photos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rec.photos.map((url, i) => (
                      <Link
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
                      >
                        <ImageIcon size={14} /> Photo {i + 1}{" "}
                        <ExternalLink size={12} />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </Card>
      ) : null}

      {lastPayload ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Last scan payload:{" "}
          <span className="font-mono break-all">
            {lastPayload.slice(0, 200)}
            {lastPayload.length > 200 ? "…" : ""}
          </span>
        </p>
      ) : null}
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
