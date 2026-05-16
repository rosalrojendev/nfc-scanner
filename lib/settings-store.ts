"use client";

import { useSyncExternalStore } from "react";

export interface Inspector {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  avatar: string | null;
}

export interface ShareLink {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
}

export interface ReminderState {
  sixtyDay: boolean;
  thirtyDay: boolean;
  sevenDay: boolean;
}

export interface SettingsState {
  inspectors: Inspector[];
  reminders: ReminderState;
  shareLinks: ShareLink[];
  myUserId: string | null;
  myAvatarUrl: string | null;
}

const EMPTY: SettingsState = Object.freeze({
  inspectors: Object.freeze([]) as unknown as Inspector[],
  reminders: Object.freeze({
    sixtyDay: true,
    thirtyDay: true,
    sevenDay: true,
  }) as ReminderState,
  shareLinks: Object.freeze([]) as unknown as ShareLink[],
  myUserId: null,
  myAvatarUrl: null,
}) as SettingsState;

let state: SettingsState = EMPTY;
let bootstrapped = false;
let bootstrapping: Promise<void> | null = null;

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
      await refetchAll();
      bootstrapped = true;
    } finally {
      bootstrapping = null;
    }
  })();
  await bootstrapping;
}

interface RawInspector {
  id: string;
  clientId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface RawShareLink {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
}

interface RawMe {
  userId: string;
  prefs: {
    avatarUrl: string | null;
    reminderSixtyDay: boolean;
    reminderThirtyDay: boolean;
    reminderSevenDay: boolean;
  };
}

export async function refetchAll(): Promise<void> {
  if (!isClient()) return;
  const [insp, links, me] = await Promise.all([
    fetch("/api/inspectors", { credentials: "include" }).then((r) =>
      r.ok ? r.json() : { inspectors: [] },
    ),
    fetch("/api/share-links", { credentials: "include" }).then((r) =>
      r.ok ? r.json() : { shareLinks: [] },
    ),
    fetch("/api/me", { credentials: "include" }).then((r) =>
      r.ok ? r.json() : null,
    ),
  ]);
  const inspectors = ((insp.inspectors ?? []) as RawInspector[]).map((i) => ({
    id: i.id,
    clientId: i.clientId,
    userId: i.userId,
    name: i.name,
    avatar: i.avatarUrl,
  }));
  const shareLinks = ((links.shareLinks ?? []) as RawShareLink[]).map((l) => ({
    id: l.id,
    projectId: l.projectId,
    label: l.label,
    createdAt: l.createdAt,
  }));
  const rawMe = me as RawMe | null;
  state = {
    inspectors,
    shareLinks,
    reminders: rawMe
      ? {
          sixtyDay: rawMe.prefs.reminderSixtyDay,
          thirtyDay: rawMe.prefs.reminderThirtyDay,
          sevenDay: rawMe.prefs.reminderSevenDay,
        }
      : EMPTY.reminders,
    myUserId: rawMe?.userId ?? null,
    myAvatarUrl: rawMe?.prefs.avatarUrl ?? null,
  };
  notify();
}

export function getSettings(): SettingsState {
  return state;
}

export function useSettings(): SettingsState {
  return useSyncExternalStore(subscribe, getSettings, () => EMPTY);
}

export function inspectorByName(
  name: string | null | undefined,
  s?: SettingsState,
): Inspector | null {
  if (!name) return null;
  const settings = s ?? state;
  return settings.inspectors.find((i) => i.name === name) ?? null;
}

export function avatarFor(
  userId: string | null | undefined,
  name: string | null | undefined,
  s?: SettingsState,
): string | null {
  const settings = s ?? state;
  if (userId && settings.myUserId === userId && settings.myAvatarUrl) {
    return settings.myAvatarUrl;
  }
  const insp = inspectorByName(name, settings);
  return insp?.avatar ?? null;
}

export function activeReminderCount(s: SettingsState): number {
  return [s.reminders.sixtyDay, s.reminders.thirtyDay, s.reminders.sevenDay]
    .filter(Boolean)
    .length;
}

// ---- mutations -----------------------------------------------------------

async function postJSON(
  url: string,
  body: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<Response> {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return r;
}

export async function addInspector(
  clientId: string,
  userId: string,
): Promise<Inspector | null> {
  const r = await postJSON("/api/inspectors", { clientId, userId });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to add inspector (${r.status})`);
  }
  const j = (await r.json()) as { inspector: RawInspector };
  await refetchAll();
  return {
    id: j.inspector.id,
    clientId: j.inspector.clientId,
    userId: j.inspector.userId,
    name: j.inspector.name,
    avatar: j.inspector.avatarUrl,
  };
}

export async function updateInspector(
  id: string,
  patch: { avatar?: string | null },
): Promise<void> {
  const body: { avatarUrl?: string | null } = {};
  if (patch.avatar !== undefined) body.avatarUrl = patch.avatar;
  const r = await postJSON(
    `/api/inspectors/${encodeURIComponent(id)}`,
    body,
    "PATCH",
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to update inspector (${r.status})`);
  }
  await refetchAll();
}

export async function removeInspector(id: string): Promise<void> {
  const r = await fetch(`/api/inspectors/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to remove inspector (${r.status})`);
  }
  await refetchAll();
}

export async function setMyAvatar(avatar: string | null): Promise<void> {
  const r = await postJSON(
    "/api/me",
    { avatarUrl: avatar },
    "PATCH",
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to update avatar (${r.status})`);
  }
  await refetchAll();
}

export async function setReminder(
  key: keyof ReminderState,
  value: boolean,
): Promise<void> {
  const fieldByKey = {
    sixtyDay: "reminderSixtyDay",
    thirtyDay: "reminderThirtyDay",
    sevenDay: "reminderSevenDay",
  } as const;
  const r = await postJSON(
    "/api/me",
    { [fieldByKey[key]]: value },
    "PATCH",
  );
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to update reminder (${r.status})`);
  }
  await refetchAll();
}

export async function createShareLink(
  projectId: string,
  label: string,
): Promise<ShareLink> {
  const r = await postJSON("/api/share-links", { projectId, label });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to create share link (${r.status})`);
  }
  const j = (await r.json()) as { link: RawShareLink };
  await refetchAll();
  return {
    id: j.link.id,
    projectId: j.link.projectId,
    label: j.link.label,
    createdAt: j.link.createdAt,
  };
}

export async function revokeShareLink(id: string): Promise<void> {
  const r = await fetch(`/api/share-links/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `Failed to revoke share link (${r.status})`);
  }
  await refetchAll();
}

export function shareLinkUrl(id: string): string {
  if (typeof window === "undefined") return `/share/${id}`;
  return `${window.location.origin}/share/${id}`;
}
