"use client";

import { useSyncExternalStore } from "react";
import { INSPECTORS as SEED_INSPECTORS } from "./seed";

export interface SettingsState {
  inspectors: string[];
  reminders: { sixtyDay: boolean; thirtyDay: boolean; sevenDay: boolean };
  shareLinks: ShareLink[];
}

export interface ShareLink {
  id: string;
  label: string;
  createdAt: string;
}

const KEY = "atp.settings.v1";

function isClient() {
  return typeof window !== "undefined";
}

// Single frozen reference for the SSR snapshot. useSyncExternalStore demands
// a stable value here; allocating a new object each call causes infinite render.
const DEFAULTS: SettingsState = Object.freeze({
  inspectors: Object.freeze([...SEED_INSPECTORS]) as unknown as string[],
  reminders: Object.freeze({
    sixtyDay: true,
    thirtyDay: true,
    sevenDay: true,
  }) as SettingsState["reminders"],
  shareLinks: Object.freeze([]) as unknown as ShareLink[],
}) as SettingsState;

function defaults(): SettingsState {
  return DEFAULTS;
}

let cache: SettingsState | null = null;

function readState(): SettingsState {
  if (!isClient()) return defaults();
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) {
      cache = defaults();
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<SettingsState>;
    const merged: SettingsState = {
      inspectors:
        Array.isArray(parsed.inspectors) && parsed.inspectors.length > 0
          ? parsed.inspectors.filter((s): s is string => typeof s === "string")
          : [...SEED_INSPECTORS],
      reminders: {
        sixtyDay: parsed.reminders?.sixtyDay ?? true,
        thirtyDay: parsed.reminders?.thirtyDay ?? true,
        sevenDay: parsed.reminders?.sevenDay ?? true,
      },
      shareLinks: Array.isArray(parsed.shareLinks)
        ? parsed.shareLinks.filter(
            (s): s is ShareLink =>
              typeof s === "object" &&
              s !== null &&
              typeof (s as ShareLink).id === "string" &&
              typeof (s as ShareLink).label === "string" &&
              typeof (s as ShareLink).createdAt === "string",
          )
        : [],
    };
    cache = merged;
    return merged;
  } catch {
    cache = defaults();
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

function writeState(next: SettingsState) {
  if (!isClient()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    notify();
  } catch {
    // quota — ignore
  }
}

export function getSettings(): SettingsState {
  return readState();
}

export function useSettings(): SettingsState {
  return useSyncExternalStore(subscribe, readState, defaults);
}

export function addInspector(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const state = readState();
  if (state.inspectors.includes(trimmed)) return;
  writeState({ ...state, inspectors: [...state.inspectors, trimmed] });
}

export function removeInspector(name: string) {
  const state = readState();
  if (state.inspectors.length <= 1) return; // keep at least one
  writeState({
    ...state,
    inspectors: state.inspectors.filter((n) => n !== name),
  });
}

export function setReminder(
  key: keyof SettingsState["reminders"],
  value: boolean,
) {
  const state = readState();
  writeState({
    ...state,
    reminders: { ...state.reminders, [key]: value },
  });
}

function generateToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

export function createShareLink(label: string): ShareLink {
  const link: ShareLink = {
    id: generateToken(),
    label: label.trim() || "Shared report",
    createdAt: new Date().toISOString(),
  };
  const state = readState();
  writeState({ ...state, shareLinks: [link, ...state.shareLinks].slice(0, 20) });
  return link;
}

export function revokeShareLink(id: string) {
  const state = readState();
  writeState({
    ...state,
    shareLinks: state.shareLinks.filter((l) => l.id !== id),
  });
}

export function shareLinkUrl(id: string): string {
  if (typeof window === "undefined") return `/share/${id}`;
  return `${window.location.origin}/share/${id}`;
}

export function activeReminderCount(state: SettingsState): number {
  return Object.values(state.reminders).filter(Boolean).length;
}
