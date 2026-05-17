"use client";

import { useSyncExternalStore } from "react";
import { withFetch } from "./loading-state";

export interface Building {
  id: string;
  projectId: string;
  name: string;
}

let cache: Building[] = [];
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;
const FROZEN_EMPTY = Object.freeze([]) as unknown as Building[];

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

function isClient() {
  return typeof window !== "undefined";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (isClient() && !bootstrapped && !bootstrapping) {
    void bootstrap();
  }
  return () => listeners.delete(cb);
}

async function bootstrap(): Promise<void> {
  if (!isClient() || bootstrapped) return;
  bootstrapping ??= (async () => {
    try {
      await refetch();
    } finally {
      bootstrapping = null;
    }
  })();
  await bootstrapping;
}

export async function refetch(): Promise<void> {
  if (!isClient()) return;
  await withFetch(async () => {
    const r = await fetch("/api/buildings", { credentials: "include" });
    if (!r.ok) return;
    const j = (await r.json()) as { buildings: Building[] };
    cache = j.buildings;
    bootstrapped = true;
    notify();
  });
}

export function getBuildings(): Building[] {
  return cache;
}

export function useBuildings(): Building[] {
  return useSyncExternalStore(subscribe, getBuildings, () => FROZEN_EMPTY);
}

function getLoaded(): boolean {
  return bootstrapped;
}

// True once the first /api/buildings fetch has completed. Consumers should
// render skeleton placeholders while false to avoid showing "0 buildings"
// before real data arrives.
export function useBuildingsLoaded(): boolean {
  return useSyncExternalStore(subscribe, getLoaded, () => false);
}

export async function createBuilding(input: {
  projectId: string;
  name: string;
}): Promise<Building> {
  const r = await fetch("/api/buildings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to add building (${r.status})`);
  }
  const j = (await r.json()) as { building: Building };
  await refetch();
  return j.building;
}

export async function renameBuilding(
  id: string,
  name: string,
): Promise<Building> {
  const r = await fetch(`/api/buildings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to rename building (${r.status})`);
  }
  const j = (await r.json()) as { building: Building };
  await refetch();
  return j.building;
}

export async function deleteBuilding(id: string): Promise<void> {
  const r = await fetch(`/api/buildings/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to delete building (${r.status})`);
  }
  await refetch();
}
