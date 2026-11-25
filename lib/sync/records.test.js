import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  MAX_FUTURE_MS,
  MAX_OPS,
  clampTimestamp,
  mergeBookmark,
  validateOp,
  validateSyncBody,
} from "./records.js";

const rec = (dua_id, deleted, updated_at, op_id) => ({ dua_id, deleted, updated_at, op_id });
const op = (over = {}) => ({
  op_id: randomUUID(),
  type: "bookmark",
  dua_id: 5,
  fields: { deleted: 0 },
  client_ts: 1000,
  ...over,
});
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// A small seeded generator so a failing property run can be repeated.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("later time wins, in either argument order", () => {
  const add = rec(1, 0, 2000, id(1));
  const remove = rec(1, 1, 1000, id(2));
  assert.equal(mergeBookmark(add, remove), add);
  assert.equal(mergeBookmark(remove, add), add);
});

test("device A removes at 10:00 and device B adds at 10:05: the bookmark exists", () => {
  const removed = rec(1, 1, Date.parse("2026-11-25T10:00:00Z"), randomUUID());
  const added = rec(1, 0, Date.parse("2026-11-25T10:05:00Z"), randomUUID());
  assert.equal(mergeBookmark(removed, added).deleted, 0);
  assert.equal(mergeBookmark(added, removed).deleted, 0);
});

test("equal times: the greater op id wins on every device", () => {
  const a = rec(1, 0, 500, id(0xaa));
  const b = rec(1, 1, 500, id(0xbb));
  assert.equal(mergeBookmark(a, b), b);
  assert.equal(mergeBookmark(b, a), b);
});

test("a removal is a record and an older add does not bring it back", () => {
  const removed = rec(1, 1, 3000, randomUUID());
  const olderAdd = rec(1, 0, 2000, randomUUID());
  assert.equal(mergeBookmark(removed, olderAdd).deleted, 1);
});

test("a missing side returns the other", () => {
  const a = rec(1, 0, 1, randomUUID());
  assert.equal(mergeBookmark(null, a), a);
  assert.equal(mergeBookmark(a, undefined), a);
  assert.equal(mergeBookmark(null, null), null);
});

test("merge is commutative, associative and idempotent over random records", () => {
  const next = rng(42);
  // The same op id always carries the same content, as in real use.
  const byOp = new Map();
  const pick = () => {
    const n = Math.floor(next() * 8);
    if (!byOp.has(n)) byOp.set(n, rec(1, next() < 0.5 ? 0 : 1, Math.floor(next() * 4), id(n)));
    return byOp.get(n);
  };
  for (let i = 0; i < 500; i++) {
    const a = pick(), b = pick(), c = pick();
    assert.deepEqual(mergeBookmark(a, b), mergeBookmark(b, a));
    assert.deepEqual(mergeBookmark(mergeBookmark(a, b), c), mergeBookmark(a, mergeBookmark(b, c)));
    assert.deepEqual(mergeBookmark(a, a), a);
  }
});

test("validateOp accepts a good change and keeps only known properties", () => {
  const r = validateOp({ ...op({ client_ts: 1234.9 }), extra: "x" });
  assert.equal(r.ok, true);
  assert.equal(r.op.client_ts, 1234);
  assert.equal("extra" in r.op, false);
});

test("validateOp rejects bad changes", () => {
  const bad = [
    null,
    "x",
    [],
    op({ op_id: "nope" }),
    op({ type: "memorize" }),
    op({ type: "__proto__" }),
    op({ dua_id: 0 }),
    op({ dua_id: -3 }),
    op({ dua_id: 1.5 }),
    op({ dua_id: "5" }),
    op({ dua_id: Number.MAX_SAFE_INTEGER + 2 }),
    op({ fields: null }),
    op({ fields: { deleted: 2 } }),
    op({ fields: { deleted: true } }),
    op({ client_ts: NaN }),
    op({ client_ts: -1 }),
    op({ client_ts: "1000" }),
  ];
  for (const b of bad) assert.equal(validateOp(b).ok, false, JSON.stringify(b));
});

test("validateSyncBody accepts a good body", () => {
  const r = validateSyncBody({ anon_id: randomUUID(), cursor: 0, ops: [op(), op({ dua_id: 6 })] });
  assert.equal(r.ok, true);
  assert.equal(r.value.ops.length, 2);
});

test("validateSyncBody: missing list or unknown type is 400", () => {
  assert.equal(validateSyncBody({ anon_id: randomUUID(), cursor: 0 }).status, 400);
  assert.equal(validateSyncBody({ anon_id: randomUUID(), cursor: 0, ops: [op({ type: "x" })] }).status, 400);
  assert.equal(validateSyncBody({ anon_id: "x", cursor: 0, ops: [] }).status, 400);
  assert.equal(validateSyncBody({ anon_id: randomUUID(), cursor: -1, ops: [] }).status, 400);
  assert.equal(validateSyncBody(null).status, 400);
});

test("validateSyncBody: more than the limit is 413", () => {
  const ops = Array.from({ length: MAX_OPS + 1 }, () => op());
  const r = validateSyncBody({ anon_id: randomUUID(), cursor: 0, ops });
  assert.equal(r.status, 413);
  assert.equal(validateSyncBody({ anon_id: randomUUID(), cursor: 0, ops: ops.slice(1) }).ok, true);
});

test("clampTimestamp only changes times more than a day ahead", () => {
  const now = 1_000_000_000_000;
  assert.equal(clampTimestamp(now - 5, now), now - 5);
  assert.equal(clampTimestamp(now + MAX_FUTURE_MS, now), now + MAX_FUTURE_MS);
  assert.equal(clampTimestamp(now + MAX_FUTURE_MS + 1, now), now);
});
