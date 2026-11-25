// The local store in the browser (design D6): bookmarks, the outbox of changes not yet sent, small settings
// (`meta`), and changes kept after an offline sign-out (`kept_ops`, design D8).
// Client only. `createDb` takes the IndexedDB implementation as an option so tests can use fake-indexeddb.
import Dexie from "dexie";

export const DB_NAME = "dua-user";

export function createDb(options = {}) {
  const db = new Dexie(DB_NAME, options);
  db.version(1).stores({
    // key: dua_id. One record per dua, including removed ones (deleted = 1), so a removal can sync.
    bookmarks: "dua_id, updated_at",
    // oldest first by `seq`; `op_id` is unique so a change is never queued twice.
    outbox: "++seq, &op_id",
    // key: name. anon_id, owner, cursor, epoch.
    meta: "name",
    // Changes kept for an account after signing out with unsynced changes.
    kept_ops: "++seq, &op_id, account_owner, kept_at",
  });
  return db;
}

let shared = null;

/** The one database of this browser tab. Created on first use, never during server rendering. */
export function getDb() {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is not available here");
  shared ??= createDb();
  return shared;
}

export async function getMeta(db, name, fallback = null) {
  const row = await db.meta.get(name);
  return row === undefined ? fallback : row.value;
}

export async function setMeta(db, name, value) {
  await db.meta.put({ name, value });
}

/** The device's anonymous id, created on first use. Safe when called twice at once. */
export async function ensureAnonId(db, newId = () => crypto.randomUUID()) {
  return db.transaction("rw", db.meta, async () => {
    const existing = await db.meta.get("anon_id");
    if (existing) return existing.value;
    const id = newId();
    await db.meta.put({ name: "anon_id", value: id });
    return id;
  });
}
