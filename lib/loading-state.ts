"use client";

import { useSyncExternalStore } from "react";

// Reference-counted "is the app currently fetching anything" signal.
// Stores wrap their fetches in withFetch(); the GlobalLoader subscribes
// to the count to show a top-of-page progress bar.

let activeFetches = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getCount() {
  return activeFetches;
}

export function beginFetch(): void {
  activeFetches += 1;
  notify();
}

export function endFetch(): void {
  activeFetches = Math.max(0, activeFetches - 1);
  notify();
}

export async function withFetch<T>(fn: () => Promise<T>): Promise<T> {
  beginFetch();
  try {
    return await fn();
  } finally {
    endFetch();
  }
}

export function useIsFetching(): boolean {
  return (
    useSyncExternalStore(subscribe, getCount, () => 0) > 0
  );
}
