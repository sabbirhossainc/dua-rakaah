"use client";
// One live subscription to the local bookmarks, shared by every card and the bookmark page (design D6).
// Cards render "not bookmarked" until the first read finishes, so the server HTML and the first client render match.
import { useSyncExternalStore } from "react";
import { createLiveStore } from "./live-store.js";

const INITIAL = Object.freeze({ ready: false, ids: new Set(), list: [] });

const store = createLiveStore(
  (db) => db.bookmarks.toArray(),
  (rows) => {
    // `rows` is undefined when storage could not be read: show "no bookmarks" rather than waiting forever.
    const list = (rows ?? [])
      .filter((r) => r.deleted === 0)
      .sort((a, b) => b.updated_at - a.updated_at || a.dua_id - b.dua_id);
    return { ready: true, ids: new Set(list.map((r) => r.dua_id)), list };
  },
  INITIAL
);

/** `{ ready, ids: Set<number>, list: Array<record> }`. `list` is newest first. */
export function useBookmarks() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
