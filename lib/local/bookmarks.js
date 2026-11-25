// Bookmarks in the local store (design D6). Every change is one transaction that updates the record and queues the
// change together, so there is never a state change without a change to send, or the other way round.
import { localChange } from "./apply.js";

/**
 * Adds the bookmark, or removes it if it is already there. Returns whether the dua is bookmarked afterwards.
 * Bookmarking applies to the whole dua (one id), not to a part of it.
 */
export async function toggleBookmark(db, duaId, { now = Date.now(), newId = () => crypto.randomUUID() } = {}) {
  if (!Number.isSafeInteger(duaId) || duaId <= 0) throw new Error("duaId must be a positive integer");
  return db.transaction("rw", db.bookmarks, db.outbox, async () => {
    const existing = await db.bookmarks.get(duaId);
    const deleted = existing && existing.deleted === 0 ? 1 : 0;
    const { record, op } = localChange(existing, { dua_id: duaId, deleted, now, op_id: newId() });
    await db.bookmarks.put(record);
    await db.outbox.add(op);
    return deleted === 0;
  });
}

/** Bookmarked duas (not removed ones), newest first. */
export async function listBookmarks(db) {
  const all = await db.bookmarks.toArray();
  return all.filter((r) => r.deleted === 0).sort((a, b) => b.updated_at - a.updated_at || a.dua_id - b.dua_id);
}

/** True when a bookmark exists for this dua. */
export async function isBookmarked(db, duaId) {
  const r = await db.bookmarks.get(duaId);
  return Boolean(r && r.deleted === 0);
}
