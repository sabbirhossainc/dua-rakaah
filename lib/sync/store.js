// Applying changes to the shared database and reading what a device has not seen (design D1, D4, D5).
// Works on any libSQL executor (a client or a transaction). No "server-only" import, so tests can load it.
import { DEFAULT_TYPES, RECORD_TYPES, clampTimestamp } from "./records.js";

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

/** The SQL column list of a record type: its key, then its value columns. Names come from the descriptor, never a request. */
function selectColumns(type) {
  return [type.keyField, ...type.columns].join(", ");
}

/** The owner's stored record of this type and key, or null. */
export async function getRecord(tx, typeName, ownerId, key) {
  const type = RECORD_TYPES[typeName];
  const r = await tx.execute({
    sql: `SELECT ${selectColumns(type)} FROM ${type.table} WHERE owner_id = ? AND ${type.keyField} = ?`,
    args: [ownerId, key],
  });
  return r.rows[0] ? type.fromRow(r.rows[0]) : null;
}

/**
 * Merges `incoming` into the owner's stored record of this type. Writes (with a new position) only when the
 * incoming record changes what is stored. Returns true when something was written.
 *
 * `rule` is `"merge"` (the type's conflict rule) or `"anon"` (design D3): the type's `mergeAnon` when it has one, so a
 * setting the account already has keeps the account's value. A type without `mergeAnon` uses `merge` for both.
 */
export async function mergeRecordInto(tx, typeName, ownerId, incoming, rule = "merge") {
  const type = RECORD_TYPES[typeName];
  const existing = await getRecord(tx, typeName, ownerId, incoming[type.keyField]);
  const pick = rule === "anon" && type.mergeAnon ? type.mergeAnon : type.merge;
  const winner = pick(existing, incoming);
  if (existing && type.same(winner, existing)) return false;
  const seq = await nextSeq(tx);
  const columns = [type.keyField, ...type.columns];
  const names = ["owner_id", ...columns, "server_seq"];
  await tx.execute({
    sql: `INSERT INTO ${type.table} (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})
          ON CONFLICT (owner_id, ${type.keyField}) DO UPDATE SET
            ${[...type.columns, "server_seq"].map((c) => `${c} = excluded.${c}`).join(", ")}`,
    args: [ownerId, ...columns.map((c) => winner[c]), seq],
  });
  return true;
}

/** How far the owner's removals have been purged, or null when nothing of theirs has been (design D1). */
export async function getPurgeMark(tx, ownerId) {
  const r = await tx.execute({ sql: "SELECT seq, removed_before FROM purge_marks WHERE owner_id = ?", args: [ownerId] });
  return r.rows[0] ? { seq: Number(r.rows[0].seq), removed_before: Number(r.rows[0].removed_before) } : null;
}

/**
 * Applies each change that has not been applied before. Returns how many were applied.
 *
 * `removedBefore` is given for a device that missed a purge (design D4): a bookmark change that is not newer than it,
 * for a dua with no stored record, is remembered as applied but not merged, so it cannot bring a purged bookmark back.
 *
 * `accountDeletedAt` is given for an account that was deleted before this sign-in (data deletion, design D7): a change
 * a device had set aside up to then is remembered as applied but not merged.
 */
export async function applyOps(tx, ownerId, ops, now, { removedBefore = null, accountDeletedAt = null } = {}) {
  let applied = 0;
  for (const op of ops) {
    const seen = await tx.execute({ sql: "SELECT 1 FROM applied_ops WHERE owner_id = ? AND op_id = ?", args: [ownerId, op.op_id] });
    if (seen.rows.length > 0) continue;
    await tx.execute({
      sql: "INSERT INTO applied_ops (owner_id, op_id, applied_at) VALUES (?, ?, ?)",
      args: [ownerId, op.op_id, now],
    });
    // A device clock ahead of the server is corrected the same way as for `client_ts`.
    if (accountDeletedAt !== null && op.kept_at !== undefined && clampTimestamp(op.kept_at, now) <= accountDeletedAt) continue;
    const type = RECORD_TYPES[op.type];
    if (removedBefore !== null && op.type === "bookmark" && op.client_ts <= removedBefore) {
      if ((await getRecord(tx, op.type, ownerId, op[type.keyField])) === null) continue;
    }
    // A change marked `if_absent` (a setting re-sent at sign-in) is stored only when the owner has no value yet.
    const rule = op.fields.if_absent === 1 ? "anon" : "merge";
    await mergeRecordInto(tx, op.type, ownerId, type.normalize(type.fromOp(op), now), rule);
    applied += 1;
  }
  return applied;
}

/**
 * Everything of the owner's after `cursor`, oldest first, for the record types asked for, and the position to ask
 * from next time. Names that are not record types are ignored.
 */
export async function readSince(tx, ownerId, cursor, types = DEFAULT_TYPES) {
  const rows = [];
  for (const name of new Set(types)) {
    if (!Object.hasOwn(RECORD_TYPES, name)) continue;
    const type = RECORD_TYPES[name];
    const r = await tx.execute({
      sql: `SELECT ${selectColumns(type)}, server_seq FROM ${type.table}
             WHERE owner_id = ? AND server_seq > ? ORDER BY server_seq`,
      args: [ownerId, cursor],
    });
    for (const row of r.rows) rows.push({ type: name, ...type.fromRow(row), server_seq: Number(row.server_seq) });
  }
  rows.sort((a, b) => a.server_seq - b.server_seq);
  const last = rows.length > 0 ? rows[rows.length - 1].server_seq : cursor;
  return { cursor: Math.max(cursor, last), rows };
}

/**
 * One sync for a known owner, in one write transaction: apply the changes, then read what is new.
 * (Identity and merging are added around this by `syncRequest` in service.js, in the same transaction.)
 */
export async function applySync(client, { ownerId, ops, cursor, now, types }) {
  return withWriteTx(client, async (tx) => {
    await applyOps(tx, ownerId, ops, now);
    return readSince(tx, ownerId, cursor, types);
  });
}
