// The record types that sync, and how their changes are validated and merged (design D1, D5).
// Pure: no database, no browser APIs. The server and the client both use these functions,
// so a merge gives the same answer wherever it runs.

import { isSettingName, isValidSetting } from "../preferences.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Largest change list one request may carry (design D1). */
export const MAX_OPS = 200;
/** A client clock more than this far ahead of the server is treated as the server's time (design D5). */
export const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

export function isUuid(value) {
  return typeof value === "string" && UUID.test(value);
}

export function isDuaId(value) {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * The newest change wins (design D2): the record with the later `updated_at`, and on equal times the greater `op_id`.
 * Commutative, associative and idempotent, so any order or repetition gives the same result. Records of one kind that
 * carry `{ updated_at, op_id }` (bookmarks, settings) share it.
 */
export function newestWins(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.updated_at !== b.updated_at) return a.updated_at > b.updated_at ? a : b;
  if (a.op_id === b.op_id) return a;
  return a.op_id > b.op_id ? a : b;
}

/** A bookmark record: `{ dua_id, deleted, updated_at, op_id }`. The newest change wins. */
export function mergeBookmark(a, b) {
  return newestWins(a, b);
}

/** Turns a validated change into the record it would create. */
function bookmarkFromOp(op) {
  return {
    dua_id: op.dua_id,
    deleted: op.fields.deleted,
    updated_at: op.client_ts,
    op_id: op.op_id,
  };
}

/** The highest reset generation accepted. It stops a buggy device pushing its own counter out of reach (design D1). */
export const MAX_RESET_GEN = 1_000_000;

/**
 * A memorize record: `{ dua_id, learned, progress, reset_gen }`. The further progress wins (design D2):
 * a higher `reset_gen` replaces the other record outright, and within one generation each of `learned` and `progress`
 * takes the larger value. No times are compared, so a device's clock cannot change the result. Commutative,
 * associative and idempotent.
 */
export function mergeMemorize(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.reset_gen !== b.reset_gen) return a.reset_gen > b.reset_gen ? a : b;
  return {
    dua_id: a.dua_id,
    learned: Math.max(a.learned, b.learned),
    progress: Math.max(a.progress, b.progress),
    reset_gen: a.reset_gen,
  };
}

const isBit = (v) => v === 0 || v === 1;

function memorizeFromOp(op) {
  return {
    dua_id: op.dua_id,
    learned: op.fields.learned,
    progress: op.fields.progress,
    reset_gen: op.fields.reset_gen,
  };
}

function memorizeFromRow(row) {
  return {
    dua_id: Number(row.dua_id),
    learned: Number(row.learned),
    progress: Number(row.progress),
    reset_gen: Number(row.reset_gen),
  };
}

/**
 * A setting record: `{ pref_key, value, updated_at, op_id }`, one per setting name (design D2). The newest change wins,
 * the same rule as bookmarks. A reader never removes a setting: choosing the default is an ordinary record.
 */
export function mergePreference(a, b) {
  return newestWins(a, b);
}

/**
 * The rule used for a setting when an anonymous device meets an account (design D3): the account's value stays, and the
 * incoming one is used only when the account has none. Whatever the times. Idempotent, but deliberately not commutative:
 * which side is "existing" is the whole point.
 */
export function mergePreferenceAnon(existing, incoming) {
  return existing ?? incoming;
}

function preferenceFromOp(op) {
  return { pref_key: op.pref_key, value: op.fields.value, updated_at: op.client_ts, op_id: op.op_id };
}

function preferenceFromRow(row) {
  return {
    pref_key: String(row.pref_key),
    value: String(row.value),
    updated_at: Number(row.updated_at),
    op_id: String(row.op_id),
  };
}

/** What a stored row of a bookmark looks like as a record (numbers and strings, never database types). */
function bookmarkFromRow(row) {
  return {
    dua_id: Number(row.dua_id),
    deleted: Number(row.deleted),
    updated_at: Number(row.updated_at),
    op_id: String(row.op_id),
  };
}

/**
 * One entry per record type (design D4). The server's store, the sign-in merge and the validation all loop over this
 * table, so a new record type is a new entry here and nothing else in the sync code.
 *
 *  table, keyField, columns   where it is stored: the key column and the value columns, in order
 *  validateKey, validateFields, cleanFields   check a change (`validateFields(fields, key)`), then copy only the
 *                             known properties of `fields`
 *  fromOp(op)                 the record a validated change would create
 *  fromRow(row)               a stored row as a record
 *  merge(a, b)                the conflict rule (commutative, associative, idempotent)
 *  mergeAnon(existing, incoming)   optional: the rule at sign-in and for "set if absent" changes. A type without it uses `merge`
 *  same(a, b)                 true when the winner of a merge is the record already stored, so nothing is written
 *  normalize(record, now)     corrections the server applies to a record before merging it
 */
export const RECORD_TYPES = {
  bookmark: {
    table: "bookmarks",
    keyField: "dua_id",
    columns: ["deleted", "updated_at", "op_id"],
    validateKey: isDuaId,
    validateFields: (fields) =>
      fields !== null && typeof fields === "object" && (fields.deleted === 0 || fields.deleted === 1),
    cleanFields: (fields) => ({ deleted: fields.deleted }),
    merge: mergeBookmark,
    same: (a, b) => a.op_id === b.op_id,
    fromOp: bookmarkFromOp,
    fromRow: bookmarkFromRow,
    normalize: (record, now) => ({ ...record, updated_at: clampTimestamp(record.updated_at, now) }),
  },
  memorize: {
    table: "memorize",
    keyField: "dua_id",
    columns: ["learned", "progress", "reset_gen"],
    validateKey: isDuaId,
    validateFields: (fields) =>
      fields !== null &&
      typeof fields === "object" &&
      isBit(fields.learned) &&
      Number.isInteger(fields.progress) && fields.progress >= 0 && fields.progress <= 100 &&
      Number.isInteger(fields.reset_gen) && fields.reset_gen >= 0 && fields.reset_gen <= MAX_RESET_GEN,
    cleanFields: (fields) => ({ learned: fields.learned, progress: fields.progress, reset_gen: fields.reset_gen }),
    merge: mergeMemorize,
    same: (a, b) =>
      a.learned === b.learned && a.progress === b.progress && a.reset_gen === b.reset_gen,
    fromOp: memorizeFromOp,
    fromRow: memorizeFromRow,
    normalize: (record) => record, // nothing here depends on a clock
  },
  preference: {
    table: "preferences",
    keyField: "pref_key",
    columns: ["value", "updated_at", "op_id"],
    validateKey: isSettingName,
    // `if_absent` is 0 (an ordinary change) or 1 (store only if the account has no value yet), 0 when left out.
    validateFields: (fields, key) =>
      fields !== null &&
      typeof fields === "object" &&
      isValidSetting(key, fields.value) &&
      (fields.if_absent === undefined || isBit(fields.if_absent)),
    cleanFields: (fields) => ({ value: fields.value, if_absent: fields.if_absent ?? 0 }),
    merge: mergePreference,
    mergeAnon: mergePreferenceAnon,
    same: (a, b) => a.op_id === b.op_id,
    fromOp: preferenceFromOp,
    fromRow: preferenceFromRow,
    normalize: (record, now) => ({ ...record, updated_at: clampTimestamp(record.updated_at, now) }),
  },
};

/** The names of the record types, in a stable order. */
export const RECORD_TYPE_NAMES = Object.keys(RECORD_TYPES);

/** The types a request that names none is answered with. Code that predates a type never asks for it (design D5). */
export const DEFAULT_TYPES = ["bookmark"];

/**
 * Checks one change from a request. Returns `{ ok: true, op }` with a clean copy (only known
 * properties), or `{ ok: false, error }`.
 */
export function validateOp(op) {
  if (op === null || typeof op !== "object" || Array.isArray(op)) {
    return { ok: false, error: "change is not an object" };
  }
  if (!isUuid(op.op_id)) return { ok: false, error: "op_id must be a UUID" };
  if (typeof op.type !== "string" || !Object.hasOwn(RECORD_TYPES, op.type)) {
    return { ok: false, error: "unknown record type" };
  }
  const type = RECORD_TYPES[op.type];
  const key = op[type.keyField];
  if (!type.validateKey(key)) return { ok: false, error: `${type.keyField} is not valid for ${op.type}` };
  if (!type.validateFields(op.fields, key)) return { ok: false, error: "invalid fields" };
  if (typeof op.client_ts !== "number" || !Number.isFinite(op.client_ts) || op.client_ts < 0) {
    return { ok: false, error: "client_ts must be a non-negative number" };
  }
  return {
    ok: true,
    op: {
      op_id: op.op_id,
      type: op.type,
      [type.keyField]: key,
      fields: type.cleanFields(op.fields),
      client_ts: Math.floor(op.client_ts),
    },
  };
}

/** The key of a change or record of this type, under the name its descriptor gives (`dua_id`, `pref_key`). */
export function keyOf(typeName, thing) {
  return thing[RECORD_TYPES[typeName].keyField];
}

/**
 * The record types a request asks to receive (design D5). Absent or empty means bookmarks only. Names this server
 * does not know are dropped, so a device that is newer than the server still gets what the server has.
 */
function validateTypes(types) {
  if (types === undefined) return { ok: true, types: [...DEFAULT_TYPES] };
  if (!Array.isArray(types) || types.length > 32 || !types.every((t) => typeof t === "string")) {
    return { ok: false, error: "types must be a list of names" };
  }
  if (types.length === 0) return { ok: true, types: [...DEFAULT_TYPES] };
  return { ok: true, types: [...new Set(types)].filter((t) => Object.hasOwn(RECORD_TYPES, t)) };
}

/** Checks a whole request body. Returns `{ ok: true, value }` or `{ ok: false, status, error }`. */
export function validateSyncBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "body must be an object" };
  }
  const { anon_id: anonId, cursor, ops, types } = body;
  if (!isUuid(anonId)) return { ok: false, status: 400, error: "anon_id must be a UUID" };
  if (!Number.isSafeInteger(cursor) || cursor < 0) {
    return { ok: false, status: 400, error: "cursor must be a non-negative integer" };
  }
  if (!Array.isArray(ops)) return { ok: false, status: 400, error: "ops must be a list" };
  if (ops.length > MAX_OPS) return { ok: false, status: 413, error: `at most ${MAX_OPS} changes per request` };
  const clean = [];
  for (const op of ops) {
    const result = validateOp(op);
    if (!result.ok) return { ok: false, status: 400, error: result.error };
    clean.push(result.op);
  }
  const wanted = validateTypes(types);
  if (!wanted.ok) return { ok: false, status: 400, error: wanted.error };
  return { ok: true, value: { anonId, cursor, ops: clean, types: wanted.types } };
}

/** A time more than a day ahead of `now` becomes `now`, so a wrong clock cannot win every conflict. */
export function clampTimestamp(ts, now) {
  return ts > now + MAX_FUTURE_MS ? now : ts;
}
