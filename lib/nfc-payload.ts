import type { Anchor, Inspection } from "./types";

export const NFC_PAYLOAD_VERSION = 1;
export const NFC_MAX_BYTES = 5 * 1024 * 1024;
export const NFC_MIME_TYPE = "application/vnd.atp.tag+json";

export interface NfcTagPayload {
  v: number;
  assetId: string;
  inspectorName: string | null;
  inspectorId: string | null;
  timestamp: string | null;
  status: "pass" | "due" | "failed" | null;
  notes: string;
  building?: string;
  drawing?: string;
}

export function buildPayload({
  anchor,
  inspection,
  inspectorId,
}: {
  anchor: Anchor;
  inspection?: Inspection | null;
  inspectorId?: string | null;
}): NfcTagPayload {
  return {
    v: NFC_PAYLOAD_VERSION,
    assetId: anchor.id,
    inspectorName: inspection?.inspector ?? anchor.inspector ?? null,
    inspectorId: inspectorId ?? null,
    timestamp: inspection?.testDate ?? anchor.lastTested ?? null,
    status: inspection
      ? inspection.result === "failed"
        ? "failed"
        : inspection.result === "review"
          ? "due"
          : "pass"
      : anchor.status,
    notes: truncate(inspection?.notes ?? "", 480),
    building: anchor.building,
    drawing: anchor.drawing,
  };
}

export function encodePayload(payload: NfcTagPayload): {
  json: string;
  bytes: number;
  withinLimit: boolean;
} {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json).byteLength;
  return { json, bytes, withinLimit: bytes <= NFC_MAX_BYTES };
}

export function buildTagUrl(assetId: string, origin?: string): string {
  const base =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/anchors/${encodeURIComponent(assetId)}`;
}

export function decodePayload(raw: string): NfcTagPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.assetId === "string"
    ) {
      return {
        v: typeof parsed.v === "number" ? parsed.v : NFC_PAYLOAD_VERSION,
        assetId: parsed.assetId,
        inspectorName:
          typeof parsed.inspectorName === "string"
            ? parsed.inspectorName
            : null,
        inspectorId:
          typeof parsed.inspectorId === "string" ? parsed.inspectorId : null,
        timestamp:
          typeof parsed.timestamp === "string" ? parsed.timestamp : null,
        status:
          parsed.status === "pass" ||
          parsed.status === "due" ||
          parsed.status === "failed"
            ? parsed.status
            : null,
        notes: typeof parsed.notes === "string" ? parsed.notes : "",
        building:
          typeof parsed.building === "string" ? parsed.building : undefined,
        drawing:
          typeof parsed.drawing === "string" ? parsed.drawing : undefined,
      };
    }
  } catch {
    // not JSON
  }
  return null;
}

function truncate(value: string, max: number): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
