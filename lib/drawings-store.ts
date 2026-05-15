"use client";

import { useSyncExternalStore } from "react";
import type {
  AnchorStatus,
  Drawing,
  DrawingAttachmentKind,
} from "./types";

// Module-scoped cache, populated on first subscribe.
let cache: Drawing[] = [];
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;
const FROZEN_EMPTY = Object.freeze([]) as unknown as Drawing[];

function isClient() {
  return typeof window !== "undefined";
}

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
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
      bootstrapped = true;
    } finally {
      bootstrapping = null;
    }
  })();
  await bootstrapping;
}

export async function refetch(): Promise<void> {
  if (!isClient()) return;
  const r = await fetch("/api/drawings", { credentials: "include" });
  if (!r.ok) return;
  const j = (await r.json()) as { drawings: Drawing[] };
  cache = j.drawings;
  notify();
}

export function getDrawings(): Drawing[] {
  return cache;
}

export function useDrawings(): Drawing[] {
  return useSyncExternalStore(subscribe, getDrawings, () => FROZEN_EMPTY);
}

export async function addDrawing(input: {
  projectId: string;
  building: string;
  level: string;
  reference: string;
  planUrl?: string | null;
  planContentType?: string;
}): Promise<Drawing> {
  const r = await fetch("/api/drawings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to add drawing (${r.status})`);
  }
  const j = (await r.json()) as { drawing: Drawing };
  await refetch();
  return j.drawing;
}

export async function deleteDrawing(drawingId: string): Promise<void> {
  const r = await fetch(`/api/drawings/${encodeURIComponent(drawingId)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to delete drawing (${r.status})`);
  }
  await refetch();
}

export async function addAttachment(
  drawingId: string,
  input: {
    kind: DrawingAttachmentKind;
    label: string;
    url: string;
    contentType?: string;
  },
): Promise<void> {
  const r = await fetch(
    `/api/drawings/${encodeURIComponent(drawingId)}/attachments`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(input),
    },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to add attachment (${r.status})`);
  }
  await refetch();
}

export async function removeAttachment(
  drawingId: string,
  attachmentId: string,
): Promise<void> {
  const r = await fetch(
    `/api/drawings/${encodeURIComponent(drawingId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to remove attachment (${r.status})`);
  }
  await refetch();
}

export async function pinAnchor(
  drawingId: string,
  pin: { id: string; x: number; y: number; status: AnchorStatus },
): Promise<void> {
  const r = await fetch(
    `/api/drawings/${encodeURIComponent(drawingId)}/pins`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        anchorId: pin.id,
        x: pin.x,
        y: pin.y,
        status: pin.status,
      }),
    },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to pin anchor (${r.status})`);
  }
  await refetch();
}

export async function unpinAnchor(
  drawingId: string,
  anchorId: string,
): Promise<void> {
  const r = await fetch(
    `/api/drawings/${encodeURIComponent(drawingId)}/pins/${encodeURIComponent(anchorId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to unpin anchor (${r.status})`);
  }
  await refetch();
}
