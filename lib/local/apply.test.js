import test from "node:test";
import assert from "node:assert/strict";
import { MAX_OPS, MAX_RESET_GEN, mergePreference, validateOp } from "../sync/records.js";
import {
  CLIENT_TYPES,
  PROGRESS_STEPS,
  applyPulledRow,
  claimsRecord,
  clientTypeNames,
  localChange,
  memorizeChange,
  memorizeTarget,
  nextBatch,
  preferenceChange,
  pulledMemorize,
  pulledPreference,
  pulledRecord,
  recordRef,
  resendOps,
  wireOp,
  withoutAcknowledged,
} from "./apply.js";

const rec = (dua_id, deleted, updated_at, op_id) => ({ dua_id, deleted, updated_at, op_id });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("a local change on a new bookmark uses the device time", () => {
  const { record, op } = localChange(undefined, { dua_id: 5, deleted: 0, now: 1000, op_id: id(1) });
  assert.deepEqual(record, rec(5, 0, 1000, id(1)));
  assert.deepEqual(op, { op_id: id(1), type: "bookmark", dua_id: 5, fields: { deleted: 0 }, client_ts: 1000 });
});

test("a local change always wins over the record it replaces, even when the clock is behind", () => {
  const existing = rec(5, 0, 5000, id(1));
  const { record, op } = localChange(existing, { dua_id: 5, deleted: 1, now: 2000, op_id: id(2) });
  assert.equal(record.updated_at, 5001);
  assert.equal(op.client_ts, 5001);
});

test("a pulled row replaces the record when no change of ours is waiting", () => {
  const local = rec(5, 0, 9000, id(1)); // a time the server corrected downwards
  const row = { type: "bookmark", ...rec(5, 0, 4000, id(1)), server_seq: 7 };
  assert.deepEqual(pulledRecord(local, row, false), rec(5, 0, 4000, id(1)));
});

test("a pulled row is merged with a change of ours that is still waiting", () => {
  const mine = rec(5, 1, 9000, id(2));
  const older = rec(5, 0, 4000, id(1));
  const newer = rec(5, 0, 12000, id(3));
  assert.deepEqual(pulledRecord(mine, older, true), mine);
  assert.deepEqual(pulledRecord(mine, newer, true), newer);
});

test("a pulled row for a bookmark we do not have is stored", () => {
  const row = rec(8, 0, 100, id(1));
  assert.deepEqual(pulledRecord(undefined, row, false), row);
  assert.deepEqual(pulledRecord(undefined, row, true), row);
});

test("a pulled row is copied without the server's extra fields", () => {
  const out = pulledRecord(undefined, { type: "bookmark", ...rec(8, 0, 100, id(1)), server_seq: 3 }, false);
  assert.deepEqual(Object.keys(out).sort(), ["deleted", "dua_id", "op_id", "updated_at"]);
});

test("nextBatch takes the oldest changes up to the limit", () => {
  const outbox = Array.from({ length: MAX_OPS + 30 }, (_, i) => ({ op_id: id(i) }));
  const batch = nextBatch(outbox);
  assert.equal(batch.length, MAX_OPS);
  assert.equal(batch[0].op_id, id(0));
  assert.equal(nextBatch(outbox, 3).length, 3);
  assert.deepEqual(nextBatch([]), []);
});

test("acknowledged changes leave the outbox and changes added meanwhile stay", () => {
  const outbox = [{ op_id: id(1) }, { op_id: id(2) }, { op_id: id(3) }];
  assert.deepEqual(withoutAcknowledged(outbox, [id(1), id(2)]), [{ op_id: id(3) }]);
  assert.deepEqual(withoutAcknowledged(outbox, []), outbox);
});

test("resendOps turns every record into a change with its own id and time", () => {
  const ops = resendOps([rec(1, 0, 10, id(1)), rec(2, 1, 20, id(2))]);
  assert.deepEqual(ops, [
    { op_id: id(1), type: "bookmark", dua_id: 1, fields: { deleted: 0 }, client_ts: 10 },
    { op_id: id(2), type: "bookmark", dua_id: 2, fields: { deleted: 1 }, client_ts: 20 },
  ]);
});

test("applyPulledRow dispatches on the row's type and skips an unknown one", () => {
  const row = { type: "bookmark", ...rec(8, 0, 100, id(1)), server_seq: 3 };
  const applied = applyPulledRow(row, undefined, false);
  assert.equal(applied.type, CLIENT_TYPES.bookmark);
  assert.deepEqual(applied.record, rec(8, 0, 100, id(1)));
  assert.equal(applyPulledRow({ type: "future", dua_id: 1 }, undefined, false), null);
  assert.equal(applyPulledRow({ type: "__proto__", dua_id: 1 }, undefined, false), null);
});

test("resendOps with a type gives the same changes as before for bookmarks", () => {
  assert.deepEqual(resendOps([rec(1, 0, 10, id(1))], "bookmark"), resendOps([rec(1, 0, 10, id(1))]));
});

// ---- memorize (design D3) ----

const NOT_TOUCHED = undefined;
const stored = (learned, progress, reset_gen = 0) => ({ dua_id: 5, learned, progress, reset_gen });
const change = (existing, learned, progress) =>
  memorizeChange(existing, { dua_id: 5, learned, progress }, { op_id: id(1), now: 1234.9 });

test("memorizeChange: a first step on an untouched dua is forward at generation 0", () => {
  const { record, op } = change(NOT_TOUCHED, 0, 25);
  assert.deepEqual(record, stored(0, 25, 0));
  assert.deepEqual(op, {
    op_id: id(1),
    type: "memorize",
    dua_id: 5,
    fields: { learned: 0, progress: 25, reset_gen: 0 },
    client_ts: 1234,
  });
});

test("memorizeChange: raising progress or ticking learned keeps the generation", () => {
  assert.deepEqual(change(stored(0, 25, 2), 0, 75).record, stored(0, 75, 2));
  assert.deepEqual(change(stored(0, 50, 2), 1, 100).record, stored(1, 100, 2));
});

test("memorizeChange: lowering progress, un-ticking learned and starting over raise the generation by one", () => {
  assert.deepEqual(change(stored(0, 75, 0), 0, 25).record, stored(0, 25, 1));
  assert.deepEqual(change(stored(1, 100, 3), 0, 100).record, stored(0, 100, 4));
  assert.deepEqual(change(stored(1, 100, 0), 0, 0).record, stored(0, 0, 1));
  assert.equal(change(stored(0, 75, 0), 0, 25).op.fields.reset_gen, 1);
});

test("memorizeChange: mixed (learned up, progress down) is a reset", () => {
  assert.deepEqual(change(stored(0, 75, 0), 1, 50).record, stored(1, 50, 1));
});

test("memorizeChange: the state it is already in is no change", () => {
  assert.equal(change(stored(0, 50, 1), 0, 50), null);
  assert.equal(change(NOT_TOUCHED, 0, 0), null);
});

test("memorizeChange: a device with a stale generation makes its change at that generation", () => {
  const { op } = change(stored(0, 25, 0), 0, 50);
  assert.equal(op.fields.reset_gen, 0);
});

test("memorizeChange: the generation stops at the cap", () => {
  assert.equal(change(stored(0, 75, MAX_RESET_GEN), 0, 25).record.reset_gen, MAX_RESET_GEN);
});

test("memorizeChange: refuses a target the server would refuse", () => {
  for (const [learned, progress] of [[2, 0], [0, 101], [0, -1], [0, 12.5], [true, 0]]) {
    assert.throws(() => change(NOT_TOUCHED, learned, progress), `${learned} ${progress}`);
  }
});

test("memorizeTarget: what each action of the reader means", () => {
  assert.deepEqual(memorizeTarget(stored(0, 50), { kind: "learned", value: true }), { learned: 1, progress: 100 });
  assert.deepEqual(memorizeTarget(stored(1, 100), { kind: "learned", value: false }), { learned: 0, progress: 100 });
  assert.deepEqual(memorizeTarget(stored(0, 50), { kind: "learned", value: false }), { learned: 0, progress: 50 });
  assert.deepEqual(memorizeTarget(stored(1, 100), { kind: "progress", value: 100 }), { learned: 1, progress: 100 });
  assert.deepEqual(memorizeTarget(stored(1, 100), { kind: "progress", value: 75 }), { learned: 0, progress: 75 });
  assert.deepEqual(memorizeTarget(stored(0, 25), { kind: "progress", value: 100 }), { learned: 0, progress: 100 });
  assert.deepEqual(memorizeTarget(NOT_TOUCHED, { kind: "progress", value: 25 }), { learned: 0, progress: 25 });
  assert.deepEqual(memorizeTarget(stored(1, 100), { kind: "startOver" }), { learned: 0, progress: 0 });
  assert.throws(() => memorizeTarget(NOT_TOUCHED, { kind: "nope" }));
  assert.deepEqual(PROGRESS_STEPS, [0, 25, 50, 75, 100]);
});

test("pulledMemorize merges with the local record whatever is waiting, and copies only the known fields", () => {
  const row = { type: "memorize", ...stored(0, 25, 1), server_seq: 9 };
  assert.deepEqual(pulledMemorize(stored(1, 100, 0), row), stored(0, 25, 1)); // the reset wins
  assert.deepEqual(pulledMemorize(stored(0, 75, 1), row), stored(0, 75, 1)); // same generation: the larger
  assert.deepEqual(pulledMemorize(undefined, row), stored(0, 25, 1));
  assert.deepEqual(Object.keys(pulledMemorize(undefined, row)).sort(), ["dua_id", "learned", "progress", "reset_gen"]);
});

test("applyPulledRow routes a memorize row to the memorize table", () => {
  const row = { type: "memorize", ...stored(0, 25, 0), server_seq: 9 };
  const applied = applyPulledRow(row, undefined, false);
  assert.equal(applied.type, CLIENT_TYPES.memorize);
  assert.equal(applied.type.table, "memorize");
  assert.deepEqual(applied.record, stored(0, 25, 0));
});

test("resendOps for memorize gives every record a new op id and carries its generation", () => {
  let n = 0;
  const ops = resendOps([stored(0, 25, 1), { ...stored(1, 100, 0), dua_id: 6 }], "memorize", () => id(++n));
  assert.deepEqual(ops.map((o) => [o.op_id, o.type, o.dua_id, o.fields]), [
    [id(1), "memorize", 5, { learned: 0, progress: 25, reset_gen: 1 }],
    [id(2), "memorize", 6, { learned: 1, progress: 100, reset_gen: 0 }],
  ]);
  assert.ok(ops.every((o) => Number.isFinite(o.client_ts) && o.client_ts >= 0));
});

test("the names sent to the server include memorize and preference", () => {
  assert.deepEqual(clientTypeNames(), ["bookmark", "memorize", "preference"]);
});

// ---- settings (add-preferences 4.1) ----

const prefRec = (pref_key, value, updated_at, op_id) => ({ pref_key, value, updated_at, op_id });

test("preferenceChange: a first choice makes a record and an ordinary change with the same time and op id", () => {
  const { record, op } = preferenceChange(undefined, { pref_key: "theme", value: "dark", now: 1000, op_id: id(1) });
  assert.deepEqual(record, prefRec("theme", "dark", 1000, id(1)));
  assert.deepEqual(op, { op_id: id(1), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: 1000 });
});

test("preferenceChange: the same value as the record is no change", () => {
  assert.equal(preferenceChange(prefRec("theme", "dark", 5, id(1)), { pref_key: "theme", value: "dark", now: 9000, op_id: id(2) }), null);
});

test("preferenceChange: the default with no record is no change, and with a record it is an ordinary change", () => {
  assert.equal(preferenceChange(undefined, { pref_key: "theme", value: "light", now: 1000, op_id: id(1) }), null);
  assert.equal(preferenceChange(undefined, { pref_key: "arabic_font", value: "medium", now: 1000, op_id: id(1) }), null);
  const back = preferenceChange(prefRec("theme", "dark", 5, id(1)), { pref_key: "theme", value: "light", now: 1000, op_id: id(2) });
  assert.deepEqual(back.record, prefRec("theme", "light", 1000, id(2)));
  assert.equal(back.op.fields.value, "light");
});

test("preferenceChange: a clock behind the stored record still gives a newer time", () => {
  const { record, op } = preferenceChange(prefRec("theme", "dark", 5000, id(1)), { pref_key: "theme", value: "light", now: 100, op_id: id(2) });
  assert.equal(record.updated_at, 5001);
  assert.equal(op.client_ts, 5001);
  assert.equal(mergePreference(prefRec("theme", "dark", 5000, id(1)), record), record);
});

test("preferenceChange: a bad name or value is refused", () => {
  const change = (pref_key, value) => () => preferenceChange(undefined, { pref_key, value, now: 1, op_id: id(1) });
  assert.throws(change("theme", "blue"));
  assert.throws(change("language", "bn"));
  assert.throws(change("theme", 1));
  assert.throws(change("arabic_font", "huge"));
  assert.throws(change("reciter_id", "0"));
  assert.throws(change("reciter_id", null)); // the reciter has no default to go back to
});

test("preferenceChange: the change it makes is one the server accepts", () => {
  const { op } = preferenceChange(undefined, { pref_key: "reciter_id", value: "7", now: 12.7, op_id: id(1) });
  assert.equal(validateOp(op).ok, true);
});

test("pulledPreference: with nothing queued the server's row replaces the record, even an older time", () => {
  const local = prefRec("theme", "light", 9000, id(2));
  const row = { type: "preference", pref_key: "theme", value: "dark", updated_at: 100, op_id: id(1), server_seq: 4 };
  assert.deepEqual(pulledPreference(local, row, false), prefRec("theme", "dark", 100, id(1)));
  assert.deepEqual(pulledPreference(undefined, row, false), prefRec("theme", "dark", 100, id(1)));
});

test("pulledPreference: a queued newer change beats an older pulled row, and an older one loses", () => {
  const row = { type: "preference", pref_key: "theme", value: "dark", updated_at: 100, op_id: id(1), server_seq: 4 };
  const newer = prefRec("theme", "light", 9000, id(2));
  assert.equal(pulledPreference(newer, row, true), newer);
  const older = prefRec("theme", "light", 50, id(3));
  assert.deepEqual(pulledPreference(older, row, true), prefRec("theme", "dark", 100, id(1)));
  assert.deepEqual(pulledPreference(undefined, row, true), prefRec("theme", "dark", 100, id(1)));
});

test("pulledPreference copies only the known fields", () => {
  const row = { type: "preference", pref_key: "theme", value: "dark", updated_at: 1, op_id: id(1), server_seq: 4, junk: 1 };
  assert.deepEqual(Object.keys(pulledPreference(undefined, row, false)).sort(), ["op_id", "pref_key", "updated_at", "value"]);
});

test("applyPulledRow routes a setting row to the preferences table", () => {
  const row = { type: "preference", pref_key: "theme", value: "dark", updated_at: 7, op_id: id(1), server_seq: 9 };
  const applied = applyPulledRow(row, undefined, false);
  assert.equal(applied.type, CLIENT_TYPES.preference);
  assert.equal(applied.type.table, "preferences");
  assert.deepEqual(applied.record, prefRec("theme", "dark", 7, id(1)));
});

test("resendOps for settings: ordinary changes keep the record's op id and time", () => {
  const ops = resendOps([prefRec("theme", "dark", 50, id(1)), prefRec("arabic_font", "large", 60, id(2))], "preference", () => id(99));
  assert.deepEqual(ops, [
    { op_id: id(1), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: 50 },
    { op_id: id(2), type: "preference", pref_key: "arabic_font", fields: { value: "large", if_absent: 0 }, client_ts: 60 },
  ]);
  assert.deepEqual(resendOps([prefRec("theme", "dark", 50, id(1))], "preference", () => id(99), { atSignIn: false }), [ops[0]]);
});

test("resendOps for settings at sign-in: one if_absent change per record, with a new op id", () => {
  let n = 0;
  const ops = resendOps([prefRec("theme", "dark", 50, id(1)), prefRec("arabic_font", "large", 60, id(2))], "preference", () => id(++n + 100), { atSignIn: true });
  assert.deepEqual(ops, [
    { op_id: id(101), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 1 }, client_ts: 50 },
    { op_id: id(102), type: "preference", pref_key: "arabic_font", fields: { value: "large", if_absent: 1 }, client_ts: 60 },
  ]);
  for (const op of ops) assert.equal(validateOp(op).ok, true);
});

test("the sign-in option does not change what bookmarks and memorize re-send", () => {
  const b = [rec(5, 0, 10, id(1))];
  assert.deepEqual(resendOps(b, "bookmark", () => id(9), { atSignIn: true }), resendOps(b, "bookmark", () => id(9)));
  const m = [stored(0, 25, 1)];
  assert.deepEqual(resendOps(m, "memorize", () => id(9), { atSignIn: true }), resendOps(m, "memorize", () => id(9)));
});

test("only settings replace their queued changes at sign-in", () => {
  assert.deepEqual(
    Object.entries(CLIENT_TYPES).filter(([, t]) => t.replaceQueuedAtSignIn).map(([name]) => name),
    ["preference"]
  );
});

test("wireOp copies the key under the name of the record type and nothing else", () => {
  const base = { op_id: id(1), fields: { x: 1 }, client_ts: 5, seq: 3, account_owner: "a", kept_at: 9 };
  assert.deepEqual(wireOp({ ...base, type: "bookmark", dua_id: 5 }), { op_id: id(1), type: "bookmark", dua_id: 5, fields: { x: 1 }, client_ts: 5 });
  assert.deepEqual(wireOp({ ...base, type: "memorize", dua_id: 6 }), { op_id: id(1), type: "memorize", dua_id: 6, fields: { x: 1 }, client_ts: 5 });
  assert.deepEqual(wireOp({ ...base, type: "preference", pref_key: "theme" }), { op_id: id(1), type: "preference", pref_key: "theme", fields: { x: 1 }, client_ts: 5 });
  assert.equal("dua_id" in wireOp({ ...base, type: "preference", pref_key: "theme", dua_id: 3 }), false);
});

test("recordRef names a record by type and key", () => {
  assert.equal(recordRef("bookmark", { dua_id: 5 }), "bookmark:5");
  assert.equal(recordRef("preference", { pref_key: "theme" }), "preference:theme");
});

test("claimsRecord: a set-if-absent change claims nothing, every other change does", () => {
  assert.equal(claimsRecord({ type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 1 } }), false);
  assert.equal(claimsRecord({ type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 } }), true);
  assert.equal(claimsRecord({ type: "bookmark", dua_id: 1, fields: { deleted: 0 } }), true);
  assert.equal(claimsRecord({ type: "memorize", dua_id: 1, fields: { learned: 0, progress: 25, reset_gen: 0 } }), true);
  assert.equal(claimsRecord({ type: "preference", pref_key: "theme" }), true);
});
