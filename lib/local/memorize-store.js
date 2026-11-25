"use client";
// One live subscription to the local memorize records, shared by every card and the memorize page (design D7).
// Cards render "not started" until the first read finishes, so the server HTML and the first client render match.
import { useSyncExternalStore } from "react";
import { createLiveStore } from "./live-store.js";

const INITIAL = Object.freeze({ ready: false, byId: new Map(), list: [] });

const store = createLiveStore(
  (db) => db.memorize.toArray(),
  (rows) => {
    // `rows` is undefined when storage could not be read: show "nothing started" rather than waiting forever.
    const list = rows ?? [];
    return { ready: true, byId: new Map(list.map((r) => [r.dua_id, r])), list };
  },
  INITIAL
);

/** `{ ready, byId: Map<number, record>, list: Array<record> }`. A dua with no record is not started. */
export function useMemorize() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
