// The client's side of sync as pure functions (design D6): how a local change becomes a record and an op,
// how rows pulled from the server are applied, and which ops go in the next request.
// The Dexie code calls these inside its transactions, and the convergence test calls them on in-memory state,
// so the rules the test checks are the rules the app runs.
import { MAX_OPS, MAX_RESET_GEN, RECORD_TYPES, keyOf, mergeBookmark, mergeMemorize, newestWins } from "../sync/records.js";
import { defaultOf, isValidSetting } from "../preferences.js";

/**
 * A change as it goes on the wire or into `kept_ops`: only the known properties, with the record's key under the name
 * its type gives it (`dua_id` or `pref_key`). Used by the runner and by sign-in and sign-out, so none of them assumes a number.
 */
export function wireOp(op) {
  const keyField = RECORD_TYPES[op.type]?.keyField ?? "dua_id";
  return { op_id: op.op_id, type: op.type, [keyField]: op[keyField], fields: op.fields, client_ts: op.client_ts };
}

/**
 * True when a queued change claims its record: it may still beat a row pulled for the same record, so the two are
 * merged. A "set only if the account has none" change (`if_absent`, queued at sign-in) claims nothing: if the account
 * has a value, that value wins on this device even while the change is still waiting to be sent (design D3, D4).
 */
export const claimsRecord = (op) => op.fields?.if_absent !== 1;

/** Names a record of a type in a set: `type:key`. */
export const recordRef = (type, thing) => `${type}:${keyOf(type, thing)}`;

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

// ---- memorize (design D2, D3) ----

/** What a dua the reader has never touched looks like. There is no stored record for it. */
export const NOT_STARTED = Object.freeze({ learned: 0, progress: 0, reset_gen: 0 });

/** The progress steps the panel offers. The data accepts any whole number from 0 to 100 (design D1). */
export const PROGRESS_STEPS = Object.freeze([0, 25, 50, 75, 100]);

/**
 * What the reader's action means, as a target state (design D3).
 * `action` is `{ kind: "learned", value: boolean }`, `{ kind: "progress", value: number }` or `{ kind: "startOver" }`.
 *  - ticking "learned" sets progress to 100 too
 *  - un-ticking it leaves the progress as it is
 *  - choosing a step keeps "learned" only at 100, so "learned at 25%" cannot happen
 */
export function memorizeTarget(existing, action) {
  const cur = existing ?? NOT_STARTED;
  switch (action?.kind) {
    case "learned":
      return action.value ? { learned: 1, progress: 100 } : { learned: 0, progress: cur.progress };
    case "progress":
      return { learned: action.value === 100 ? cur.learned : 0, progress: action.value };
    case "startOver":
      return { learned: 0, progress: 0 };
    default:
      throw new Error("unknown memorize action");
  }
}

/**
 * The reader wants a dua in `target` (`{ dua_id, learned, progress }`). Returns `{ record, op }`, or null when that is
 * the state it is already in. A target below the existing learned flag or progress is a reset: the generation goes
 * up by one, so the change beats older progress on every device. Anything else keeps the generation.
 */
export function memorizeChange(existing, target, { op_id, now }) {
  const { dua_id, learned, progress } = target;
  if (!(learned === 0 || learned === 1) || !Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new Error("a memorize target needs learned 0 or 1 and a whole progress from 0 to 100");
  }
  const cur = existing ?? NOT_STARTED;
  if (cur.learned === learned && cur.progress === progress) return null;
  const backwards = learned < cur.learned || progress < cur.progress;
  const reset_gen = backwards ? Math.min(cur.reset_gen + 1, MAX_RESET_GEN) : cur.reset_gen;
  return {
    record: { dua_id, learned, progress, reset_gen },
    op: { op_id, type: "memorize", dua_id, fields: { learned, progress, reset_gen }, client_ts: Math.floor(now) },
  };
}

/** A pulled memorize row is merged with the local record. This is right with or without changes waiting (design D6). */
export function pulledMemorize(existing, row) {
  const incoming = { dua_id: row.dua_id, learned: row.learned, progress: row.progress, reset_gen: row.reset_gen };
  return mergeMemorize(existing, incoming);
}

const resendMemorize = (records, newId) =>
  records.map((r) => ({
    op_id: newId(),
    type: "memorize",
    dua_id: r.dua_id,
    fields: { learned: r.learned, progress: r.progress, reset_gen: r.reset_gen },
    client_ts: Date.now(),
  }));

// ---- settings (design D3, D4) ----

/**
 * The reader chose `value` for the setting `pref_key` (design D4). Returns `{ record, op }`, or null when nothing
 * changes: the same value as the record, or the default when there is no record (a reader who never chose has no
 * record, and choosing the default then needs none). A value that is not valid for the name is an error.
 * Like a bookmark change, the record always wins on this device: its time is at least 1 ms after the one it replaces.
 */
export function preferenceChange(existing, { pref_key, value, now, op_id }) {
  if (!isValidSetting(pref_key, value)) throw new Error(`not a valid value for the setting ${pref_key}`);
  if (existing ? existing.value === value : value === defaultOf(pref_key)) return null;
  const client_ts = Math.max(Math.floor(now), (existing?.updated_at ?? 0) + 1);
  return {
    record: { pref_key, value, updated_at: client_ts, op_id },
    op: { op_id, type: "preference", pref_key, fields: { value, if_absent: 0 }, client_ts },
  };
}

/**
 * The record to store for a setting row pulled from the server: the bookmark rule. With a change of ours waiting for
 * that name the two are merged (newest wins); otherwise the server's row replaces ours, because the server has already
 * merged everything it was sent and may have stored a corrected time.
 */
export function pulledPreference(existing, row, hasPendingOp) {
  const incoming = { pref_key: row.pref_key, value: row.value, updated_at: row.updated_at, op_id: row.op_id };
  return hasPendingOp ? newestWins(existing, incoming) : incoming;
}

/**
 * Settings as changes to send again. Ordinary changes keep the op id and time the record has (safe to send twice, as for
 * bookmarks). At sign-in (`atSignIn`) each one is an `if_absent` change with a new op id instead: the server stores it
 * only for a setting the account does not have, so the device's older choice cannot beat the account's (design D3).
 */
const resendPreferences = (records, newId, { atSignIn = false } = {}) =>
  records.map((r) => ({
    op_id: atSignIn ? newId() : r.op_id,
    type: "preference",
    pref_key: r.pref_key,
    fields: { value: r.value, if_absent: atSignIn ? 1 : 0 },
    client_ts: r.updated_at,
  }));

/**
 * Every local record of one type as a change, sent again as a safety net: at sign-in in case the server could not prove
 * which anonymous owner this device was (design D8), and after a 403. Safe to send twice. A bookmark keeps the op id
 * and time it already has. A type whose records have no single op (memorize) gets a new op id from `newId` for each one.
 * `options.atSignIn` tells a type that treats sign-in differently (settings) which of the two this is.
 */
export function resendOps(records, typeName = "bookmark", newId = () => crypto.randomUUID(), options = {}) {
  return CLIENT_TYPES[typeName].resend(records, newId, options);
}

const resendBookmarks = (records) =>
  records.map((r) => ({
    op_id: r.op_id,
    type: "bookmark",
    dua_id: r.dua_id,
    fields: { deleted: r.deleted },
    client_ts: r.updated_at,
  }));

/**
 * The record types this browser stores (design D6): where each lives in the local store, how a pulled row is applied
 * to it and how its records are re-sent. The runner and the sign-in and sign-out code loop over this table.
 * `replaceQueuedAtSignIn` marks a type whose queued changes are dropped at sign-in and replaced by its own `atSignIn`
 * re-send (design D3).
 */
export const CLIENT_TYPES = {
  bookmark: { table: "bookmarks", pulled: pulledRecord, resend: resendBookmarks },
  memorize: { table: "memorize", pulled: pulledMemorize, resend: resendMemorize },
  preference: { table: "preferences", pulled: pulledPreference, resend: resendPreferences, replaceQueuedAtSignIn: true },
};

/** The names sent to the server as the types this device understands (design D5). Sorted, so it compares as text. */
export const clientTypeNames = () => Object.keys(CLIENT_TYPES).sort();

/** The Dexie tables of every record type. */
export const recordTables = (db) => Object.values(CLIENT_TYPES).map((type) => db[type.table]);

/** Every local record of every type, as changes to send. `options.atSignIn` is passed to each type's re-send. */
export async function allResendOps(db, newId, options = {}) {
  const out = [];
  for (const [name, type] of Object.entries(CLIENT_TYPES)) {
    out.push(...resendOps(await db[type.table].toArray(), name, newId, options));
  }
  return out;
}

/**
 * Applies one row pulled from the server. Returns `{ type, record }` for the table to write, or null for a row of a
 * type this build does not know (the server is newer than the browser): it is skipped.
 */
export function applyPulledRow(row, existing, hasPending) {
  if (!Object.hasOwn(CLIENT_TYPES, row.type)) return null;
  return { type: CLIENT_TYPES[row.type], record: CLIENT_TYPES[row.type].pulled(existing, row, hasPending) };
}
