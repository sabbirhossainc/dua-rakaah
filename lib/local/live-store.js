"use client";
// A shared live view of something in the local store, for React's useSyncExternalStore.
// One Dexie subscription serves every component that reads it, and it stops when the last one goes away.
import { liveQuery } from "dexie";
import { getDb } from "./db.js";

/**
 * @template Q, S
 * @param {(db: import("dexie").Dexie) => Promise<Q>} query  Runs inside Dexie's liveQuery.
 * @param {(result: Q) => S} toSnapshot                         Builds the (stable) snapshot from a query result.
 * @param {S} initial                                           The snapshot before the first read, and on the server.
 */
export function createLiveStore(query, toSnapshot, initial) {
  let snapshot = initial;
  const listeners = new Set();
  let subscription = null;

  const emit = () => listeners.forEach((listener) => listener());

  function start() {
    if (subscription || typeof indexedDB === "undefined") return;
    const db = getDb();
    subscription = liveQuery(() => query(db)).subscribe({
      next(result) {
        snapshot = toSnapshot(result);
        emit();
      },
      error(error) {
        // Storage is blocked (private mode in some browsers). The app keeps working without local data.
        console.error("Could not read the local store:", error);
        snapshot = toSnapshot(undefined);
        emit();
      },
    });
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      start();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => initial,
  };
}
