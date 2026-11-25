import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { applyOps, applySync, readSince, withWriteTx } from "./store.js";

const OWNER = randomUUID();
const NOW = 1_800_000_000_000;
const op = (dua_id, deleted, client_ts, op_id = randomUUID()) => ({
  op_id,
  type: "bookmark",
  dua_id,
  fields: { deleted },
  client_ts,
});

async function setup(t) {
  const h = await testClient();
  t.after(h.cleanup);
  return h.client;
}

test("a first sync stores the change and returns it", async (t) => {
  const client = await setup(t);
  const o = op(5, 0, 1000);
  const r = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW });
  assert.equal(r.rows.length, 1);
  assert.deepEqual(
    { dua_id: r.rows[0].dua_id, deleted: r.rows[0].deleted, op_id: r.rows[0].op_id },
    { dua_id: 5, deleted: 0, op_id: o.op_id }
  );
  assert.equal(r.cursor, r.rows[0].server_seq);
});

test("the same change sent twice changes nothing the second time", async (t) => {
  const client = await setup(t);
  const o = op(5, 0, 1000);
  const first = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW });
  const second = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW + 1 });
  assert.deepEqual(second, first);
  const counter = await client.execute("SELECT value FROM sync_counter");
  assert.equal(Number(counter.rows[0].value), 1);
});

test("a change older than the stored record leaves the stored record alone", async (t) => {
  const client = await setup(t);
  await applySync(client, { ownerId: OWNER, ops: [op(5, 0, 2000)], cursor: 0, now: NOW });
  const r = await applySync(client, { ownerId: OWNER, ops: [op(5, 1, 1000)], cursor: 0, now: NOW });
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].deleted, 0);
  assert.equal(r.rows[0].updated_at, 2000);
});

test("a removal is stored as a record and comes back to other devices", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [op(5, 0, 1000)], cursor: 0, now: NOW });
  const b = await applySync(client, { ownerId: OWNER, ops: [op(5, 1, 2000)], cursor: a.cursor, now: NOW });
  assert.equal(b.rows.length, 1);
  assert.equal(b.rows[0].deleted, 1);
});

test("a pull returns only rows after the cursor, and nothing new keeps the cursor", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [op(1, 0, 10), op(2, 0, 10)], cursor: 0, now: NOW });
  assert.equal(a.rows.length, 2);
  const b = await applySync(client, { ownerId: OWNER, ops: [op(3, 0, 10)], cursor: a.cursor, now: NOW });
  assert.deepEqual(b.rows.map((r) => r.dua_id), [3]);
  const c = await applySync(client, { ownerId: OWNER, ops: [], cursor: b.cursor, now: NOW });
  assert.equal(c.rows.length, 0);
  assert.equal(c.cursor, b.cursor);
});

test("owners do not see each other's rows", async (t) => {
  const client = await setup(t);
  const other = randomUUID();
  await applySync(client, { ownerId: other, ops: [op(9, 0, 10)], cursor: 0, now: NOW });
  const r = await applySync(client, { ownerId: OWNER, ops: [], cursor: 0, now: NOW });
  assert.equal(r.rows.length, 0);
});

test("a time far in the future is stored as the server's time", async (t) => {
  const client = await setup(t);
  const r = await applySync(client, { ownerId: OWNER, ops: [op(5, 0, NOW + 10 * 24 * 3600 * 1000)], cursor: 0, now: NOW });
  assert.equal(r.rows[0].updated_at, NOW);
});

test("positions are strictly increasing and never repeated across 50 concurrent syncs", async (t) => {
  const client = await setup(t);
  const owners = Array.from({ length: 50 }, () => randomUUID());
  await Promise.all(
    owners.map((ownerId, i) => applySync(client, { ownerId, ops: [op(1 + (i % 7), 0, 1000 + i)], cursor: 0, now: NOW }))
  );
  const r = await client.execute("SELECT server_seq FROM bookmarks ORDER BY server_seq");
  const seqs = r.rows.map((row) => Number(row.server_seq));
  assert.equal(seqs.length, 50);
  assert.equal(new Set(seqs).size, 50);
  assert.deepEqual(seqs, [...seqs].sort((a, b) => a - b));
  assert.equal(seqs[0], 1);
  assert.equal(seqs[49], 50);
});

test("a failure on the last change leaves no rows and no applied-change records", async (t) => {
  const client = await setup(t);
  const ops = [op(1, 0, 10), op(2, 0, 10), op(3, 0, 10)];
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      const failing = { execute: (arg) => (String(arg.sql ?? arg).includes("INTO applied_ops") && arg.args?.[1] === ops[2].op_id ? Promise.reject(new Error("boom")) : tx.execute(arg)) };
      await applyOps(failing, OWNER, ops, NOW);
    }),
    /boom/
  );
  assert.equal(Number((await client.execute("SELECT count(*) n FROM bookmarks")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM applied_ops")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT value FROM sync_counter")).rows[0].value), 0);
  const r = await withWriteTx(client, (tx) => readSince(tx, OWNER, 0));
  assert.equal(r.rows.length, 0);
});
