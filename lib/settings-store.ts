"use client";

import { useSyncExternalStore } from "react";
import { INSPECTORS as SEED_INSPECTORS } from "./seed";

export interface Inspector {
  id: string;
  name: string;
  avatar?: string | null;
}

export interface SettingsState {
  inspectors: Inspector[];
  reminders: { sixtyDay: boolean; thirtyDay: boolean; sevenDay: boolean };
  shareLinks: ShareLink[];
  profiles: Record<string, { avatar?: string | null }>;
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

function generateToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  return Math.random().toString(36).slice(2, 18);
}

function inspectorFromName(name: string): Inspector {
  return { id: generateToken(), name, avatar: null };
}

const SEED_ROSTER: Inspector[] = SEED_INSPECTORS.map((n) => ({
  id: `seed-${n.replace(/\s+/g, "-").toLowerCase()}`,
  name: n,
  avatar: null,
}));

// Single frozen reference for the SSR snapshot. useSyncExternalStore demands
// a stable value here; allocating a new object each call causes infinite render.
const DEFAULTS: SettingsState = Object.freeze({
  inspectors: Object.freeze(
    SEED_ROSTER.map((i) => Object.freeze({ ...i })),
  ) as unknown as Inspector[],
  reminders: Object.freeze({
    sixtyDay: true,
    thirtyDay: true,
    sevenDay: true,
  }) as SettingsState["reminders"],
  shareLinks: Object.freeze([]) as unknown as ShareLink[],
  profiles: Object.freeze({}) as SettingsState["profiles"],
}) as SettingsState;

function defaults(): SettingsState {
  return DEFAULTS;
}

let cache: SettingsState | null = null;

function parseInspectors(raw: unknown): Inspector[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Inspector[] = [];
  for (const item of raw) {
    // backward compat: previous schema stored plain strings
    if (typeof item === "string" && item.trim()) {
      out.push(inspectorFromName(item.trim()));
      continue;
    }
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const name = typeof obj.name === "string" ? obj.name : "";
      if (!name) continue;
      out.push({
        id: typeof obj.id === "string" ? obj.id : generateToken(),
        name,
        avatar:
          typeof obj.avatar === "string" && obj.avatar.length > 0
            ? obj.avatar
            : null,
      });
    }
  }
  return out.length > 0 ? out : null;
}

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
        parseInspectors(parsed.inspectors) ??
        SEED_ROSTER.map((i) => ({ ...i })),
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
      profiles:
        parsed.profiles && typeof parsed.profiles === "object"
          ? Object.fromEntries(
              Object.entries(
                parsed.profiles as Record<
                  string,
                  { avatar?: string | null } | undefined
                >,
              )
                .filter(([k, v]) => typeof k === "string" && v && typeof v === "object")
                .map(([k, v]) => [
                  k,
                  {
                    avatar:
                      typeof v?.avatar === "string" && v.avatar.length > 0
                        ? v.avatar
                        : null,
                  },
                ]),
            )
          : {},
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

export function inspectorByName(
  name: string | null | undefined,
  state?: SettingsState,
): Inspector | null {
  if (!name) return null;
  const s = state ?? readState();
  return s.inspectors.find((i) => i.name === name) ?? null;
}

/**
 * Returns the avatar to render for a (userId, name) pair. Prefers the
 * per-user profile avatar, then any matching inspector roster avatar, then
 * null (consumers fall back to initials).
 */
export function avatarFor(
  userId: string | null | undefined,
  name: string | null | undefined,
  state?: SettingsState,
): string | null {
  const s = state ?? readState();
  if (userId && s.profiles[userId]?.avatar) return s.profiles[userId].avatar!;
  const insp = inspectorByName(name, s);
  return insp?.avatar ?? null;
}

/**
 * Sets the current user's avatar. If their display name matches a roster
 * entry (typical for inspectors), the inspector record's avatar is also
 * updated so the photo flows into the inspector picker and SubmittedByChip.
 */
export function setMyAvatar(
  userId: string,
  name: string,
  avatar: string | null,
) {
  const state = readState();
  const nextProfiles: SettingsState["profiles"] = {
    ...state.profiles,
    [userId]: { avatar },
  };
  const nextInspectors = state.inspectors.map((i) =>
    i.name === name ? { ...i, avatar } : i,
  );
  writeState({
    ...state,
    profiles: nextProfiles,
    inspectors: nextInspectors,
  });
}

export function addInspector(name: string, avatar: string | null = null) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const state = readState();
  if (state.inspectors.some((i) => i.name === trimmed)) return;
  const next: Inspector = { id: generateToken(), name: trimmed, avatar };
  writeState({ ...state, inspectors: [...state.inspectors, next] });
}

export function updateInspector(
  id: string,
  patch: Partial<Pick<Inspector, "name" | "avatar">>,
) {
  const state = readState();
  writeState({
    ...state,
    inspectors: state.inspectors.map((i) =>
      i.id === id ? { ...i, ...patch } : i,
    ),
  });
}

export function removeInspector(id: string) {
  const state = readState();
  if (state.inspectors.length <= 1) return; // keep at least one
  writeState({
    ...state,
    inspectors: state.inspectors.filter((i) => i.id !== id),
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
