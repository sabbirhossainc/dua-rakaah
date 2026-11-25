// The record types that sync, and how their changes are validated and merged (design D1, D5).
// Pure: no database, no browser APIs. The server and the client both use these functions,
// so a merge gives the same answer wherever it runs.

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
 * A bookmark record: `{ dua_id, deleted, updated_at, op_id }`.
 * The change with the later `updated_at` wins. On equal times the greater `op_id` wins.
 * Commutative, associative and idempotent, so any order or repetition gives the same result.
 */
export function mergeBookmark(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.updated_at !== b.updated_at) return a.updated_at > b.updated_at ? a : b;
  if (a.op_id === b.op_id) return a;
  return a.op_id > b.op_id ? a : b;
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

/** One entry per record type. Adding memorize later means adding an entry here. */
export const RECORD_TYPES = {
  bookmark: {
    table: "bookmarks",
    keyField: "dua_id",
    validateKey: isDuaId,
    validateFields: (fields) =>
      fields !== null && typeof fields === "object" && (fields.deleted === 0 || fields.deleted === 1),
    merge: mergeBookmark,
    fromOp: bookmarkFromOp,
  },
};

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
  if (!type.validateKey(op.dua_id)) return { ok: false, error: "dua_id must be a positive integer" };
  if (!type.validateFields(op.fields)) return { ok: false, error: "invalid fields" };
  if (typeof op.client_ts !== "number" || !Number.isFinite(op.client_ts) || op.client_ts < 0) {
    return { ok: false, error: "client_ts must be a non-negative number" };
  }
  return {
    ok: true,
    op: {
      op_id: op.op_id,
      type: op.type,
      dua_id: op.dua_id,
      fields: { deleted: op.fields.deleted },
      client_ts: Math.floor(op.client_ts),
    },
  };
}

/** Checks a whole request body. Returns `{ ok: true, value }` or `{ ok: false, status, error }`. */
export function validateSyncBody(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, status: 400, error: "body must be an object" };
  }
  const { anon_id: anonId, cursor, ops } = body;
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
  return { ok: true, value: { anonId, cursor, ops: clean } };
}

/** A time more than a day ahead of `now` becomes `now`, so a wrong clock cannot win every conflict. */
export function clampTimestamp(ts, now) {
  return ts > now + MAX_FUTURE_MS ? now : ts;
}
