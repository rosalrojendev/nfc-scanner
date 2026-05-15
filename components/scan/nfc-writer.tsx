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
  mode?: NfcWriteMode;
}

export function NfcWriter({
  payload,
  onWritten,
  buttonLabel = "Write to NFC tag",
  mode = "both",
}: NfcWriterProps) {
  const supported =
    typeof window !== "undefined" && "NDEFReader" in window;
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
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
  const writeUrl = mode === "url" || mode === "both";
  const writeMime = mode === "mime" || mode === "both";
  const totalBytes =
    (writeMime ? encoded.bytes : 0) + (writeUrl ? urlBytes : 0);
  const withinLimit = totalBytes <= NFC_MAX_BYTES;

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
              message: { records: { recordType: string; mediaType?: string; data: string }[] },
              opts?: { signal?: AbortSignal; overwrite?: boolean },
            ) => Promise<void>;
          };
        }
      ).NDEFReader;
      const writer = new Ctor();
      const records: {
        recordType: string;
        mediaType?: string;
        data: string;
      }[] = [];
      if (writeUrl) {
        records.push({ recordType: "url", data: tagUrl });
      }
      if (writeMime) {
        records.push({
          recordType: "mime",
          mediaType: NFC_MIME_TYPE,
          data: encoded.json,
        });
      }
      await writer.write(
        { records },
        { signal: ctrl.signal, overwrite: true },
      );
      setSuccess(true);
      onWritten?.();
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Could not write tag. Hold the phone closer.";
      setError(message);
    } finally {
      setBusy(false);
    }
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
            ? `URL ${urlBytes} B + MIME ${encoded.bytes} B`
            : writeUrl
              ? `URL ${urlBytes} B`
              : `MIME ${encoded.bytes} B`}
          {" "}/ {NFC_MAX_BYTES.toLocaleString()} B max
        </span>
      </div>
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
