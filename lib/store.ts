"use client";

import { useSyncExternalStore } from "react";
import type { Anchor, Inspection, InspectionResult } from "./types";
import { SEED_ANCHORS, SEED_INSPECTIONS } from "./seed";
import { withFetch } from "./loading-state";

let anchorsCache: Anchor[] = SEED_ANCHORS;
let inspectionsCache: Inspection[] = SEED_INSPECTIONS;
// Mirrored caches that drop soft-deleted rows. Kept in lockstep with the
// full cache below so that useSyncExternalStore consumers see a stable
// reference between updates (filtering inline on each read would create a
// new array every render and break React's snapshot equality check).
let anchorsCacheActive: Anchor[] = SEED_ANCHORS;
let inspectionsCacheActive: Inspection[] = SEED_INSPECTIONS;
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

function setAnchorsCache(next: Anchor[]) {
  anchorsCache = next;
  anchorsCacheActive = next.filter((a) => !a.deletedAt);
}

function setInspectionsCache(next: Inspection[]) {
  inspectionsCache = next;
  inspectionsCacheActive = next.filter((i) => !i.deletedAt);
}

const listeners = new Set<() => void>();

function isClient() {
  return typeof window !== "undefined";
}

function notify() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (isClient() && !bootstrapped && !bootstrapping) {
    void bootstrap();
  }
  return () => {
    listeners.delete(listener);
  };
}

// We fetch WITH soft-deleted records so the dashboard activity feed can
// surface "X deleted Y" events. The default `useAnchors` / `useInspections`
// hooks filter `deletedAt` out, so list pages still see active records only.
async function bootstrap(): Promise<void> {
  if (!isClient() || bootstrapped) return;
  bootstrapping ??= withFetch(async () => {
    try {
      const [a, i] = await Promise.all([
        fetch("/api/anchors?with_deleted=1", { credentials: "include" }),
        fetch("/api/inspections?with_deleted=1", { credentials: "include" }),
      ]);
      if (a.ok) {
        const j = (await a.json()) as { anchors: Anchor[] };
        setAnchorsCache(j.anchors);
      }
      if (i.ok) {
        const j = (await i.json()) as { inspections: Inspection[] };
        setInspectionsCache(j.inspections);
      }
      bootstrapped = true;
      notify();
    } finally {
      bootstrapping = null;
    }
  });
  await bootstrapping;
}

export async function refetchAnchors(): Promise<void> {
  if (!isClient()) return;
  await withFetch(async () => {
    const r = await fetch("/api/anchors?with_deleted=1", {
      credentials: "include",
    });
    if (!r.ok) return;
    const j = (await r.json()) as { anchors: Anchor[] };
    setAnchorsCache(j.anchors);
    notify();
  });
}

export async function refetchInspections(): Promise<void> {
  if (!isClient()) return;
  await withFetch(async () => {
    const r = await fetch("/api/inspections?with_deleted=1", {
      credentials: "include",
    });
    if (!r.ok) return;
    const j = (await r.json()) as { inspections: Inspection[] };
    setInspectionsCache(j.inspections);
    notify();
  });
}

export async function refetchAll(): Promise<void> {
  await Promise.all([refetchAnchors(), refetchInspections()]);
}

// Default surface = active only. Most pages should never see soft-deleted
// records. The activity feed uses getAllAnchors() / useAllAnchors() to opt
// in to the full cache including tombstones.
export function getAnchors(): Anchor[] {
  return anchorsCacheActive;
}

export function getAllAnchors(): Anchor[] {
  return anchorsCache;
}

export function getAnchor(id: string): Anchor | null {
  return anchorsCache.find((a) => a.id === id) || null;
}

export async function createAnchor(payload: {
  id: string;
  projectId: string;
  label: string;
  building: string;
  location: string;
  drawing: string;
}): Promise<Anchor> {
  const r = await fetch("/api/anchors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to create anchor (${r.status})`);
  }
  await refetchAnchors();
  const j = (await r.json()) as { anchor: Anchor };
  return j.anchor;
}

export async function patchAnchor(
  id: string,
  patch: Partial<Pick<Anchor, "label" | "building" | "location" | "drawing">>,
): Promise<Anchor> {
  const r = await fetch(`/api/anchors/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to update anchor (${r.status})`);
  }
  await refetchAll();
  const j = (await r.json()) as { anchor: Anchor };
  return j.anchor;
}

export function getInspections(): Inspection[] {
  return inspectionsCacheActive;
}

export function getAllInspections(): Inspection[] {
  return inspectionsCache;
}

export function getInspectionsForAnchor(anchorId: string): Inspection[] {
  return inspectionsCacheActive
    .filter((i) => i.anchorId === anchorId)
    .sort(
      (a, b) =>
        new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
    );
}

export function getInspection(id: string): Inspection | null {
  return inspectionsCache.find((i) => i.id === id) || null;
}

export interface InspectionPayload {
  anchorId: string;
  inspector: string;
  testDate: string;
  nextDueDate: string;
  result: InspectionResult;
  proofLoad: string;
  drawingRef: string;
  notes: string;
  photos: string[];
  signature: string;
}

export async function createInspection(
  payload: InspectionPayload,
): Promise<Inspection> {
  const r = await fetch("/api/inspections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to save inspection (${r.status})`);
  }
  await refetchAll();
  const j = (await r.json()) as { inspection: Inspection };
  return j.inspection;
}

export async function updateInspection(
  id: string,
  payload: InspectionPayload,
): Promise<Inspection> {
  const r = await fetch(`/api/inspections/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to update inspection (${r.status})`);
  }
  await refetchAll();
  const j = (await r.json()) as { inspection: Inspection };
  return j.inspection;
}

export async function deleteAnchorById(id: string): Promise<void> {
  const r = await fetch(`/api/anchors/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to delete anchor (${r.status})`);
  }
  await refetchAll();
}

export async function deleteInspectionById(id: string): Promise<void> {
  const r = await fetch(`/api/inspections/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to delete inspection (${r.status})`);
  }
  await refetchInspections();
}

export async function resetServerStore(): Promise<void> {
  const r = await fetch("/api/admin/reset", {
    method: "POST",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to reset (${r.status})`);
  }
  await refetchAll();
}

export function useAnchors(): Anchor[] {
  return useSyncExternalStore(subscribe, getAnchors, () => SEED_ANCHORS);
}

export function useAllAnchors(): Anchor[] {
  return useSyncExternalStore(subscribe, getAllAnchors, () => SEED_ANCHORS);
}

export function useInspections(): Inspection[] {
  return useSyncExternalStore(subscribe, getInspections, () => SEED_INSPECTIONS);
}

export function useAllInspections(): Inspection[] {
  return useSyncExternalStore(subscribe, getAllInspections, () => SEED_INSPECTIONS);
}

function getLoaded(): boolean {
  return bootstrapped;
}

// True once the first /api/anchors + /api/inspections fetch has completed.
// Consumers should render skeleton placeholders while false instead of
// treating the seed-array fallback as real data.
export function useStoreLoaded(): boolean {
  return useSyncExternalStore(subscribe, getLoaded, () => false);
}
