// Signing in and out on this device (design D8): what happens to local data and unsent changes.
// Pure bookkeeping on the local store. The network calls (Google, Auth.js, the cookie route) are made by the UI.
import { ensureAnonId, getMeta, setMeta } from "./db.js";
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
    await setMeta(db, "refresh_cursor", 0);
    await setMeta(db, "owner", null);
    await setMeta(db, "account", accountId);

    // Types whose queued changes are replaced at sign-in (settings): drop them, the re-send below covers every record.
    const replaced = (await db.outbox.toArray()).filter((o) => CLIENT_TYPES[o.type]?.replaceQueuedAtSignIn);
    if (replaced.length > 0) await db.outbox.where("op_id").anyOf(replaced.map((o) => o.op_id)).delete();

    const queued = new Set((await db.outbox.toArray()).map((o) => o.op_id));
    const toQueue = [];
    const kept = await db.kept_ops.where("account_owner").equals(accountId).toArray();
    for (const op of kept) {
      // `kept_at` goes on the wire as the time the change was first set aside.
      if (!queued.has(op.op_id)) toQueue.push(wireOp({ ...op, kept_at: op.first_kept_at ?? op.kept_at }));
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
  return db.transaction("rw", identityTables(db), async () => {
    const accountId = await getMeta(db, "account", null);
    const ops = await db.outbox.toArray();
    let kept = 0;
    if (keepUnsynced && accountId && ops.length > 0) {
      const have = new Set((await db.kept_ops.toArray()).map((o) => o.op_id));
      const rows = ops
        .filter((op) => !have.has(op.op_id))
        // `kept_at` starts the 30 days again. `first_kept_at` does not move, so a change set aside before the account
        // was deleted still counts as that old if it is set aside a second time before being sent.
        .map((op) => ({ ...wireOp(op), account_owner: accountId, kept_at: now, first_kept_at: op.kept_at ?? now }));
      if (rows.length > 0) await db.kept_ops.bulkAdd(rows);
      kept = rows.length;
    }
    await startAgain(db, newId);
    return { kept };
  });
}

const identityTables = (db) => [db.meta, db.outbox, db.kept_ops, ...recordTables(db)];

/** Clears the records and the queue and continues as a new anonymous device. Runs inside the caller's transaction. */
async function startAgain(db, newId) {
  await db.outbox.clear();
  for (const table of recordTables(db)) await table.clear();
  await setMeta(db, "epoch", (await getMeta(db, "epoch", 0)) + 1);
  await setMeta(db, "cursor", 0);
  await setMeta(db, "refresh_cursor", 0);
  await setMeta(db, "owner", null);
  await setMeta(db, "account", null);
  await setMeta(db, "anon_id", newId());
  await setMeta(db, "pending_signout", true);
}

/**
 * The reader's data was deleted on the server (data deletion, design D8): remove it from this device too, including
 * the changes kept for this account, and continue as a new anonymous device. With `ifEpoch`, only when the device has
 * not signed in, out or been cleared since then. Returns true when the device was cleared.
 */
export async function deleteLocal(db, { ifEpoch, newId = () => crypto.randomUUID() } = {}) {
  return db.transaction("rw", identityTables(db), async () => {
    if (ifEpoch !== undefined && (await getMeta(db, "epoch", 0)) !== ifEpoch) return false;
    const accountId = await getMeta(db, "account", null);
    if (accountId) await db.kept_ops.where("account_owner").equals(accountId).delete();
    await startAgain(db, newId);
    return true;
  });
}

export const DELETE_URL = "/api/account/delete";

/**
 * Asks the server to delete this reader's data and, only once it confirms, clears this device.
 *
 * @returns {Promise<"deleted" | "signin" | "failed">}  "signin": the session has ended. In both other cases than
 *          "deleted" nothing on the device has changed.
 */
export async function deleteMyData(db, { fetchFn = (...args) => fetch(...args), newId = () => crypto.randomUUID() } = {}) {
  const anonId = await ensureAnonId(db, newId);
  const scope = (await currentAccount(db)) ? "account" : "anon";
  let res;
  try {
    res = await fetchFn(DELETE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ scope, anon_id: anonId }),
    });
  } catch {
    return "failed"; // no connection, or the answer was lost: trying again is safe
  }
  if (res.status === 401) return "signin";
  if (res.status !== 200) return "failed";
  await deleteLocal(db, { newId });
  return "deleted";
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
