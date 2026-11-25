// Applying changes to the shared database and reading what a device has not seen (design D1, D4, D5).
// Works on any libSQL executor (a client or a transaction). No "server-only" import, so tests can load it.
import { RECORD_TYPES, clampTimestamp } from "./records.js";

// A local file database gives every transaction its own connection, and two write transactions at once fail with
// SQLITE_BUSY. So write transactions of one client run one after another inside this process. Between processes,
// Turso orders writes itself.
const queues = new WeakMap();

/** Runs `fn(tx)` in one write transaction: committed if it returns, rolled back if it throws. */
export function withWriteTx(client, fn) {
  const previous = queues.get(client) ?? Promise.resolve();
  const run = previous.then(async () => {
    const tx = await client.transaction("write");
    try {
      const result = await fn(tx);
      await tx.commit();
      return result;
    } catch (error) {
      try {
        await tx.rollback();
      } catch {
        // The original error is the useful one.
      }
      throw error;
    } finally {
      tx.close();
    }
  });
  queues.set(client, run.catch(() => {}));
  return run;
}

/** The next position from the single counter. Must run inside a write transaction. */
export async function nextSeq(tx) {
  await tx.execute("UPDATE sync_counter SET value = value + 1 WHERE id = 1");
  const r = await tx.execute("SELECT value FROM sync_counter WHERE id = 1");
  return Number(r.rows[0].value);
}

function toBookmark(row) {
  return {
    dua_id: Number(row.dua_id),
    deleted: Number(row.deleted),
    updated_at: Number(row.updated_at),
    op_id: String(row.op_id),
  };
}

export async function getBookmark(tx, ownerId, duaId) {
  const r = await tx.execute({
    sql: "SELECT dua_id, deleted, updated_at, op_id FROM bookmarks WHERE owner_id = ? AND dua_id = ?",
    args: [ownerId, duaId],
  });
  return r.rows[0] ? toBookmark(r.rows[0]) : null;
}

/**
 * Merges `incoming` into the owner's stored bookmark. Writes (with a new position) only when the
 * incoming record wins. Returns true when something was written.
 */
export async function mergeBookmarkInto(tx, ownerId, incoming) {
  const merge = RECORD_TYPES.bookmark.merge;
  const existing = await getBookmark(tx, ownerId, incoming.dua_id);
  const winner = merge(existing, incoming);
  if (existing && winner.op_id === existing.op_id) return false;
  const seq = await nextSeq(tx);
  await tx.execute({
    sql: `INSERT INTO bookmarks (owner_id, dua_id, deleted, updated_at, op_id, server_seq)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT (owner_id, dua_id) DO UPDATE SET
            deleted = excluded.deleted, updated_at = excluded.updated_at,
            op_id = excluded.op_id, server_seq = excluded.server_seq`,
    args: [ownerId, winner.dua_id, winner.deleted, winner.updated_at, winner.op_id, seq],
  });
  return true;
}

/** Applies each change that has not been applied before. Returns how many were applied. */
export async function applyOps(tx, ownerId, ops, now) {
  let applied = 0;
  for (const op of ops) {
    const seen = await tx.execute({ sql: "SELECT 1 FROM applied_ops WHERE owner_id = ? AND op_id = ?", args: [ownerId, op.op_id] });
    if (seen.rows.length > 0) continue;
    await tx.execute({
      sql: "INSERT INTO applied_ops (owner_id, op_id, applied_at) VALUES (?, ?, ?)",
      args: [ownerId, op.op_id, now],
    });
    const record = RECORD_TYPES[op.type].fromOp(op);
    record.updated_at = clampTimestamp(record.updated_at, now);
    await mergeBookmarkInto(tx, ownerId, record);
    applied += 1;
  }
  return applied;
}

/** Everything of the owner's after `cursor`, oldest first, and the position to ask from next time. */
export async function readSince(tx, ownerId, cursor) {
  const r = await tx.execute({
    sql: `SELECT dua_id, deleted, updated_at, op_id, server_seq FROM bookmarks
           WHERE owner_id = ? AND server_seq > ? ORDER BY server_seq`,
    args: [ownerId, cursor],
  });
  const rows = r.rows.map((row) => ({ type: "bookmark", ...toBookmark(row), server_seq: Number(row.server_seq) }));
  const last = rows.length > 0 ? rows[rows.length - 1].server_seq : cursor;
  return { cursor: Math.max(cursor, last), rows };
}

/**
 * One sync for a known owner, in one write transaction: apply the changes, then read what is new.
 * (Identity and merging are added around this by `syncRequest` in service.js, in the same transaction.)
 */
export async function applySync(client, { ownerId, ops, cursor, now }) {
  return withWriteTx(client, async (tx) => {
    await applyOps(tx, ownerId, ops, now);
    return readSince(tx, ownerId, cursor);
  });
}
