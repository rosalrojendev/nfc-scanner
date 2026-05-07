import type { Anchor } from "./types";

export function resolveScanPayload(
  payload: string,
  anchors: Anchor[],
): Anchor | null {
  if (!payload) return null;
  const cleaned = payload.trim();
  if (!cleaned) return null;

  // Try direct ID match
  let match = anchors.find(
    (a) =>
      a.id.toLowerCase() === cleaned.toLowerCase() ||
      a.qrCode?.toLowerCase() === cleaned.toLowerCase() ||
      a.nfcTag?.toLowerCase() === cleaned.toLowerCase(),
  );
  if (match) return match;

  // Try URL form like https://anchor.app/a/RA-03
  try {
    const url = new URL(cleaned);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last) {
      match = anchors.find(
        (a) => a.id.toLowerCase() === last.toLowerCase(),
      );
      if (match) return match;
    }
  } catch {
    // not a URL
  }

  // Substring fallback
  match = anchors.find((a) =>
    cleaned.toLowerCase().includes(a.id.toLowerCase()),
  );
  return match || null;
}
