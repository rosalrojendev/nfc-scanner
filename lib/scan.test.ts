import { describe, expect, it } from "vitest";
import { resolveScanPayload } from "./scan";
import type { Anchor } from "./types";

// Minimal anchor factory — only the fields resolveScanPayload reads.
function makeAnchor(overrides: Partial<Anchor> & Pick<Anchor, "id">): Anchor {
  return {
    id: overrides.id,
    projectId: overrides.projectId ?? "p-1",
    label: overrides.label ?? overrides.id,
    building: overrides.building ?? "Civic Plaza",
    location: overrides.location ?? "Roof B",
    drawing: overrides.drawing ?? "B-1",
    status: overrides.status ?? "pass",
    lastTested: overrides.lastTested ?? null,
    nextDue: overrides.nextDue ?? null,
    inspector: overrides.inspector ?? null,
    proofResult: overrides.proofResult ?? null,
    nfcTag: overrides.nfcTag,
    qrCode: overrides.qrCode,
    position: overrides.position,
    deletedAt: overrides.deletedAt ?? null,
    deletedBy: overrides.deletedBy ?? null,
    deletedByName: overrides.deletedByName ?? null,
  };
}

const ANCHORS: Anchor[] = [
  makeAnchor({ id: "RA-03", nfcTag: "NFC-RA-03-BC", qrCode: "QR-CUSTOM-03" }),
  makeAnchor({ id: "WJ-A-001" }),
  makeAnchor({ id: "RA-100" }),
];

describe("resolveScanPayload", () => {
  describe("empty input", () => {
    it("returns null for empty string", () => {
      expect(resolveScanPayload("", ANCHORS)).toBeNull();
    });

    it("returns null for whitespace-only", () => {
      expect(resolveScanPayload("   ", ANCHORS)).toBeNull();
    });
  });

  describe("Strategy 1: direct ID / qrCode / nfcTag match", () => {
    it("matches by exact anchor id", () => {
      const match = resolveScanPayload("RA-03", ANCHORS);
      expect(match?.id).toBe("RA-03");
    });

    it("is case-insensitive", () => {
      expect(resolveScanPayload("ra-03", ANCHORS)?.id).toBe("RA-03");
      expect(resolveScanPayload("Ra-03", ANCHORS)?.id).toBe("RA-03");
    });

    it("trims whitespace before matching", () => {
      expect(resolveScanPayload("  RA-03  ", ANCHORS)?.id).toBe("RA-03");
    });

    it("matches via custom qrCode override", () => {
      expect(resolveScanPayload("QR-CUSTOM-03", ANCHORS)?.id).toBe("RA-03");
    });

    it("matches via custom nfcTag override", () => {
      expect(resolveScanPayload("NFC-RA-03-BC", ANCHORS)?.id).toBe("RA-03");
    });

    it("anchors without qrCode/nfcTag still match by id only", () => {
      expect(resolveScanPayload("WJ-A-001", ANCHORS)?.id).toBe("WJ-A-001");
    });
  });

  describe("Strategy 2: URL with anchor id as last path segment", () => {
    it("matches https URL ending in anchor id", () => {
      expect(
        resolveScanPayload("https://anchortag.app/anchors/RA-03", ANCHORS)?.id,
      ).toBe("RA-03");
    });

    it("matches http URL ending in anchor id", () => {
      expect(
        resolveScanPayload("http://localhost:3000/anchors/RA-03", ANCHORS)?.id,
      ).toBe("RA-03");
    });

    it("uses last path segment, not first", () => {
      // The path contains both "WJ-A-001" and "RA-03"; the last segment wins.
      expect(
        resolveScanPayload(
          "https://example.com/projects/WJ-A-001/anchors/RA-03",
          ANCHORS,
        )?.id,
      ).toBe("RA-03");
    });

    it("strips encoded characters", () => {
      expect(
        resolveScanPayload(
          "https://anchortag.app/anchors/" + encodeURIComponent("WJ-A-001"),
          ANCHORS,
        )?.id,
      ).toBe("WJ-A-001");
    });
  });

  describe("Strategy 3: substring fallback", () => {
    it("matches when anchor id appears inside a JSON-ish blob", () => {
      const json = `{"id":"RA-03","building":"Civic Plaza"}`;
      expect(resolveScanPayload(json, ANCHORS)?.id).toBe("RA-03");
    });

    it("matches even with surrounding text", () => {
      expect(
        resolveScanPayload("see anchor RA-03 on roof B", ANCHORS)?.id,
      ).toBe("RA-03");
    });

    it("does not match if the substring would prefer a longer id", () => {
      // "RA-100" should match itself, not "RA-03", even though both share "RA-".
      expect(resolveScanPayload("RA-100", ANCHORS)?.id).toBe("RA-100");
    });
  });

  describe("no match", () => {
    it("returns null when nothing matches", () => {
      expect(resolveScanPayload("not-an-anchor", ANCHORS)).toBeNull();
    });

    it("returns null for an empty anchor list", () => {
      expect(resolveScanPayload("RA-03", [])).toBeNull();
    });
  });
});
