// The client's side of sync as pure functions (design D6): how a local change becomes a record and an op,
// how rows pulled from the server are applied, and which ops go in the next request.
// The Dexie code calls these inside its transactions, and the convergence test calls them on in-memory state,
// so the rules the test checks are the rules the app runs.
import { MAX_OPS, mergeBookmark } from "../sync/records.js";

/**
 * A local add or remove. The record always wins on this device: its time is at least one millisecond after the
 * record it replaces, even if this device's clock is behind the time a synced record carries.
 *
 * @returns {{ record: object, op: object }}
 */
export function localChange(existing, { dua_id, deleted, now, op_id }) {
  const client_ts = Math.max(Math.floor(now), (existing?.updated_at ?? 0) + 1);
  return {
    record: { dua_id, deleted, updated_at: client_ts, op_id },
    op: { op_id, type: "bookmark", dua_id, fields: { deleted }, client_ts },
  };
}

/**
 * The record to store for a row pulled from the server.
 * - A change of ours that the server has not acknowledged yet (it is still in the outbox) may still beat the row,
 *   so the two are merged with the usual rule.
 * - Otherwise the server's row is the truth. The server has already merged everything it was sent, and it may have
 *   stored a corrected time, so the row replaces ours.
 */
export function pulledRecord(existing, row, hasPendingOp) {
  const incoming = { dua_id: row.dua_id, deleted: row.deleted, updated_at: row.updated_at, op_id: row.op_id };
  return hasPendingOp ? mergeBookmark(existing, incoming) : incoming;
}

/** The next request's changes: the oldest ones first, at most `max`. `outbox` is oldest-first. */
export function nextBatch(outbox, max = MAX_OPS) {
  return outbox.slice(0, max);
}

/** The outbox without the changes the server confirmed. Anything added meanwhile stays. */
export function withoutAcknowledged(outbox, sentOpIds) {
  const sent = new Set(sentOpIds);
  return outbox.filter((op) => !sent.has(op.op_id));
}

/**
 * Every local bookmark as a change, with its own op id and time. Sent at sign-in as a safety net, in case the
 * server could not prove which anonymous owner this device was (design D8). Safe to send twice.
 */
export function resendOps(records) {
  return records.map((r) => ({
    op_id: r.op_id,
    type: "bookmark",
    dua_id: r.dua_id,
    fields: { deleted: r.deleted },
    client_ts: r.updated_at,
  }));
}
