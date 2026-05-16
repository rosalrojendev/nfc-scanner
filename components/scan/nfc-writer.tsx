"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Radio, X, Check, Smartphone } from "lucide-react";
import {
  buildTagUrl,
  encodePayload,
  NFC_MAX_BYTES,
  NFC_MIME_TYPE,
  type NfcTagPayload,
} from "@/lib/nfc-payload";

type NfcWriteMode = "both" | "url" | "mime";

interface NfcWriterProps {
  payload: NfcTagPayload;
  onWritten?: () => void;
  buttonLabel?: string;
  /**
   * Initial write mode. Defaults to "url" because the URL alone fits even
   * on the smallest common stickers (NTAG213, ~110 usable bytes). The user
   * can opt into MIME metadata via a checkbox if their tags are bigger.
   */
  mode?: NfcWriteMode;
}

// Conservative usable-byte estimate for common cheap NFC tags after
// NDEF/header overhead. Below this, "small tag" warning won't appear.
const SMALL_TAG_BUDGET = 110;

export function NfcWriter({
  payload,
  onWritten,
  buttonLabel = "Write to NFC tag",
  mode = "url",
}: NfcWriterProps) {
  const supported =
    typeof window !== "undefined" && "NDEFReader" in window;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [includeMime, setIncludeMime] = React.useState(
    mode === "mime" || mode === "both",
  );
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const encoded = encodePayload(payload);
  const tagUrl = React.useMemo(
    () => buildTagUrl(payload.assetId),
    [payload.assetId],
  );
  const urlBytes = React.useMemo(
    () => new TextEncoder().encode(tagUrl).byteLength,
    [tagUrl],
  );
  const writeUrl = mode !== "mime"; // URL always written unless caller forces mime-only
  const writeMime = mode === "mime" || (mode !== "url" && includeMime);
  const totalBytes =
    (writeMime ? encoded.bytes : 0) + (writeUrl ? urlBytes : 0);
  const withinLimit = totalBytes <= NFC_MAX_BYTES;
  const mayExceedSmallTag = totalBytes > SMALL_TAG_BUDGET;

  async function write() {
    if (!supported) {
      setError(
        "Web NFC is not available on this device. Use Chrome on Android over HTTPS.",
      );
      return;
    }
    if (!withinLimit) {
      setError(
        `Payload is ${totalBytes} bytes, exceeds the ${NFC_MAX_BYTES} byte limit.`,
      );
      return;
    }
    setError(null);
    setSuccess(false);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const Ctor = (
        window as unknown as {
          NDEFReader: new () => {
            write: (
              message: {
                records: Array<{
                  recordType: string;
                  mediaType?: string;
                  data: string | ArrayBuffer | Uint8Array;
                }>;
              },
              opts?: { signal?: AbortSignal; overwrite?: boolean },
            ) => Promise<void>;
          };
        }
      ).NDEFReader;
      const writer = new Ctor();
      const records: Array<{
        recordType: string;
        mediaType?: string;
        data: string | ArrayBuffer | Uint8Array;
      }> = [];
      if (writeUrl) {
        // URL records accept strings directly.
        records.push({ recordType: "url", data: tagUrl });
      }
      if (writeMime) {
        // MIME records require ArrayBuffer / Uint8Array — strings are
        // rejected by Web NFC for non-textual record types.
        records.push({
          recordType: "mime",
          mediaType: NFC_MIME_TYPE,
          data: new TextEncoder().encode(encoded.json),
        });
      }
      await writer.write(
        { records },
        { signal: ctrl.signal, overwrite: true },
      );
      setSuccess(true);
      onWritten?.();
    } catch (e) {
      setError(translateWriteError(e));
    } finally {
      setBusy(false);
    }
  }

  function translateWriteError(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    const lower = raw.toLowerCase();
    if (lower.includes("io error") || lower.includes("not enough")) {
      if (writeMime && mayExceedSmallTag) {
        return "Tag rejected the write — it likely doesn't have enough memory for the metadata. Uncheck \"Also write metadata snapshot\" to write the URL only.";
      }
      return "Tag couldn't be written. Hold the phone steady against the tag for 2 seconds, or try a different tag (it may be read-only).";
    }
    if (lower.includes("aborted")) return "Write cancelled.";
    if (lower.includes("permission") || lower.includes("not allowed")) {
      return "NFC permission denied. Tap the lock icon in Chrome's address bar → Permissions → set NFC to Allow.";
    }
    return raw || "Could not write tag. Hold the phone closer.";
  }

  function cancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!busy ? (
          <Button variant="primary" type="button" onClick={write} disabled={!supported}>
            <Radio size={16} /> {buttonLabel}
          </Button>
        ) : (
          <Button type="button" onClick={cancel}>
            <X size={16} /> Cancel write
          </Button>
        )}
        <span className="text-xs text-[var(--color-text-muted)]">
          {writeUrl && writeMime
            ? `URL ${urlBytes} B + MIME ${encoded.bytes} B = ${totalBytes} B`
            : writeUrl
              ? `URL ${urlBytes} B`
              : `MIME ${encoded.bytes} B`}
        </span>
      </div>
      {mode !== "url" && mode !== "mime" ? (
        <label className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1.5 select-none">
          <input
            type="checkbox"
            checked={includeMime}
            onChange={(e) => setIncludeMime(e.target.checked)}
            className="!min-h-0 !w-4 !h-4 !p-0"
          />
          Also write metadata snapshot (needs an NTAG215+ sticker — ~470 B
          usable). Skip for small NTAG213 tags (~110 B usable).
        </label>
      ) : null}
      {writeMime && mayExceedSmallTag ? (
        <p
          className="text-xs"
          style={{ color: "var(--color-warning, #f59e0b)" }}
        >
          ⚠ Payload is {totalBytes} B. Small NTAG213 tags (~110 B usable) will
          reject this — use NTAG215 or write URL only.
        </p>
      ) : null}
      {!supported ? (
        <p className="text-xs text-[var(--color-text-muted)] inline-flex items-center gap-1">
          <Smartphone size={14} /> NFC writing requires Android Chrome over
          HTTPS.
        </p>
      ) : busy ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Tap the back of the phone against the NFC tag…
        </p>
      ) : null}
      {success ? (
        <p
          className="text-sm inline-flex items-center gap-1"
          style={{ color: "var(--color-success)" }}
        >
          <Check size={14} /> Tag updated.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="text-sm"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
