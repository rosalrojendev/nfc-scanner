"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Radio, X, Apple } from "lucide-react";
import {
  decodePayload,
  NFC_MIME_TYPE,
  type NfcTagPayload,
} from "@/lib/nfc-payload";

interface NfcScannerProps {
  onResult: (
    payload: string,
    meta?: { decoded: NfcTagPayload | null; serial?: string | null },
  ) => void;
}

interface NDEFRecordLite {
  recordType: string;
  mediaType?: string;
  data?: ArrayBuffer | DataView;
  encoding?: string;
}
interface NDEFMessageLite {
  records: NDEFRecordLite[];
}
interface NDEFReadingEventLite extends Event {
  message: NDEFMessageLite;
  serialNumber?: string;
}

function detectPlatform() {
  if (typeof navigator === "undefined") {
    return { isIOS: false, supported: null as boolean | null };
  }
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  const supported = "NDEFReader" in window;
  return { isIOS, supported };
}

export function NfcScanner({ onResult }: NfcScannerProps) {
  const [{ isIOS, supported }] = React.useState(detectPlatform);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function start() {
    setError(null);
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setError(
        "Web NFC is not available. Use Chrome on Android over HTTPS, or scan via QR.",
      );
      return;
    }
    try {
      const Ctor = (
        window as unknown as {
          NDEFReader: new () => {
            scan: (opts?: { signal?: AbortSignal }) => Promise<void>;
            addEventListener: (
              type: string,
              cb: (e: Event) => void,
            ) => void;
          };
        }
      ).NDEFReader;
      const reader = new Ctor();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      await reader.scan({ signal: ctrl.signal });
      setScanning(true);

      reader.addEventListener("readingerror", () => {
        setError("Could not read NFC tag. Try again.");
      });

      reader.addEventListener("reading", (event: Event) => {
        const e = event as NDEFReadingEventLite;
        const decoder = new TextDecoder();
        let mimeText: string | null = null;
        let urlText: string | null = null;
        let anyText: string | null = null;
        for (const r of e.message.records) {
          if (!r.data) continue;
          try {
            const view =
              r.data instanceof ArrayBuffer
                ? new DataView(r.data)
                : (r.data as DataView);
            const text = decoder.decode(view);
            if (!text) continue;
            if (r.recordType === "mime" && r.mediaType === NFC_MIME_TYPE) {
              mimeText = text;
            } else if (r.recordType === "url") {
              urlText = text;
            }
            if (!anyText) anyText = text;
          } catch {
            // ignore
          }
        }

        if (e.message.records.length === 0) {
          setError(
            "This tag is blank. Open an anchor and write to it from the detail page.",
          );
          return;
        }

        const payload = mimeText ?? urlText ?? anyText ?? e.serialNumber ?? "";
        if (!payload) return;

        ctrl.abort();
        setScanning(false);
        const decoded = decodePayload(payload);
        onResult(decoded ? decoded.assetId : payload, {
          decoded,
          serial: e.serialNumber || null,
        });
      });
    } catch (e) {
      setError(translateNfcError(e));
      setScanning(false);
    }
  }

  function translateNfcError(e: unknown): string {
    const raw = e instanceof Error ? e.message : String(e);
    const name = e instanceof Error ? e.name : "";
    const lower = raw.toLowerCase();
    if (
      name === "NotAllowedError" ||
      lower.includes("permission") ||
      lower.includes("not allowed")
    ) {
      return "NFC permission was denied or revoked. Tap the lock icon in Chrome's address bar → Permissions → set NFC to Allow, then try again.";
    }
    if (name === "NotSupportedError" || lower.includes("not supported")) {
      return "Web NFC isn't supported on this device or browser. Use Chrome on Android over HTTPS.";
    }
    if (lower.includes("aborted")) {
      return "Scan cancelled.";
    }
    if (name === "NotReadableError") {
      return "Could not read this NFC tag. Hold the phone closer or try a different position.";
    }
    return raw || "NFC reading failed. Tap your phone closer to the tag.";
  }

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setScanning(false);
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-5 text-center grid gap-2">
        <Radio
          size={36}
          className={`mx-auto ${scanning ? "animate-pulse" : ""}`}
          style={{ color: "var(--color-primary)" }}
        />
        <p className="text-sm font-semibold">
          {scanning ? "Hold the phone near the anchor tag…" : "Web NFC reader"}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {supported === null
            ? "Checking support…"
            : isIOS
              ? "iOS Safari does not expose Web NFC. Use the QR camera tab below, or open this app on Android Chrome."
              : supported
                ? "Supported on this device. Press Start NFC and tap the anchor."
                : "Web NFC is not supported in this browser. Use Chrome on Android over HTTPS, or fall back to QR."}
        </p>
        {isIOS ? (
          <p
            className="text-xs inline-flex items-center justify-center gap-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <Apple size={14} /> iPhone detected — switch to QR mode for camera
            scanning.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button
            variant="primary"
            onClick={start}
            disabled={!supported || isIOS}
          >
            <Radio size={16} /> Start NFC scan
          </Button>
        ) : (
          <Button onClick={stop}>
            <X size={16} /> Stop
          </Button>
        )}
      </div>

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
