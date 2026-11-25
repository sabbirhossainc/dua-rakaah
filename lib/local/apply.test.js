import test from "node:test";
import assert from "node:assert/strict";
import { MAX_OPS } from "../sync/records.js";
import { localChange, nextBatch, pulledRecord, resendOps, withoutAcknowledged } from "./apply.js";

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
