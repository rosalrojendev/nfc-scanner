import "server-only";
import type { Anchor, Inspection } from "./types";
import { SEED_ANCHORS, SEED_INSPECTIONS } from "./seed";

interface StoreState {
  anchors: Map<string, Anchor>;
  inspections: Map<string, Inspection>;
}

declare global {
  var __atpServerStore: StoreState | undefined;
}

function freshState(): StoreState {
  const anchors = new Map<string, Anchor>();
  for (const a of SEED_ANCHORS) anchors.set(a.id, structuredClone(a));
  const inspections = new Map<string, Inspection>();
  for (const i of SEED_INSPECTIONS)
    inspections.set(i.id, structuredClone(i));
  return { anchors, inspections };
}

const state: StoreState = globalThis.__atpServerStore ?? freshState();
globalThis.__atpServerStore = state;

export function listAnchors(): Anchor[] {
  return Array.from(state.anchors.values());
}

export function getAnchor(id: string): Anchor | null {
  return state.anchors.get(id) ?? null;
}

export function upsertAnchor(anchor: Anchor): Anchor {
  state.anchors.set(anchor.id, anchor);
  return anchor;
}

export function listInspections(filter?: {
  anchorId?: string;
}): Inspection[] {
  const all = Array.from(state.inspections.values());
  const filtered = filter?.anchorId
    ? all.filter((i) => i.anchorId === filter.anchorId)
    : all;
  return filtered.sort(
    (a, b) =>
      new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
  );
}

export function getInspection(id: string): Inspection | null {
  return state.inspections.get(id) ?? null;
}

export function saveInspection(inspection: Inspection): Inspection {
  state.inspections.set(inspection.id, inspection);

  const anchor = state.anchors.get(inspection.anchorId);
  if (anchor) {
    const status =
      inspection.result === "failed"
        ? "failed"
        : inspection.result === "review"
          ? "due"
          : "pass";
    state.anchors.set(anchor.id, {
      ...anchor,
      status,
      lastTested: inspection.testDate,
      nextDue: inspection.nextDueDate,
      inspector: inspection.inspector,
      proofResult: inspection.proofLoad,
    });
  }

  return inspection;
}

export function deleteInspection(id: string): boolean {
  return state.inspections.delete(id);
}

export function resetStore(): void {
  const next = freshState();
  state.anchors = next.anchors;
  state.inspections = next.inspections;
}
