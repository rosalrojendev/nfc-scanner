"use client";

import { useSyncExternalStore } from "react";
import { SEED_DRAWINGS } from "./seed";
import type {
  AnchorStatus,
  Drawing,
  DrawingAttachment,
  DrawingAttachmentKind,
  DrawingPin,
} from "./types";

const KEY = "atp.drawings.v1";

function isClient() {
  return typeof window !== "undefined";
}

function generateToken(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 14)}`;
}

function normalize(d: Drawing): Drawing {
  return {
    ...d,
    anchors: d.anchors.map((a) => ({ ...a })),
    attachments: d.attachments?.map((a) => ({ ...a })) ?? [],
    planUrl: d.planUrl ?? null,
    createdAt: d.createdAt,
    custom: d.custom ?? false,
  };
}

const SEED_NORMALIZED: Drawing[] = SEED_DRAWINGS.map(normalize);

const DEFAULTS: Drawing[] = SEED_NORMALIZED.map((d) =>
  Object.freeze({
    ...d,
    anchors: Object.freeze(d.anchors) as unknown as DrawingPin[],
    attachments: Object.freeze(d.attachments ?? []) as unknown as DrawingAttachment[],
  }) as Drawing,
);
const FROZEN_DEFAULTS = Object.freeze(DEFAULTS) as unknown as Drawing[];

let cache: Drawing[] | null = null;

function readState(): Drawing[] {
  if (!isClient()) return FROZEN_DEFAULTS;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = FROZEN_DEFAULTS;
      return cache;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cache = FROZEN_DEFAULTS;
      return cache;
    }
    const out: Drawing[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.building === "string" &&
        typeof item.level === "string" &&
        typeof item.reference === "string" &&
        Array.isArray(item.anchors)
      ) {
        out.push({
          id: item.id,
          projectId:
            typeof item.projectId === "string" ? item.projectId : undefined,
          building: item.building,
          level: item.level,
          reference: item.reference,
          anchors: item.anchors.filter(
            (p: unknown): p is DrawingPin =>
              !!p &&
              typeof p === "object" &&
              typeof (p as DrawingPin).id === "string" &&
              typeof (p as DrawingPin).x === "number" &&
              typeof (p as DrawingPin).y === "number",
          ),
          attachments: Array.isArray(item.attachments)
            ? item.attachments.filter(
                (a: unknown): a is DrawingAttachment =>
                  !!a &&
                  typeof a === "object" &&
                  typeof (a as DrawingAttachment).id === "string" &&
                  typeof (a as DrawingAttachment).url === "string",
              )
            : [],
          planUrl: typeof item.planUrl === "string" ? item.planUrl : null,
          createdAt: item.createdAt,
          custom: !!item.custom,
        });
      }
    }
    cache = out.length > 0 ? out : FROZEN_DEFAULTS;
    return cache;
  } catch {
    cache = FROZEN_DEFAULTS;
    return cache;
  }
}

const listeners = new Set<() => void>();

function notify() {
  cache = null;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

if (isClient()) {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) notify();
  });
}

function writeState(next: Drawing[]) {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  } catch {
    // quota — ignore
  }
}

export function getDrawings(): Drawing[] {
  return readState();
}

export function useDrawings(): Drawing[] {
  return useSyncExternalStore(subscribe, readState, () => FROZEN_DEFAULTS);
}

export function addDrawing(input: {
  projectId?: string;
  building: string;
  level: string;
  reference: string;
  planUrl?: string | null;
  planContentType?: string;
}): Drawing {
  const drawing: Drawing = {
    id: generateToken("dw"),
    projectId: input.projectId,
    building: input.building.trim(),
    level: input.level.trim(),
    reference: input.reference.trim(),
    anchors: [],
    attachments: input.planUrl
      ? [
          {
            id: generateToken("att"),
            kind: "plan",
            label: "Plan",
            url: input.planUrl,
            contentType: input.planContentType,
            addedAt: new Date().toISOString(),
          },
        ]
      : [],
    planUrl: input.planUrl ?? null,
    createdAt: new Date().toISOString(),
    custom: true,
  };
  writeState([drawing, ...readState()]);
  return drawing;
}

export function addAttachment(
  drawingId: string,
  input: {
    kind: DrawingAttachmentKind;
    label: string;
    url: string;
    contentType?: string;
  },
): DrawingAttachment | null {
  const state = readState();
  const idx = state.findIndex((d) => d.id === drawingId);
  if (idx < 0) return null;
  const att: DrawingAttachment = {
    id: generateToken("att"),
    kind: input.kind,
    label: input.label.trim() || input.kind,
    url: input.url,
    contentType: input.contentType,
    addedAt: new Date().toISOString(),
  };
  const next = state.slice();
  next[idx] = {
    ...state[idx],
    attachments: [...(state[idx].attachments ?? []), att],
  };
  writeState(next);
  return att;
}

export function removeAttachment(drawingId: string, attachmentId: string) {
  const state = readState();
  const idx = state.findIndex((d) => d.id === drawingId);
  if (idx < 0) return;
  const next = state.slice();
  next[idx] = {
    ...state[idx],
    attachments: (state[idx].attachments ?? []).filter(
      (a) => a.id !== attachmentId,
    ),
  };
  writeState(next);
}

export function pinAnchor(
  drawingId: string,
  pin: { id: string; x: number; y: number; status: AnchorStatus },
) {
  const state = readState();
  const idx = state.findIndex((d) => d.id === drawingId);
  if (idx < 0) return;
  const next = state.slice();
  const existing = state[idx].anchors.filter((a) => a.id !== pin.id);
  next[idx] = {
    ...state[idx],
    anchors: [...existing, pin],
  };
  writeState(next);
}

export function unpinAnchor(drawingId: string, anchorId: string) {
  const state = readState();
  const idx = state.findIndex((d) => d.id === drawingId);
  if (idx < 0) return;
  const next = state.slice();
  next[idx] = {
    ...state[idx],
    anchors: state[idx].anchors.filter((a) => a.id !== anchorId),
  };
  writeState(next);
}

export function deleteDrawing(drawingId: string) {
  const state = readState();
  writeState(state.filter((d) => d.id !== drawingId));
}
