import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { applyOps, applySync, readSince, withWriteTx } from "./store.js";
import { syncRequest } from "./service.js";

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

// ---- memorize ----

const memOp = (dua_id, fields, op_id = randomUUID()) => ({
  op_id,
  type: "memorize",
  dua_id,
  fields: { learned: 0, progress: 0, reset_gen: 0, ...fields },
  client_ts: 1000,
});
const BOTH = ["bookmark", "memorize"];
const memRows = (r) => r.rows.filter((row) => row.type === "memorize");

test("memorize: a first change is stored and comes back with its type and position", async (t) => {
  const client = await setup(t);
  const r = await applySync(client, { ownerId: OWNER, ops: [memOp(5, { progress: 50 })], cursor: 0, now: NOW, types: BOTH });
  assert.deepEqual(memRows(r).map(({ server_seq, ...row }) => row), [
    { type: "memorize", dua_id: 5, learned: 0, progress: 50, reset_gen: 0 },
  ]);
  assert.equal(r.cursor, memRows(r)[0].server_seq);
});

test("memorize: the same change twice leaves one row with the same position", async (t) => {
  const client = await setup(t);
  const o = memOp(5, { progress: 50 });
  const first = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: BOTH });
  const second = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW + 1, types: BOTH });
  assert.deepEqual(second, first);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM memorize")).rows[0].n), 1);
});

test("memorize: a different change that adds nothing does not move the position", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [memOp(5, { progress: 75 })], cursor: 0, now: NOW, types: BOTH });
  const b = await applySync(client, { ownerId: OWNER, ops: [memOp(5, { progress: 25 })], cursor: a.cursor, now: NOW, types: BOTH });
  assert.equal(b.rows.length, 0);
  assert.equal(b.cursor, a.cursor);
});

test("memorize: progress adds up, a reset replaces it, and an older generation arriving late changes nothing", async (t) => {
  const client = await setup(t);
  const sync = (ops) => applySync(client, { ownerId: OWNER, ops, cursor: 0, now: NOW, types: BOTH }).then((r) => memRows(r)[0]);
  assert.equal((await sync([memOp(5, { progress: 50 })])).progress, 50);
  assert.equal((await sync([memOp(5, { learned: 1, progress: 100 })])).learned, 1);
  const reset = await sync([memOp(5, { progress: 25, reset_gen: 1 })]);
  assert.deepEqual([reset.learned, reset.progress, reset.reset_gen], [0, 25, 1]);
  const late = await sync([memOp(5, { learned: 1, progress: 100, reset_gen: 0 })]);
  assert.deepEqual([late.learned, late.progress, late.reset_gen], [0, 25, 1]);
});

test("types: memorize only, bookmarks only, both in position order, and none given means bookmarks", async (t) => {
  const client = await setup(t);
  const ops = [op(1, 0, 10), memOp(2, { progress: 25 }), op(3, 0, 10), memOp(4, { progress: 75 })];
  await applySync(client, { ownerId: OWNER, ops, cursor: 0, now: NOW, types: BOTH });
  const ask = (types) => applySync(client, { ownerId: OWNER, ops: [], cursor: 0, now: NOW, types });
  assert.deepEqual((await ask(["memorize"])).rows.map((r) => r.type), ["memorize", "memorize"]);
  assert.deepEqual((await ask(["bookmark"])).rows.map((r) => r.type), ["bookmark", "bookmark"]);
  const both = await ask(BOTH);
  assert.deepEqual(both.rows.map((r) => [r.type, r.dua_id]), [["bookmark", 1], ["memorize", 2], ["bookmark", 3], ["memorize", 4]]);
  assert.deepEqual(both.rows.map((r) => r.server_seq), [...both.rows.map((r) => r.server_seq)].sort((a, b) => a - b));
  assert.deepEqual((await ask(undefined)).rows.map((r) => r.type), ["bookmark", "bookmark"]);
  assert.deepEqual((await ask(["nope"])).rows, []);
});

test("memorize: a pull returns only rows after the cursor", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [memOp(1, { progress: 25 }), op(2, 0, 10)], cursor: 0, now: NOW, types: BOTH });
  const b = await applySync(client, { ownerId: OWNER, ops: [memOp(3, { progress: 50 })], cursor: a.cursor, now: NOW, types: BOTH });
  assert.deepEqual(b.rows.map((r) => [r.type, r.dua_id]), [["memorize", 3]]);
});

test("memorize and bookmark positions strictly increase across 50 concurrent mixed requests", async (t) => {
  const client = await setup(t);
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      applySync(client, {
        ownerId: randomUUID(),
        ops: [i % 2 === 0 ? op(1 + (i % 7), 0, 1000 + i) : memOp(1 + (i % 7), { progress: 25 })],
        cursor: 0,
        now: NOW,
        types: BOTH,
      })
    )
  );
  const seqs = results.map((r) => r.rows[0].server_seq).sort((a, b) => a - b);
  assert.equal(new Set(seqs).size, 50);
  assert.deepEqual(seqs, Array.from({ length: 50 }, (_, i) => i + 1));
});

test("memorize: a failure on the last change leaves no memorize row and no applied-change record", async (t) => {
  const client = await setup(t);
  const ops = [memOp(1, { progress: 25 }), memOp(2, { progress: 25 }), memOp(3, { progress: 25 })];
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      const failing = { execute: (arg) => (String(arg.sql ?? arg).includes("INTO applied_ops") && arg.args?.[1] === ops[2].op_id ? Promise.reject(new Error("boom")) : tx.execute(arg)) };
      await applyOps(failing, OWNER, ops, NOW);
    }),
    /boom/
  );
  assert.equal(Number((await client.execute("SELECT count(*) n FROM memorize")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM applied_ops")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT value FROM sync_counter")).rows[0].value), 0);
});

// ---- settings (add-preferences 3.4) ----

const prefOp = (pref_key, value, client_ts, extra = {}, op_id = randomUUID()) => ({
  op_id,
  type: "preference",
  pref_key,
  fields: { value, if_absent: 0, ...extra },
  client_ts,
});
const ALL = ["bookmark", "memorize", "preference"];
const prefRows = (r) => r.rows.filter((row) => row.type === "preference");
const prefCount = async (client) => Number((await client.execute("SELECT count(*) n FROM preferences")).rows[0].n);
const counterValue = async (client) => Number((await client.execute("SELECT value FROM sync_counter")).rows[0].value);

test("settings: a first change is stored and comes back with its type, name and position", async (t) => {
  const client = await setup(t);
  const o = prefOp("theme", "dark", 1000);
  const r = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(r).map(({ server_seq, ...row }) => row), [
    { type: "preference", pref_key: "theme", value: "dark", updated_at: 1000, op_id: o.op_id },
  ]);
  assert.equal(r.cursor, prefRows(r)[0].server_seq);
});

test("settings: the same change applied twice leaves one row with the same position", async (t) => {
  const client = await setup(t);
  const o = prefOp("theme", "dark", 1000);
  const first = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: ALL });
  const second = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW + 1, types: ALL });
  assert.deepEqual(second, first);
  assert.equal(await prefCount(client), 1);
  assert.equal(await counterValue(client), 1);
});

test("settings: an older change after a newer one changes nothing, and the position does not move", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 2000)], cursor: 0, now: NOW, types: ALL });
  const b = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 1000)], cursor: a.cursor, now: NOW, types: ALL });
  assert.equal(b.rows.length, 0);
  assert.equal(b.cursor, a.cursor);
  const all = await applySync(client, { ownerId: OWNER, ops: [], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(all).map((row) => [row.value, row.updated_at]), [["light", 2000]]);
});

test("settings: a newer change replaces the value in place, and equal times go to the greater op id", async (t) => {
  const client = await setup(t);
  await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 1000)], cursor: 0, now: NOW, types: ALL });
  const newer = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 2000)], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(newer).map((row) => row.value), ["dark"]);
  assert.equal(await prefCount(client), 1);
  const low = prefOp("arabic_font", "small", 500, {}, `00000000-0000-4000-8000-${"1".padStart(12, "0")}`);
  const high = prefOp("arabic_font", "large", 500, {}, `00000000-0000-4000-8000-${"2".padStart(12, "0")}`);
  for (const order of [[low, high], [high, low]]) {
    const c = await setup(t);
    const r = await applySync(c, { ownerId: OWNER, ops: order, cursor: 0, now: NOW, types: ALL });
    assert.deepEqual(prefRows(r).map((row) => row.value), ["large"]);
  }
});

test("settings: choosing the default is stored and beats an older non-default value", async (t) => {
  const client = await setup(t);
  await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 1000)], cursor: 0, now: NOW, types: ALL });
  const r = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 2000)], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(r).map((row) => row.value), ["light"]);
});

test("settings: a time far in the future is stored as the server's time", async (t) => {
  const client = await setup(t);
  const r = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", NOW + 10 * 24 * 60 * 60 * 1000)], cursor: 0, now: NOW, types: ALL });
  assert.equal(prefRows(r)[0].updated_at, NOW);
});

test("settings: an if_absent change is stored when there is no value, and ignored (no new position) when there is one", async (t) => {
  const client = await setup(t);
  const filled = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 100, { if_absent: 1 })], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(filled).map((row) => row.value), ["dark"]);
  // A newer if_absent change for a name that now has a value changes nothing.
  const ignored = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 999_999, { if_absent: 1 })], cursor: filled.cursor, now: NOW, types: ALL });
  assert.equal(ignored.rows.length, 0);
  assert.equal(ignored.cursor, filled.cursor);
  assert.equal(await counterValue(client), 1);
  assert.equal(await prefCount(client), 1);
  // An ordinary newer change still wins afterwards.
  const ordinary = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 999_999)], cursor: filled.cursor, now: NOW, types: ALL });
  assert.deepEqual(prefRows(ordinary).map((row) => row.value), ["light"]);
});

test("settings: an if_absent change is remembered as applied, so sending it again after the value changes does nothing", async (t) => {
  const client = await setup(t);
  const o = prefOp("theme", "dark", 100, { if_absent: 1 });
  await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: ALL });
  await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "light", 200)], cursor: 0, now: NOW, types: ALL });
  const again = await applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(again).map((row) => row.value), ["light"]);
});

test("types: a pull that names preference returns it in position order with the other kinds, and one that does not, does not", async (t) => {
  const client = await setup(t);
  const ops = [op(1, 0, 10), prefOp("theme", "dark", 10), memOp(2, { progress: 25 }), prefOp("arabic_font", "large", 10)];
  await applySync(client, { ownerId: OWNER, ops, cursor: 0, now: NOW, types: ALL });
  const ask = (types) => applySync(client, { ownerId: OWNER, ops: [], cursor: 0, now: NOW, types });
  const all = await ask(ALL);
  assert.deepEqual(all.rows.map((r) => [r.type, r.dua_id ?? r.pref_key]), [
    ["bookmark", 1],
    ["preference", "theme"],
    ["memorize", 2],
    ["preference", "arabic_font"],
  ]);
  assert.deepEqual(all.rows.map((r) => r.server_seq), [...all.rows.map((r) => r.server_seq)].sort((a, b) => a - b));
  assert.deepEqual((await ask(["preference"])).rows.map((r) => r.pref_key), ["theme", "arabic_font"]);
  assert.deepEqual((await ask(BOTH)).rows.map((r) => r.type), ["bookmark", "memorize"]);
  assert.deepEqual((await ask(undefined)).rows.map((r) => r.type), ["bookmark"]);
});

test("settings: a pull returns only rows after the cursor", async (t) => {
  const client = await setup(t);
  const a = await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 10)], cursor: 0, now: NOW, types: ALL });
  const b = await applySync(client, { ownerId: OWNER, ops: [prefOp("arabic_font", "xlarge", 10)], cursor: a.cursor, now: NOW, types: ALL });
  assert.deepEqual(b.rows.map((r) => [r.type, r.pref_key]), [["preference", "arabic_font"]]);
});

test("settings, bookmarks and memorize: positions strictly increase across 50 concurrent mixed requests", async (t) => {
  const client = await setup(t);
  const make = (i) => [op(1 + (i % 7), 0, 1000 + i), memOp(1 + (i % 7), { progress: 25 }), prefOp(["theme", "arabic_font", "reciter_id"][i % 3], ["dark", "large", "7"][i % 3], 1000 + i)][i % 3];
  const results = await Promise.all(
    Array.from({ length: 50 }, (_, i) => applySync(client, { ownerId: randomUUID(), ops: [make(i)], cursor: 0, now: NOW, types: ALL }))
  );
  const seqs = results.map((r) => r.rows[0].server_seq).sort((a, b) => a - b);
  assert.equal(new Set(seqs).size, 50);
  assert.deepEqual(seqs, Array.from({ length: 50 }, (_, i) => i + 1));
});

test("settings: the same owner changing one setting from 20 concurrent requests ends with the newest one", async (t) => {
  const client = await setup(t);
  const ops = Array.from({ length: 20 }, (_, i) => prefOp("theme", i % 2 === 0 ? "dark" : "light", 1000 + i));
  await Promise.all(ops.map((o) => applySync(client, { ownerId: OWNER, ops: [o], cursor: 0, now: NOW, types: ALL })));
  const r = await applySync(client, { ownerId: OWNER, ops: [], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(prefRows(r).map((row) => [row.value, row.updated_at]), [["light", 1019]]);
  assert.equal(await prefCount(client), 1);
});

test("settings: a failure on the last change leaves no setting row and no applied-change record", async (t) => {
  const client = await setup(t);
  const ops = [prefOp("theme", "dark", 10), prefOp("arabic_font", "large", 10), prefOp("reciter_id", "7", 10)];
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      const failing = { execute: (arg) => (String(arg.sql ?? arg).includes("INTO applied_ops") && arg.args?.[1] === ops[2].op_id ? Promise.reject(new Error("boom")) : tx.execute(arg)) };
      await applyOps(failing, OWNER, ops, NOW);
    }),
    /boom/
  );
  assert.equal(await prefCount(client), 0);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM applied_ops")).rows[0].n), 0);
  assert.equal(await counterValue(client), 0);
});

test("settings: owners do not see each other's settings", async (t) => {
  const client = await setup(t);
  await applySync(client, { ownerId: OWNER, ops: [prefOp("theme", "dark", 10)], cursor: 0, now: NOW, types: ALL });
  const other = await applySync(client, { ownerId: randomUUID(), ops: [], cursor: 0, now: NOW, types: ALL });
  assert.deepEqual(other.rows, []);
});

// ---- after a purge (design D3, D4) ----

/** Dua 1 stays live; a removal of dua 2, made at time 5000, has been purged and left the mark. */
async function purged(t) {
  const client = await setup(t);
  const run = (body) =>
    syncRequest(client, { anonId: OWNER, cursor: 0, ops: [], ...body }, { session: null, cookieOwnerId: body.first ? null : OWNER, now: NOW });
  await run({ first: true, ops: [op(1, 0, 1000)] });
  const removal = await run({ ops: [op(2, 1, 5000)] });
  const seq = removal.cursor;
  await client.execute("DELETE FROM bookmarks WHERE dua_id = 2");
  await client.execute({ sql: "INSERT INTO purge_marks (owner_id, seq, removed_before) VALUES (?, ?, 5000)", args: [OWNER, seq] });
  const duas = async () =>
    (await client.execute("SELECT dua_id FROM bookmarks ORDER BY dua_id")).rows.map((r) => Number(r.dua_id));
  return { client, run, seq, duas };
}

test("purge: a stale device gets everything, the mark's time, and a cursor at or past the mark", async (t) => {
  const { run, seq } = await purged(t);
  const r = await run({ cursor: seq - 1, since: seq - 1 });
  assert.equal(r.full, true);
  assert.equal(r.removed_before, 5000);
  assert.deepEqual(r.rows.map((row) => row.dua_id), [1]);
  assert.equal(r.cursor, seq, "the only row is before the mark, so the mark is the cursor");
});

test("purge: an up-to-date device and a request with no since get only what is new", async (t) => {
  const { run, seq, duas } = await purged(t);
  for (const body of [{ cursor: seq, since: seq }, { cursor: seq }]) {
    const r = await run(body);
    assert.equal("full" in r, false);
    assert.deepEqual(r.rows, []);
    assert.equal(r.cursor, seq);
  }
  // Neither is filtered: an old change from them is merged as before.
  await run({ cursor: seq, since: seq, ops: [op(3, 0, 10)] });
  await run({ cursor: seq, ops: [op(4, 0, 10)] });
  assert.deepEqual(await duas(), [1, 3, 4]);
});

test("purge: from a stale device an old change for a missing record is acknowledged but not stored", async (t) => {
  const { client, run, duas } = await purged(t);
  const old = op(2, 0, 5000);
  const r = await run({ since: 0, ops: [old, op(3, 0, 4000)] });
  assert.equal(r.full, true);
  assert.deepEqual(await duas(), [1]);
  const seen = await client.execute({ sql: "SELECT 1 FROM applied_ops WHERE op_id = ?", args: [old.op_id] });
  assert.equal(seen.rows.length, 1);
});

test("purge: from a stale device a newer change, a change to a stored record and other kinds are merged", async (t) => {
  const { client, run, duas } = await purged(t);
  const memorize = { op_id: randomUUID(), type: "memorize", dua_id: 7, fields: { learned: 0, progress: 25, reset_gen: 0 }, client_ts: 10 };
  const r = await run({ since: 0, types: ["bookmark", "memorize"], ops: [op(2, 0, 5001), op(1, 1, 2000), memorize] });
  assert.deepEqual(await duas(), [1, 2]);
  assert.equal(Number((await client.execute("SELECT deleted FROM bookmarks WHERE dua_id = 1")).rows[0].deleted), 1);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM memorize")).rows[0].n), 1);
  assert.equal(r.cursor, Math.max(...r.rows.map((row) => row.server_seq)));
});

test("purge: a request that does not ask for bookmarks is not refreshed", async (t) => {
  const { run, seq } = await purged(t);
  const r = await run({ cursor: seq, since: 0, types: ["memorize"] });
  assert.equal("full" in r, false);
});
