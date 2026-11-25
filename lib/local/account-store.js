"use client";
// Who this device is signed in as, read live from the local store (so it works offline).
import { useSyncExternalStore } from "react";
import { createLiveStore } from "./live-store.js";

const INITIAL = Object.freeze({ ready: false, account: null, pendingSignOut: false });

const store = createLiveStore(
  async (db) => {
    const [account, pending] = await Promise.all([db.meta.get("account"), db.meta.get("pending_signout")]);
    return { account: account?.value ?? null, pendingSignOut: Boolean(pending?.value) };
  },
  (result) => ({ ready: true, account: result?.account ?? null, pendingSignOut: result?.pendingSignOut ?? false }),
  INITIAL
);

/** `{ ready, account: string | null, pendingSignOut }`. */
export function useAccount() {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
