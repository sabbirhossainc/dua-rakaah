import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  MAX_FUTURE_MS,
  MAX_OPS,
  MAX_RESET_GEN,
  DEFAULT_TYPES,
  RECORD_TYPES,
  RECORD_TYPE_NAMES,
  clampTimestamp,
  keyOf,
  mergeBookmark,
  mergeMemorize,
  mergePreference,
  mergePreferenceAnon,
  newestWins,
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
    op({ type: "future" }),
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

test("every record type has the whole descriptor the server loops over", () => {
  assert.ok(RECORD_TYPE_NAMES.includes("bookmark"));
  for (const [name, type] of Object.entries(RECORD_TYPES)) {
    for (const fn of ["validateKey", "validateFields", "cleanFields", "merge", "same", "fromOp", "fromRow", "normalize"]) {
      assert.equal(typeof type[fn], "function", `${name}.${fn}`);
    }
    for (const text of ["table", "keyField"]) assert.equal(typeof type[text], "string", `${name}.${text}`);
    assert.ok(Array.isArray(type.columns) && type.columns.length > 0, `${name}.columns`);
  }
});

test("bookmark descriptor: same, normalize and fromRow", () => {
  const b = RECORD_TYPES.bookmark;
  assert.equal(b.same(rec(1, 0, 5, id(1)), rec(1, 1, 9, id(1))), true);
  assert.equal(b.same(rec(1, 0, 5, id(1)), rec(1, 0, 5, id(2))), false);
  const now = 1_000_000_000_000;
  assert.equal(b.normalize(rec(1, 0, now + MAX_FUTURE_MS + 1, id(1)), now).updated_at, now);
  assert.deepEqual(b.normalize(rec(1, 0, 7, id(1)), now), rec(1, 0, 7, id(1)));
  assert.deepEqual(b.fromRow({ dua_id: 3n, deleted: 1n, updated_at: 9n, op_id: id(4) }), rec(3, 1, 9, id(4)));
});

test("validateOp output for a bookmark is exactly the known properties", () => {
  const o = op({ client_ts: 55 });
  assert.deepEqual(validateOp({ ...o, fields: { deleted: 1, junk: 1 } }).op, {
    op_id: o.op_id,
    type: "bookmark",
    dua_id: 5,
    fields: { deleted: 1 },
    client_ts: 55,
  });
});

test("validateSyncBody: types defaults to bookmarks, drops unknown names, and rejects a non-list", () => {
  const base = { anon_id: randomUUID(), cursor: 0, ops: [] };
  assert.deepEqual(validateSyncBody(base).value.types, DEFAULT_TYPES);
  assert.deepEqual(validateSyncBody({ ...base, types: [] }).value.types, DEFAULT_TYPES);
  assert.deepEqual(validateSyncBody({ ...base, types: ["bookmark", "bookmark", "nope", "__proto__"] }).value.types, ["bookmark"]);
  assert.deepEqual(validateSyncBody({ ...base, types: ["nope"] }).value.types, []);
  for (const bad of ["bookmark", {}, 3, [1], [null], Array.from({ length: 33 }, () => "bookmark")]) {
    assert.equal(validateSyncBody({ ...base, types: bad }).status, 400, JSON.stringify(bad));
  }
});

// ---- memorize (design D1, D2) ----

const mem = (dua_id, learned, progress, reset_gen = 0) => ({ dua_id, learned, progress, reset_gen });
const memOp = (fields, over = {}) => ({
  op_id: randomUUID(),
  type: "memorize",
  dua_id: 9,
  fields: { learned: 0, progress: 25, reset_gen: 0, ...fields },
  client_ts: 1000,
  ...over,
});

test("memorize: two devices make progress and the larger progress wins in either order", () => {
  const a = mem(1, 0, 50);
  const b = mem(1, 0, 75);
  assert.deepEqual(mergeMemorize(a, b), mem(1, 0, 75));
  assert.deepEqual(mergeMemorize(b, a), mem(1, 0, 75));
});

test("memorize: learned on one device and 50 not learned on another gives learned at 100", () => {
  const a = mem(1, 1, 100);
  const b = mem(1, 0, 50);
  assert.deepEqual(mergeMemorize(a, b), mem(1, 1, 100));
  assert.deepEqual(mergeMemorize(b, a), mem(1, 1, 100));
});

test("memorize: learned and progress are merged field by field", () => {
  assert.deepEqual(mergeMemorize(mem(1, 1, 25), mem(1, 0, 75)), mem(1, 1, 75));
});

test("memorize: a reset beats older progress, in either order", () => {
  const high = mem(1, 0, 75, 0);
  const reset = mem(1, 0, 25, 1);
  assert.deepEqual(mergeMemorize(high, reset), reset);
  assert.deepEqual(mergeMemorize(reset, high), reset);
});

test("memorize: progress made before a reset that arrives late changes nothing", () => {
  const stored = mem(1, 0, 25, 1);
  assert.deepEqual(mergeMemorize(stored, mem(1, 1, 100, 0)), stored);
});

test("memorize: two resets from the same start share a generation and merge by the larger values", () => {
  const a = mem(1, 0, 25, 1);
  const b = mem(1, 0, 50, 1);
  assert.deepEqual(mergeMemorize(a, b), mem(1, 0, 50, 1));
  assert.deepEqual(mergeMemorize(b, a), mem(1, 0, 50, 1));
});

test("memorize: a missing side returns the other", () => {
  const a = mem(1, 0, 25);
  assert.equal(mergeMemorize(null, a), a);
  assert.equal(mergeMemorize(a, undefined), a);
  assert.equal(mergeMemorize(null, null), null);
});

test("memorize: merge is commutative, associative and idempotent over random records with mixed generations", () => {
  const next = rng(7);
  const pick = () => mem(1, next() < 0.5 ? 0 : 1, Math.floor(next() * 5) * 25, Math.floor(next() * 3));
  for (let i = 0; i < 1000; i++) {
    const a = pick(), b = pick(), c = pick();
    assert.deepEqual(mergeMemorize(a, b), mergeMemorize(b, a));
    assert.deepEqual(mergeMemorize(mergeMemorize(a, b), c), mergeMemorize(a, mergeMemorize(b, c)));
    assert.deepEqual(mergeMemorize(a, a), a);
    assert.deepEqual(mergeMemorize(mergeMemorize(a, b), b), mergeMemorize(a, b));
  }
});

test("memorize: the record type has the descriptor and compares fields for 'same'", () => {
  const m = RECORD_TYPES.memorize;
  assert.equal(m.same(mem(1, 0, 25, 0), mem(1, 0, 25, 0)), true);
  assert.equal(m.same(mem(1, 0, 25, 0), mem(1, 0, 25, 1)), false);
  assert.equal(m.same(mem(1, 0, 25, 0), mem(1, 1, 25, 0)), false);
  assert.deepEqual(m.fromOp(validateOp(memOp({ learned: 1, progress: 100, reset_gen: 2 })).op), mem(9, 1, 100, 2));
  assert.deepEqual(m.fromRow({ dua_id: 9n, learned: 1n, progress: 50n, reset_gen: 3n }), mem(9, 1, 50, 3));
  const r = mem(9, 0, 25, 0);
  assert.equal(m.normalize(r, 5), r);
});

test("memorize: validateOp accepts good changes at the edges and keeps only known properties", () => {
  for (const fields of [
    { learned: 0, progress: 0, reset_gen: 0 },
    { learned: 1, progress: 100, reset_gen: MAX_RESET_GEN },
    { learned: 0, progress: 33, reset_gen: 4 }, // any whole progress is accepted, not only the five steps
  ]) {
    const r = validateOp(memOp(fields, { client_ts: 12.7 }));
    assert.equal(r.ok, true, JSON.stringify(fields));
    assert.deepEqual(r.op.fields, fields);
    assert.equal(r.op.client_ts, 12);
  }
  assert.deepEqual(validateOp(memOp({ extra: 1 })).op.fields, { learned: 0, progress: 25, reset_gen: 0 });
});

test("memorize: validateOp rejects every bad value", () => {
  const bad = [
    { progress: 101 },
    { progress: -1 },
    { progress: 12.5 },
    { progress: "50" },
    { progress: null },
    { progress: NaN },
    { learned: 2 },
    { learned: true },
    { learned: "1" },
    { reset_gen: -1 },
    { reset_gen: 1.5 },
    { reset_gen: MAX_RESET_GEN + 1 },
    { reset_gen: "1" },
    { reset_gen: undefined },
  ];
  for (const fields of bad) assert.equal(validateOp(memOp(fields)).ok, false, JSON.stringify(fields));
  assert.equal(validateOp(memOp({}, { fields: null })).ok, false);
  assert.equal(validateOp(memOp({}, { dua_id: 0 })).ok, false);
  assert.equal(validateOp(memOp({}, { dua_id: 2.5 })).ok, false);
});

test("memorize: validateSyncBody takes memorize changes and types naming it", () => {
  const body = { anon_id: randomUUID(), cursor: 0, ops: [memOp({})], types: ["bookmark", "memorize"] };
  const r = validateSyncBody(body);
  assert.equal(r.ok, true);
  assert.deepEqual(r.value.types, ["bookmark", "memorize"]);
  assert.equal(validateSyncBody({ ...body, ops: [memOp({ progress: 101 })] }).status, 400);
});

// ---- key generalization and the shared newest-wins rule (add-preferences 2.1) ----

test("keyOf reads the key under the name each record type gives", () => {
  assert.equal(keyOf("bookmark", { dua_id: 7, deleted: 0 }), 7);
  assert.equal(keyOf("memorize", { dua_id: 9, learned: 0 }), 9);
  assert.equal(keyOf("bookmark", { pref_key: "theme" }), undefined);
});

test("validateOp for a memorize change is exactly the known properties, with its key", () => {
  const o = { op_id: id(7), type: "memorize", dua_id: 12, fields: { learned: 1, progress: 100, reset_gen: 2, junk: 1 }, client_ts: 9.8, extra: 1 };
  assert.deepEqual(validateOp(o).op, {
    op_id: id(7),
    type: "memorize",
    dua_id: 12,
    fields: { learned: 1, progress: 100, reset_gen: 2 },
    client_ts: 9,
  });
});

test("validateOp names the key field of the type when the key is bad", () => {
  assert.match(validateOp(op({ dua_id: 0 })).error, /dua_id/);
  assert.match(validateOp(op({ type: "memorize", dua_id: -1, fields: { learned: 0, progress: 0, reset_gen: 0 } })).error, /dua_id/);
});

test("newestWins gives the same answers as the bookmark rule, and mergeBookmark is that rule", () => {
  const a = rec(1, 0, 2000, id(1));
  const b = rec(1, 1, 1000, id(2));
  assert.equal(newestWins(a, b), a);
  assert.equal(newestWins(b, a), a);
  const c = rec(1, 0, 500, id(0xaa));
  const d = rec(1, 1, 500, id(0xbb));
  assert.equal(newestWins(c, d), d);
  assert.equal(newestWins(d, c), d);
  assert.equal(newestWins(null, a), a);
  assert.equal(newestWins(a, undefined), a);
  assert.equal(newestWins(null, null), null);
  assert.equal(newestWins(a, { ...a }), a);
  const next = rng(11);
  for (let i = 0; i < 200; i++) {
    const x = rec(1, i % 2, Math.floor(next() * 5), id(Math.floor(next() * 4)));
    const y = rec(1, (i + 1) % 2, Math.floor(next() * 5), id(Math.floor(next() * 4)));
    assert.equal(mergeBookmark(x, y), newestWins(x, y));
  }
});

// ---- settings (add-preferences 3.2) ----

const pref = (pref_key, value, updated_at, op_id) => ({ pref_key, value, updated_at, op_id });
const prefOp = (over = {}) => ({
  op_id: randomUUID(),
  type: "preference",
  pref_key: "theme",
  fields: { value: "dark", if_absent: 0 },
  client_ts: 1000,
  ...over,
});

test("preference: device A selects dark at 10:00 and device B light at 10:05, light wins in either order", () => {
  const a = pref("theme", "dark", Date.parse("2026-11-25T10:00:00Z"), randomUUID());
  const b = pref("theme", "light", Date.parse("2026-11-25T10:05:00Z"), randomUUID());
  assert.equal(mergePreference(a, b).value, "light");
  assert.equal(mergePreference(b, a).value, "light");
});

test("preference: equal times, the greater op id wins whatever the order", () => {
  const a = pref("theme", "dark", 500, id(0xaa));
  const b = pref("theme", "light", 500, id(0xbb));
  assert.equal(mergePreference(a, b), b);
  assert.equal(mergePreference(b, a), b);
});

test("preference: back to the default is an ordinary record that beats an older non-default value", () => {
  const dark = pref("theme", "dark", 1000, id(1));
  const light = pref("theme", "light", 2000, id(2));
  assert.equal(mergePreference(dark, light).value, "light");
  assert.equal(mergePreference(light, dark).value, "light");
});

test("preference: a missing side returns the other", () => {
  const a = pref("theme", "dark", 1, id(1));
  assert.equal(mergePreference(null, a), a);
  assert.equal(mergePreference(a, undefined), a);
  assert.equal(mergePreference(null, null), null);
});

test("preference: merge is commutative, associative and idempotent over random records", () => {
  const next = rng(99);
  const pick = (list) => list[Math.floor(next() * list.length)];
  // One op makes one record, so two records with the same op id are the same record: give them the same value and time.
  const byOp = new Map();
  const random = () => {
    const op_id = id(Math.floor(next() * 12));
    if (!byOp.has(op_id)) {
      byOp.set(op_id, pref("arabic_font", pick(["small", "medium", "large", "xlarge"]), Math.floor(next() * 6), op_id));
    }
    return byOp.get(op_id);
  };
  for (let i = 0; i < 500; i++) {
    const [a, b, c] = [random(), random(), random()];
    assert.deepEqual(mergePreference(a, b), mergePreference(b, a));
    assert.deepEqual(mergePreference(mergePreference(a, b), c), mergePreference(a, mergePreference(b, c)));
    assert.deepEqual(mergePreference(a, a), a);
  }
});

test("preference: mergeAnon keeps the account's value whatever the times, and fills a missing one", () => {
  const account = pref("theme", "dark", 100, id(1));
  const device = pref("theme", "light", 999_999, id(2)); // newer, but the account's wins at sign-in
  assert.equal(mergePreferenceAnon(account, device), account);
  assert.equal(mergePreferenceAnon(null, device), device);
  assert.equal(mergePreferenceAnon(undefined, device), device);
  assert.equal(mergePreferenceAnon(account, account), account);
  // Merging again changes nothing (a second sign-in merge is a no-op).
  assert.equal(mergePreferenceAnon(mergePreferenceAnon(account, device), device), account);
  assert.equal(mergePreferenceAnon(mergePreferenceAnon(null, device), device), device);
});

test("preference: the descriptor is complete and keyed by pref_key", () => {
  const t = RECORD_TYPES.preference;
  assert.ok(RECORD_TYPE_NAMES.includes("preference"));
  assert.equal(t.table, "preferences");
  assert.equal(t.keyField, "pref_key");
  assert.deepEqual(t.columns, ["value", "updated_at", "op_id"]);
  assert.equal(typeof t.mergeAnon, "function");
  assert.equal(RECORD_TYPES.bookmark.mergeAnon, undefined);
  assert.equal(RECORD_TYPES.memorize.mergeAnon, undefined);
  assert.equal(keyOf("preference", { pref_key: "theme", dua_id: 3 }), "theme");
});

test("preference: same, normalize, fromOp and fromRow", () => {
  const t = RECORD_TYPES.preference;
  assert.equal(t.same(pref("theme", "dark", 5, id(1)), pref("theme", "light", 9, id(1))), true);
  assert.equal(t.same(pref("theme", "dark", 5, id(1)), pref("theme", "dark", 5, id(2))), false);
  const now = 1_000_000_000_000;
  assert.equal(t.normalize(pref("theme", "dark", now + MAX_FUTURE_MS + 1, id(1)), now).updated_at, now);
  assert.deepEqual(t.normalize(pref("theme", "dark", 7, id(1)), now), pref("theme", "dark", 7, id(1)));
  assert.deepEqual(t.fromRow({ pref_key: "theme", value: "dark", updated_at: 9n, op_id: id(4) }), pref("theme", "dark", 9, id(4)));
  const o = validateOp(prefOp({ op_id: id(5), client_ts: 77 })).op;
  assert.deepEqual(t.fromOp(o), pref("theme", "dark", 77, id(5)));
});

test("preference: validateOp accepts every valid value and keeps only known properties", () => {
  for (const [name, value] of [
    ["theme", "light"],
    ["theme", "dark"],
    ["arabic_font", "small"],
    ["arabic_font", "medium"],
    ["arabic_font", "large"],
    ["arabic_font", "xlarge"],
    ["reciter_id", "7"],
    ["reciter_id", "999999"],
  ]) {
    const r = validateOp(prefOp({ pref_key: name, fields: { value, junk: 1 }, junk: 2 }));
    assert.equal(r.ok, true, `${name}=${value}`);
    assert.deepEqual(Object.keys(r.op).sort(), ["client_ts", "fields", "op_id", "pref_key", "type"]);
    assert.deepEqual(r.op.fields, { value, if_absent: 0 });
  }
});

test("preference: if_absent is 0 or 1, left out means 0, and 2 is refused", () => {
  assert.equal(validateOp(prefOp({ fields: { value: "dark" } })).op.fields.if_absent, 0);
  assert.equal(validateOp(prefOp({ fields: { value: "dark", if_absent: 0 } })).op.fields.if_absent, 0);
  assert.equal(validateOp(prefOp({ fields: { value: "dark", if_absent: 1 } })).op.fields.if_absent, 1);
  for (const bad of [2, -1, "1", true, null, 0.5]) {
    assert.equal(validateOp(prefOp({ fields: { value: "dark", if_absent: bad } })).ok, false, JSON.stringify(bad));
  }
});

test("preference: validateOp rejects an unknown or missing name and a value that is not text or not valid", () => {
  const bad = [
    prefOp({ pref_key: "language" }),
    prefOp({ pref_key: "__proto__" }),
    prefOp({ pref_key: "constructor" }),
    prefOp({ pref_key: "" }),
    prefOp({ pref_key: 7 }),
    prefOp({ pref_key: null }),
    prefOp({ pref_key: undefined }),
    prefOp({ dua_id: 5, pref_key: undefined }), // a change that names a dua number instead of a setting
    prefOp({ fields: null }),
    prefOp({ fields: {} }),
    prefOp({ fields: { value: 1 } }),
    prefOp({ fields: { value: null } }),
    prefOp({ fields: { value: true } }),
    prefOp({ fields: { value: ["dark"] } }),
    prefOp({ fields: { value: "blue" } }),
    prefOp({ fields: { value: "" } }),
    prefOp({ fields: { value: "Dark" } }),
    prefOp({ pref_key: "arabic_font", fields: { value: "huge" } }),
    prefOp({ pref_key: "arabic_font", fields: { value: "dark" } }), // valid for another setting, not this one
    prefOp({ pref_key: "theme", fields: { value: "large" } }),
    prefOp({ pref_key: "reciter_id", fields: { value: "0" } }),
    prefOp({ pref_key: "reciter_id", fields: { value: "07" } }),
    prefOp({ pref_key: "reciter_id", fields: { value: "1234567" } }),
    prefOp({ pref_key: "reciter_id", fields: { value: "abc" } }),
    prefOp({ pref_key: "reciter_id", fields: { value: 7 } }),
    prefOp({ client_ts: -1 }),
    prefOp({ op_id: "nope" }),
  ];
  for (const b of bad) assert.equal(validateOp(b).ok, false, JSON.stringify(b));
  assert.match(validateOp(prefOp({ pref_key: "language" })).error, /pref_key/);
});

test("preference: a bookmark change that names pref_key and no dua_id is refused, and the reverse", () => {
  assert.equal(validateOp({ op_id: randomUUID(), type: "bookmark", pref_key: "theme", fields: { deleted: 0 }, client_ts: 1 }).ok, false);
  assert.equal(validateOp({ op_id: randomUUID(), type: "preference", dua_id: 5, fields: { value: "dark" }, client_ts: 1 }).ok, false);
});

test("preference: validateSyncBody takes setting changes and a types list naming them", () => {
  const anon = randomUUID();
  const ok = validateSyncBody({ anon_id: anon, cursor: 0, ops: [prefOp()], types: ["bookmark", "memorize", "preference"] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.value.types, ["bookmark", "memorize", "preference"]);
  assert.equal(ok.value.ops[0].pref_key, "theme");
  assert.equal(validateSyncBody({ anon_id: anon, cursor: 0, ops: [prefOp()] }).value.types.includes("preference"), false);
  const refused = validateSyncBody({ anon_id: anon, cursor: 0, ops: [prefOp({ fields: { value: "blue" } })] });
  assert.equal(refused.ok, false);
  assert.equal(refused.status, 400);
});

test("since: optional, kept when given, and refused unless it is a whole number from 0", () => {
  const base = { anon_id: "00000000-0000-4000-8000-000000000001", cursor: 0, ops: [] };
  assert.equal("since" in validateSyncBody(base).value, false);
  for (const since of [0, 12]) assert.equal(validateSyncBody({ ...base, since }).value.since, since);
  for (const since of [-1, 1.5, "3", null]) {
    const r = validateSyncBody({ ...base, since });
    assert.equal(r.ok, false, String(since));
    assert.equal(r.status, 400);
  }
});
