// The local store in the browser (design D6): bookmarks, memorize records, the reader's settings (`preferences`),
// the outbox of changes not yet sent, small internal values (`meta`), and changes kept after an offline sign-out
// (`kept_ops`, design D8).
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
  // Version 2 (memorize): key dua_id. One record per dua the reader has touched. Never edit version 1 above.
  db.version(2).stores({
    memorize: "dua_id, progress",
  });
  // Version 3 (settings): key pref_key. One record per setting the reader has chosen a value for (design D4).
  // Earlier versions are never edited. Code that only declares version 2 still opens a version 3 database.
  db.version(3).stores({
    preferences: "pref_key",
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
