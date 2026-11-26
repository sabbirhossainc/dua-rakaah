// The sync runner (design D6): sends the outbox to /api/sync, applies what comes back, and does it again when
// something changes. At most one request is in flight. Everything it needs from the browser is passed in,
// so tests can run it with a fake fetch, a fake clock and a fake-indexeddb database.
import { ensureAnonId, getMeta, setMeta } from "./db.js";
import {
  CLIENT_TYPES,
  allResendOps,
  applyPulledRow,
  claimsRecord,
  clientTypeNames,
  nextBatch,
  recordRef,
  recordTables,
  refreshDrops,
  wireOp,
  withoutAcknowledged,
} from "./apply.js";
import { keyOf } from "../sync/records.js";
import { deleteLocal, isSignOutPending, purgeExpiredKept } from "./account.js";

export const SYNC_URL = "/api/sync";
export const DEBOUNCE_MS = 500;
export const INTERVAL_MS = 5 * 60 * 1000;

/**
 * @param {object} options
 * @param {import("dexie").Dexie} options.db
 * @param {typeof fetch} [options.fetchFn]
 * @param {() => boolean} [options.isOnline]
 * @param {() => string} [options.newId]
 * @param {() => number} [options.now]
 * @param {(event: { type: string }) => void} [options.onEvent]   "signed_out" when the server says the session is gone,
 *        "deleted" when it says the data was deleted and this device has been cleared.
 * @param {typeof setTimeout} [options.setTimeoutFn]
 * @param {typeof clearTimeout} [options.clearTimeoutFn]
 */
export function createSyncRunner({
  db,
  fetchFn = (...args) => fetch(...args),
  isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false),
  newId = () => crypto.randomUUID(),
  now = () => Date.now(),
  onEvent = () => {},
  setTimeoutFn = (...args) => setTimeout(...args),
  clearTimeoutFn = (...args) => clearTimeout(...args),
} = {}) {
  let inFlight = null;
  let timer = null;

  /** Clears the device after a 410, unless it has changed identity since the request. True when it was cleared. */
  async function clearDeleted(epoch) {
    const cleared = await deleteLocal(db, { ifEpoch: epoch, newId });
    if (cleared) onEvent({ type: "deleted" });
    return cleared;
  }

  /** One request. Returns `{ ok, sent }`: `ok` false means "try again later". */
  async function once() {
    await purgeExpiredKept(db, now()); // changes kept after an offline sign-out expire after 30 days
    // After a sign-out the session cookie may still be on the browser until the server has cleared it.
    // Sending now would be answered for the account, so wait.
    if (await isSignOutPending(db)) return { ok: false, sent: 0, reason: "signing_out" };
    if (!isOnline()) return { ok: false, sent: 0, reason: "offline" };
    const anonId = await ensureAnonId(db, newId);
    const epoch = await getMeta(db, "epoch", 0);
    // The cursor only means something for the record types it was pulled with. A device that now understands
    // more types asks from the beginning once (design D5). Before this was recorded only bookmarks existed.
    const types = clientTypeNames();
    const typesKey = types.join(",");
    const sameTypes = (await getMeta(db, "pulled_types", "bookmark")) === typesKey;
    const cursor = sameTypes ? await getMeta(db, "cursor", 0) : 0;
    // How far this code has handled purges (design D3). Separate from `cursor`, which older code moved past a purge
    // without dropping anything. 0 when absent, and whenever the cursor starts again.
    const since = sameTypes ? await getMeta(db, "refresh_cursor", 0) : 0;
    const queued = await db.outbox.orderBy("seq").toArray();
    const ops = nextBatch(queued).map(wireOp);

    let res;
    try {
      res = await fetchFn(SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ anon_id: anonId, cursor, since, ops, types }),
      });
    } catch {
      return { ok: false, sent: 0, reason: "network" };
    }

    if (res.status === 403) {
      // The server will not answer for this anonymous id (the cookie never arrived or is gone). Start a new
      // anonymous identity and send everything this device has again (design D3).
      await db.transaction("rw", [db.meta, db.outbox, ...recordTables(db)], async () => {
        if ((await getMeta(db, "anon_id")) !== anonId) return; // someone else already rotated
        await setMeta(db, "anon_id", newId());
        await setMeta(db, "cursor", 0);
        await setMeta(db, "refresh_cursor", 0);
        await setMeta(db, "owner", null);
        const queuedIds = new Set((await db.outbox.toArray()).map((o) => o.op_id));
        const all = (await allResendOps(db, newId, { atSignIn: false })).filter((o) => !queuedIds.has(o.op_id));
        if (all.length > 0) await db.outbox.bulkAdd(all);
      });
      return { ok: false, sent: 0, reason: "forbidden", retry: true };
    }
    if (res.status === 410) {
      // The reader's data was deleted elsewhere. An answer to a request from before this device changed identity is
      // about data that is no longer here, and is dropped (design D8).
      if (!(await clearDeleted(epoch))) return { ok: false, sent: 0, reason: "stale", stale: true };
      return { ok: false, sent: 0, reason: "deleted" };
    }
    if (res.status === 401) {
      onEvent({ type: "signed_out" });
      return { ok: false, sent: 0, reason: "signed_out" };
    }
    if (!res.ok) return { ok: false, sent: 0, reason: `status ${res.status}` };

    let data;
    try {
      data = await res.json();
    } catch {
      return { ok: false, sent: 0, reason: "bad answer" };
    }

    const sentIds = ops.map((o) => o.op_id);
    let stale = false;
    await db.transaction("rw", [db.meta, db.outbox, ...recordTables(db)], async () => {
      // Signed in (or out) while the request was away: the answer belongs to the old identity. Drop it.
      if ((await getMeta(db, "epoch", 0)) !== epoch) {
        stale = true;
        return;
      }
      let remaining = withoutAcknowledged(await db.outbox.toArray(), sentIds);
      await db.outbox.where("op_id").anyOf(sentIds).delete();
      if (data.full) {
        // The answer is everything the server holds: drop the bookmarks that were removed and purged meanwhile.
        const records = await db.bookmarks.toArray();
        const drops = refreshDrops({ records, outbox: remaining, rows: data.rows, removedBefore: data.removed_before });
        await db.outbox.where("op_id").anyOf(drops.opIds).delete();
        await db.bookmarks.bulkDelete(drops.duaIds);
        remaining = withoutAcknowledged(remaining, drops.opIds);
      }
      const pending = new Set(remaining.filter(claimsRecord).map((o) => recordRef(o.type, o)));
      for (const row of data.rows) {
        const type = CLIENT_TYPES[row.type];
        if (!type) continue; // a row of a type this build does not know
        const existing = await db[type.table].get(keyOf(row.type, row));
        const applied = applyPulledRow(row, existing, pending.has(recordRef(row.type, row)));
        if (applied) await db[type.table].put(applied.record);
      }
      await setMeta(db, "cursor", data.cursor);
      await setMeta(db, "refresh_cursor", data.cursor);
      await setMeta(db, "pulled_types", typesKey);
      if (data.owner_id) await setMeta(db, "owner", data.owner_id);
    });
    return { ok: true, sent: ops.length, stale };
  }

  const MAX_ROUNDS = 20; // a safety stop, far above what a real outbox needs (changes go 200 at a time)

  async function loop() {
    let last;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      last = await once();
      if (last.retry) continue; // a 403 just gave the device a new identity: send again at once
      if (last.stale) continue; // the identity changed while the request was away: ask again as the new identity
      if (!last.ok) break; // offline or failed: wait for the next trigger
      if ((await db.outbox.count()) === 0) break; // nothing left to send
    }
    return last;
  }

  /** Runs a sync now. A call while one is running joins it. More requests follow only while changes are still queued. */
  function sync() {
    inFlight ??= loop().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  /** Resolves when no sync is running. It does not start one. */
  async function settled() {
    await inFlight?.catch(() => {});
  }

  /**
   * Asks, sending no changes, whether this device's data was deleted, and clears the device if so. Used before an
   * ended session is signed out, which would otherwise happen without the reader being told. The request can store
   * nothing, and any other answer is ignored.
   */
  async function checkDeleted() {
    const epoch = await getMeta(db, "epoch", 0);
    const anonId = await ensureAnonId(db, newId);
    const cursor = await getMeta(db, "cursor", 0);
    let res;
    try {
      res = await fetchFn(SYNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ anon_id: anonId, cursor, ops: [] }),
      });
    } catch {
      return false;
    }
    return res.status === 410 && clearDeleted(epoch);
  }

  /** Called after a local change: syncs soon, and merges bursts of changes into one request. */
  function notifyChange() {
    if (timer !== null) clearTimeoutFn(timer);
    timer = setTimeoutFn(() => {
      timer = null;
      sync().catch(() => {});
    }, DEBOUNCE_MS);
  }

  /** Starts the automatic triggers: now, back online, tab visible again, and every few minutes. */
  function start({ win = globalThis.window, doc = globalThis.document, setIntervalFn = (...a) => setInterval(...a) } = {}) {
    const run = () => sync().catch(() => {});
    const onVisible = () => {
      if (doc?.visibilityState === "visible") run();
    };
    win?.addEventListener?.("online", run);
    doc?.addEventListener?.("visibilitychange", onVisible);
    const interval = setIntervalFn(run, INTERVAL_MS);
    run();
    return function stop() {
      win?.removeEventListener?.("online", run);
      doc?.removeEventListener?.("visibilitychange", onVisible);
      clearInterval(interval);
      if (timer !== null) clearTimeoutFn(timer);
      timer = null;
    };
  }

  return { sync, notifyChange, start, settled, checkDeleted };
}
