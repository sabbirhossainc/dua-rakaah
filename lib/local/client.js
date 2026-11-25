"use client";
// The browser's one sync runner and the actions the UI calls (design D6).
import { getDb } from "./db.js";
import { toggleBookmark } from "./bookmarks.js";
import { createSyncRunner } from "./sync.js";

let runner = null;
let askedToPersist = false;
const eventHandlers = new Set();

export function getRunner() {
  runner ??= createSyncRunner({ db: getDb(), onEvent: (event) => eventHandlers.forEach((handler) => handler(event)) });
  return runner;
}

/** Listens for runner events (for example "signed_out"). Returns the function that stops listening. */
export function onRunnerEvent(handler) {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

/** Asks the browser to keep this site's storage, once, after the first change. A refusal is fine and silent. */
function requestPersistence() {
  if (askedToPersist) return;
  askedToPersist = true;
  try {
    navigator.storage?.persist?.().catch(() => {});
  } catch {
    // Not supported: nothing to do.
  }
}

/** Adds or removes a bookmark on this device, then syncs soon. Never waits for the network. */
export async function toggle(duaId) {
  const bookmarked = await toggleBookmark(getDb(), duaId);
  requestPersistence();
  getRunner().notifyChange();
  return bookmarked;
}
