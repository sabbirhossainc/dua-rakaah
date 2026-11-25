// Signing in and out on this device (design D8): what happens to local data and unsent changes.
// Pure bookkeeping on the local store. The network calls (Google, Auth.js, the cookie route) are made by the UI.
import { getMeta, setMeta } from "./db.js";
import { CLIENT_TYPES, allResendOps, recordTables, wireOp } from "./apply.js";

export const KEPT_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The account this device is signed in as, or null. */
export function currentAccount(db) {
  return getMeta(db, "account", null);
}

/** How many changes have not been sent. */
export function unsyncedCount(db) {
  return db.outbox.count();
}

/**
 * The reader has signed in as `accountId`. The device continues as that account: a new "epoch" (so answers to
 * requests made before sign-in are dropped), a full pull from position 0, every local record queued again as a
 * safety net (design D8), and any changes kept for this account from an earlier offline sign-out queued to be sent.
 *
 * Settings are different (design D3): the account's value must win over this device's, so the queued setting changes are
 * dropped and one "set only if the account has none" change per local setting is queued in their place. Changes kept
 * from an earlier offline sign-out are the account's own choices and stay ordinary changes.
 * Returns false when the device was already signed in as this account.
 */
export async function completeSignIn(db, accountId, { newId = () => crypto.randomUUID() } = {}) {
  return db.transaction("rw", [db.meta, db.outbox, db.kept_ops, ...recordTables(db)], async () => {
    if ((await getMeta(db, "account", null)) === accountId) return false;
    await setMeta(db, "epoch", (await getMeta(db, "epoch", 0)) + 1);
    await setMeta(db, "cursor", 0);
    await setMeta(db, "owner", null);
    await setMeta(db, "account", accountId);

    // Types whose queued changes are replaced at sign-in (settings): drop them, the re-send below covers every record.
    const replaced = (await db.outbox.toArray()).filter((o) => CLIENT_TYPES[o.type]?.replaceQueuedAtSignIn);
    if (replaced.length > 0) await db.outbox.where("op_id").anyOf(replaced.map((o) => o.op_id)).delete();

    const queued = new Set((await db.outbox.toArray()).map((o) => o.op_id));
    const toQueue = [];
    const kept = await db.kept_ops.where("account_owner").equals(accountId).toArray();
    for (const op of kept) {
      if (!queued.has(op.op_id)) toQueue.push(wireOp(op));
      queued.add(op.op_id);
    }
    await db.kept_ops.where("account_owner").equals(accountId).delete();
    for (const op of await allResendOps(db, newId, { atSignIn: true })) {
      if (!queued.has(op.op_id)) toQueue.push(op);
      queued.add(op.op_id);
    }
    if (toQueue.length > 0) await db.outbox.bulkAdd(toQueue);
    return true;
  });
}

/**
 * Signs out on this device. All of the account's local data is cleared and the device starts a new anonymous
 * identity. With `keepUnsynced`, the changes that were never sent are moved aside for this account first
 * (and stay hidden from whoever uses the device next). Sets `pending_signout` until the server-side sign-out is done.
 */
export async function signOutLocal(db, { keepUnsynced, now = Date.now(), newId = () => crypto.randomUUID() }) {
  return db.transaction("rw", [db.meta, db.outbox, db.kept_ops, ...recordTables(db)], async () => {
    const accountId = await getMeta(db, "account", null);
    const ops = await db.outbox.toArray();
    let kept = 0;
    if (keepUnsynced && accountId && ops.length > 0) {
      const have = new Set((await db.kept_ops.toArray()).map((o) => o.op_id));
      const rows = ops
        .filter((op) => !have.has(op.op_id))
        .map((op) => ({ ...wireOp(op), account_owner: accountId, kept_at: now }));
      if (rows.length > 0) await db.kept_ops.bulkAdd(rows);
      kept = rows.length;
    }
    await db.outbox.clear();
    for (const table of recordTables(db)) await table.clear();
    await setMeta(db, "epoch", (await getMeta(db, "epoch", 0)) + 1);
    await setMeta(db, "cursor", 0);
    await setMeta(db, "owner", null);
    await setMeta(db, "account", null);
    await setMeta(db, "anon_id", newId());
    await setMeta(db, "pending_signout", true);
    return { kept };
  });
}

export async function isSignOutPending(db) {
  return Boolean(await getMeta(db, "pending_signout", false));
}

/**
 * Finishes a sign-out that was started on this device: runs `remote()` (clear the session cookie and the anonymous
 * cookie on the server). Until it succeeds, syncing is paused, because the session cookie would still make the server
 * answer for the account. Returns true when nothing is pending any more.
 */
export async function completePendingSignOut(db, remote) {
  if (!(await isSignOutPending(db))) return true;
  try {
    await remote();
  } catch {
    return false; // offline: try again at the next opportunity
  }
  await setMeta(db, "pending_signout", false);
  return true;
}

/** Deletes kept changes older than 30 days. Returns how many were deleted. */
export async function purgeExpiredKept(db, now = Date.now()) {
  return db.kept_ops.where("kept_at").below(now - KEPT_DAYS * DAY_MS).delete();
}
