import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { PURGE_AFTER_DAYS, purgeOldRecords } from "./purge.js";
import { applySync } from "./store.js";
import { syncRequest } from "./service.js";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const ago = (days) => NOW - days * DAY;
const OWNER = randomUUID();

const bookmark = (dua_id, deleted, client_ts) => ({ op_id: randomUUID(), type: "bookmark", dua_id, fields: { deleted }, client_ts });

async function setup(t) {
  const h = await testClient();
  t.after(h.cleanup);
  /** Applies changes as if the server accepted them `days` ago. */
  const accept = (ops, days) => applySync(h.client, { ownerId: OWNER, ops, cursor: 0, now: ago(days) });
  const all = async (sql) => (await h.client.execute(sql)).rows;
  const duas = async () => (await all("SELECT dua_id FROM bookmarks ORDER BY dua_id")).map((r) => Number(r.dua_id));
  const marks = async () =>
    (await all("SELECT owner_id, seq, removed_before FROM purge_marks ORDER BY seq")).map((r) => ({ ...r }));
  return { client: h.client, accept, all, duas, marks };
}

test("only the removal accepted more than 180 days ago is deleted", async (t) => {
  const { client, accept, duas, marks, all } = await setup(t);
  const [old] = (await accept([bookmark(1, 1, ago(200))], 200)).rows;
  await accept([bookmark(2, 1, ago(10))], 10);
  assert.deepEqual(await purgeOldRecords(client, { now: NOW }), { bookmarks: 1, appliedOps: 1 });
  assert.deepEqual(await duas(), [2]);
  assert.equal((await all("SELECT * FROM applied_ops")).length, 1);
  assert.deepEqual(await marks(), [{ owner_id: OWNER, seq: old.server_seq, removed_before: ago(200) }]);
});

test("age is the server's time, not the device's: an old removal that arrived recently stays", async (t) => {
  const { client, accept, duas } = await setup(t);
  await accept([bookmark(1, 1, ago(400))], 5);
  assert.deepEqual(await purgeOldRecords(client, { now: NOW }), { bookmarks: 0, appliedOps: 0 });
  assert.deepEqual(await duas(), [1]);
});

test("a removal accepted exactly at the cutoff stays", async (t) => {
  const { client, accept, duas } = await setup(t);
  await accept([bookmark(1, 1, 1)], PURGE_AFTER_DAYS);
  await purgeOldRecords(client, { now: NOW });
  assert.deepEqual(await duas(), [1]);
});

test("bookmarks, memorize records and settings that were not removed all remain", async (t) => {
  const { client, accept, all } = await setup(t);
  await accept(
    [
      bookmark(1, 0, ago(300)),
      { op_id: randomUUID(), type: "memorize", dua_id: 2, fields: { learned: 0, progress: 0, reset_gen: 1 }, client_ts: ago(300) },
      { op_id: randomUUID(), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: ago(300) },
    ],
    300
  );
  assert.deepEqual(await purgeOldRecords(client, { now: NOW }), { bookmarks: 0, appliedOps: 3 });
  for (const table of ["bookmarks", "memorize", "preferences"]) assert.equal((await all(`SELECT * FROM ${table}`)).length, 1, table);
  assert.equal((await all("SELECT * FROM purge_marks")).length, 0);
});

test("a removal merged into an account keeps the age it had under the anonymous owner", async (t) => {
  const { client, duas, marks } = await setup(t);
  const anonId = randomUUID();
  const sync = (ops, session, cookieOwnerId, days) =>
    syncRequest(client, { anonId, cursor: 0, ops }, { session, cookieOwnerId, now: ago(days) });
  await sync([bookmark(1, 1, ago(200))], null, null, 200);
  await sync([bookmark(2, 1, ago(10))], null, anonId, 10);
  const account = await sync([], { accountId: "google:1" }, anonId, 1);
  const result = await purgeOldRecords(client, { now: NOW });
  // Dua 1 goes twice: the anonymous owner's row and the account's copy.
  assert.equal(result.bookmarks, 2);
  assert.deepEqual(await duas(), [2, 2]);
  assert.deepEqual((await marks()).map((m) => m.owner_id).sort(), [anonId, account.owner_id].sort());
});

test("marks are raised and never lowered, and a repeat run changes nothing", async (t) => {
  const { client, accept, marks } = await setup(t);
  await accept([bookmark(1, 1, ago(200))], 200);
  await purgeOldRecords(client, { now: NOW });
  const [first] = await marks();

  // A removal with an earlier device time is accepted and purged later: the position rises, the time does not fall.
  const [row] = (await accept([bookmark(2, 1, ago(500))], 190)).rows.filter((r) => r.dua_id === 2);
  await purgeOldRecords(client, { now: NOW });
  const second = await marks();
  assert.deepEqual(second, [{ owner_id: OWNER, seq: row.server_seq, removed_before: first.removed_before }]);

  assert.deepEqual(await purgeOldRecords(client, { now: NOW }), { bookmarks: 0, appliedOps: 0 });
  assert.deepEqual(await marks(), second);

  // A mark higher than anything left to purge is kept.
  await client.execute("UPDATE purge_marks SET seq = 1000000, removed_before = 9000000000000");
  await accept([bookmark(3, 1, ago(200))], 200);
  await purgeOldRecords(client, { now: NOW });
  assert.deepEqual(await marks(), [{ owner_id: OWNER, seq: 1000000, removed_before: 9000000000000 }]);
});

test("a dry run reports the counts and changes nothing", async (t) => {
  const { client, accept, duas, marks, all } = await setup(t);
  await accept([bookmark(1, 1, ago(200)), bookmark(2, 0, ago(200))], 200);
  assert.deepEqual(await purgeOldRecords(client, { now: NOW, dryRun: true }), { bookmarks: 1, appliedOps: 2 });
  assert.deepEqual(await duas(), [1, 2]);
  assert.equal((await all("SELECT * FROM applied_ops")).length, 2);
  assert.deepEqual(await marks(), []);
});
