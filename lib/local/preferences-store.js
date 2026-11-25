"use client";
// One live subscription to the local settings, shared by the applier and the setting controls (design D5).
// Until the first read finishes it reports `ready: false` with the defaults, so nothing overwrites what the
// first-paint script already applied.
import { useSyncExternalStore } from "react";
import { createLiveStore } from "./live-store.js";
import { defaultPreferences, preferencesFromRecords } from "../preferences.js";

const INITIAL = Object.freeze({ ready: false, values: Object.freeze(defaultPreferences()) });

const store = createLiveStore(
  (db) => db.preferences.toArray(),
  // `rows` is undefined when storage could not be read: show the defaults rather than waiting forever.
  (rows) => ({ ready: true, values: preferencesFromRecords(rows ?? []) }),
  INITIAL
);

/** `{ ready, values: { theme, arabic_font, reciter_id } }`, with defaults for settings never chosen. */
export function usePreferences() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
