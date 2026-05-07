"use client";

import { useSyncExternalStore } from "react";
import type { Anchor, Inspection, InspectionResult } from "./types";
import { SEED_ANCHORS, SEED_INSPECTIONS } from "./seed";

let anchorsCache: Anchor[] = SEED_ANCHORS;
let inspectionsCache: Inspection[] = SEED_INSPECTIONS;
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

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

async function bootstrap(): Promise<void> {
  if (!isClient() || bootstrapped) return;
  bootstrapping ??= (async () => {
    try {
      const [a, i] = await Promise.all([
        fetch("/api/anchors", { credentials: "include" }),
        fetch("/api/inspections", { credentials: "include" }),
      ]);
      if (a.ok) {
        const j = (await a.json()) as { anchors: Anchor[] };
        anchorsCache = j.anchors;
      }
      if (i.ok) {
        const j = (await i.json()) as { inspections: Inspection[] };
        inspectionsCache = j.inspections;
      }
      bootstrapped = true;
      notify();
    } finally {
      bootstrapping = null;
    }
  })();
  await bootstrapping;
}

export async function refetchAnchors(): Promise<void> {
  if (!isClient()) return;
  const r = await fetch("/api/anchors", { credentials: "include" });
  if (!r.ok) return;
  const j = (await r.json()) as { anchors: Anchor[] };
  anchorsCache = j.anchors;
  notify();
}

export async function refetchInspections(): Promise<void> {
  if (!isClient()) return;
  const r = await fetch("/api/inspections", { credentials: "include" });
  if (!r.ok) return;
  const j = (await r.json()) as { inspections: Inspection[] };
  inspectionsCache = j.inspections;
  notify();
}

export async function refetchAll(): Promise<void> {
  await Promise.all([refetchAnchors(), refetchInspections()]);
}

export function getAnchors(): Anchor[] {
  return anchorsCache;
}

export function getAnchor(id: string): Anchor | null {
  return anchorsCache.find((a) => a.id === id) || null;
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
  return inspectionsCache;
}

export function getInspectionsForAnchor(anchorId: string): Inspection[] {
  return inspectionsCache
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
  signature: string | null;
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

export function useInspections(): Inspection[] {
  return useSyncExternalStore(subscribe, getInspections, () => SEED_INSPECTIONS);
}
