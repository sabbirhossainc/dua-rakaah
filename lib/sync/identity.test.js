import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { SyncError, mergeAnonIntoAccount } from "./identity.js";
import { syncRequest } from "./service.js";
import { withWriteTx } from "./store.js";

const NOW = 1_800_000_000_000;
const op = (dua_id, deleted, client_ts) => ({
  op_id: randomUUID(),
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

/** A device: its anonymous id, the cookie the server gave it, and its cursor. */
function device() {
  return { anonId: randomUUID(), cookie: null, cursor: 0 };
}

async function sync(client, dev, ops = [], session = null) {
  const r = await syncRequest(
    client,
    { anonId: dev.anonId, cursor: dev.cursor, ops },
    { session, cookieOwnerId: dev.cookie, now: NOW }
  );
  if (r.set_cookie_owner_id) dev.cookie = r.set_cookie_owner_id;
  dev.cursor = r.cursor;
  return r;
}

const live = (rows) => rows.filter((r) => r.deleted === 0).map((r) => r.dua_id).sort((a, b) => a - b);
const ACCOUNT = { accountId: "google:12345" };

test("first sync with a change creates the owner and asks for the cookie", async (t) => {
  const client = await setup(t);
  const d = device();
  const r = await sync(client, d, [op(1, 0, 10)]);
  assert.equal(r.owner_id, d.anonId);
  assert.equal(r.kind, "anon");
  assert.equal(d.cookie, d.anonId);
  assert.deepEqual(live(r.rows), [1]);
});

test("an anonymous reader who never changes anything leaves no record", async (t) => {
  const client = await setup(t);
  const r = await sync(client, device(), []);
  assert.equal(r.owner_id, null);
  assert.equal(r.set_cookie_owner_id, null);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM owners")).rows[0].n), 0);
});

test("a later sync with the cookie works and returns the same owner", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10)]);
  const r = await sync(client, d, [op(2, 0, 20)]);
  assert.equal(r.owner_id, d.anonId);
  assert.deepEqual(live(r.rows), [2]);
});

test("a guessed identifier without the cookie is refused and stores nothing", async (t) => {
  const client = await setup(t);
  const victim = device();
  await sync(client, victim, [op(1, 0, 10)]);
  const attacker = { anonId: victim.anonId, cookie: null, cursor: 0 };
  await assert.rejects(sync(client, attacker, [op(99, 0, 30)]), (e) => e instanceof SyncError && e.status === 403);
  const rows = await client.execute("SELECT dua_id FROM bookmarks");
  assert.deepEqual(rows.rows.map((r) => Number(r.dua_id)), [1]);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM applied_ops")).rows[0].n), 1);
});

test("a request with a valid cookie uses the cookie's owner, not the body's id", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10)]);
  const r = await sync(client, { ...d, anonId: randomUUID(), cursor: 0 }, []);
  assert.equal(r.owner_id, d.anonId);
});

test("signing in creates an account owner that holds only the account id", async (t) => {
  const client = await setup(t);
  await sync(client, device(), [], ACCOUNT);
  const owners = await client.execute("SELECT * FROM owners");
  assert.equal(owners.rows.length, 1);
  assert.deepEqual(Object.keys(owners.rows[0]).filter((k) => isNaN(k)).sort(), ["created_at", "id", "kind", "merged_into", "user_id"]);
  assert.equal(owners.rows[0].user_id, "google:12345");
  assert.equal(owners.rows[0].kind, "account");
});

test("sign-in merges 3 anonymous bookmarks into an empty account", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10), op(2, 0, 11), op(3, 0, 12)]);
  const r = await sync(client, d, [], ACCOUNT);
  assert.equal(r.kind, "account");
  assert.notEqual(r.owner_id, d.anonId);
  assert.deepEqual(live(r.rows), [1, 2, 3]);
  const anon = await client.execute({ sql: "SELECT merged_into FROM owners WHERE id = ?", args: [d.anonId] });
  assert.equal(anon.rows[0].merged_into, r.owner_id);
});

test("existing account A B and device B C end as A B C, newest change winning on B", async (t) => {
  const client = await setup(t);
  const first = device();
  await sync(client, first, [op(1, 0, 10), op(2, 0, 100)], ACCOUNT); // A = 1, B = 2 (added at 100)
  const second = device();
  await sync(client, second, [op(2, 1, 200), op(3, 0, 50)]); // anonymous: B removed at 200, C = 3
  const r = await sync(client, second, [], ACCOUNT);
  assert.deepEqual(live(r.rows), [1, 3]); // B was removed later, so it stays removed
  // The first device already had 1 and 2, and now learns that 2 was removed and 3 was added.
  const other = await sync(client, first, [], ACCOUNT);
  assert.deepEqual(other.rows.map((row) => [row.dua_id, row.deleted]).sort((a, b) => a[0] - b[0]), [[2, 1], [3, 0]]);
});

test("a merge that fails part-way changes nothing", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10), op(2, 0, 11), op(3, 0, 12)]);
  const account = randomUUID();
  await client.execute({ sql: "INSERT INTO owners (id, kind, user_id, created_at) VALUES (?, 'account', 'google:1', 1)", args: [account] });
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      let writes = 0;
      const failing = {
        execute: (arg) => {
          if (String(arg.sql ?? arg).startsWith("INSERT INTO bookmarks") && ++writes === 2) return Promise.reject(new Error("boom"));
          return tx.execute(arg);
        },
      };
      await mergeAnonIntoAccount(failing, account, d.anonId);
    }),
    /boom/
  );
  const rows = await client.execute({ sql: "SELECT count(*) n FROM bookmarks WHERE owner_id = ?", args: [account] });
  assert.equal(Number(rows.rows[0].n), 0);
  const anon = await client.execute({ sql: "SELECT merged_into FROM owners WHERE id = ?", args: [d.anonId] });
  assert.equal(anon.rows[0].merged_into, null);
  // And trying again later works.
  const r = await sync(client, d, [], ACCOUNT);
  assert.deepEqual(live(r.rows), [1, 2, 3]);
});

test("merging twice is a no-op", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10), op(2, 0, 11)]);
  const r1 = await sync(client, d, [], ACCOUNT);
  const counter1 = (await client.execute("SELECT value FROM sync_counter")).rows[0].value;
  const accountOwner = r1.owner_id;
  await withWriteTx(client, (tx) => mergeAnonIntoAccount(tx, accountOwner, d.anonId));
  const counter2 = (await client.execute("SELECT value FROM sync_counter")).rows[0].value;
  assert.equal(counter2, counter1);
});

test("a second device of the same reader merges on its own", async (t) => {
  const client = await setup(t);
  const a = device();
  const b = device();
  await sync(client, a, [op(1, 0, 10)]);
  await sync(client, b, [op(2, 0, 20)]);
  await sync(client, a, [], ACCOUNT);
  const rb = await sync(client, b, [], ACCOUNT);
  assert.deepEqual(live(rb.rows), [1, 2]);
  const ra = await sync(client, a, [], ACCOUNT);
  assert.deepEqual(live(ra.rows), [2]); // a had 1 already and only needs what is new
});

test("a device signed in on another browser receives the account's bookmarks", async (t) => {
  const client = await setup(t);
  await sync(client, device(), [op(7, 0, 10)], ACCOUNT);
  const fresh = device();
  const r = await sync(client, fresh, [], ACCOUNT);
  assert.deepEqual(live(r.rows), [7]);
});

test("a device that has signed out gets nothing from the account", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10)]);
  await sync(client, d, [], ACCOUNT);
  await assert.rejects(sync(client, d, []), (e) => e instanceof SyncError && e.status === 401 && e.code === "signed_out");
  // A new anonymous id and no cookie (what sign-out gives the device) is a fresh, empty reader.
  const after = { anonId: randomUUID(), cookie: null, cursor: 0 };
  const r = await sync(client, after, []);
  assert.equal(r.owner_id, null);
  assert.deepEqual(r.rows, []);
});

test("an anonymous owner already merged into one account is not merged into another", async (t) => {
  const client = await setup(t);
  const d = device();
  await sync(client, d, [op(1, 0, 10)]);
  await sync(client, d, [], ACCOUNT);
  const y = await sync(client, { ...d, cursor: 0 }, [], { accountId: "google:other" });
  assert.deepEqual(y.rows, []);
});

test("the same changes sent again after sign-in are applied under the account too", async (t) => {
  const client = await setup(t);
  const d = device();
  const o = op(4, 0, 10);
  await sync(client, d, [o]);
  const lostCookie = { ...d, cookie: null, cursor: 0 }; // the cookie was lost, so no merge can be proven
  const r = await sync(client, lostCookie, [o], ACCOUNT);
  assert.deepEqual(live(r.rows), [4]);
});

// ---- memorize records at sign-in (user-identity spec) ----

const memOp = (dua_id, fields) => ({
  op_id: randomUUID(),
  type: "memorize",
  dua_id,
  fields: { learned: 0, progress: 0, reset_gen: 0, ...fields },
  client_ts: 1000,
});

/** Like `sync`, but asks for both record types. */
async function syncBoth(client, dev, ops = [], session = null) {
  const r = await syncRequest(
    client,
    { anonId: dev.anonId, cursor: dev.cursor, ops, types: ["bookmark", "memorize"] },
    { session, cookieOwnerId: dev.cookie, now: NOW }
  );
  if (r.set_cookie_owner_id) dev.cookie = r.set_cookie_owner_id;
  dev.cursor = r.cursor;
  return r;
}

const memState = (rows) =>
  Object.fromEntries(rows.filter((r) => r.type === "memorize").map((r) => [r.dua_id, [r.learned, r.progress, r.reset_gen]]));

test("sign-in merges memorize records by the furthest progress", async (t) => {
  const client = await setup(t);
  // The account already has X at 50 and Y learned (from another device, already signed in).
  const other = device();
  await syncBoth(client, other, [memOp(10, { progress: 50 }), memOp(20, { learned: 1, progress: 100 })], ACCOUNT);
  // This anonymous device has X at 75 and Y at 25.
  const d = device();
  await syncBoth(client, d, [memOp(10, { progress: 75 }), memOp(20, { progress: 25 })]);
  const r = await syncBoth(client, d, [], ACCOUNT);
  assert.deepEqual(memState(r.rows), { 10: [0, 75, 0], 20: [1, 100, 0] });
  const account = await syncBoth(client, { ...other, cursor: 0 }, [], ACCOUNT);
  assert.deepEqual(memState(account.rows), { 10: [0, 75, 0], 20: [1, 100, 0] });
});

test("sign-in merges memorize records and bookmarks together", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncBoth(client, d, [op(1, 0, 10), memOp(2, { progress: 25 })]);
  const r = await syncBoth(client, d, [], ACCOUNT);
  assert.deepEqual(live(r.rows.filter((row) => row.type === "bookmark")), [1]);
  assert.deepEqual(memState(r.rows), { 2: [0, 25, 0] });
});

test("a reset made while anonymous beats the account's older progress at sign-in", async (t) => {
  const client = await setup(t);
  const other = device();
  await syncBoth(client, other, [memOp(10, { learned: 1, progress: 100 })], ACCOUNT);
  const d = device();
  await syncBoth(client, d, [memOp(10, { progress: 25, reset_gen: 1 })]);
  const r = await syncBoth(client, d, [], ACCOUNT);
  assert.deepEqual(memState(r.rows), { 10: [0, 25, 1] });
});

test("merging memorize records twice is a no-op", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncBoth(client, d, [memOp(1, { progress: 50 }), memOp(2, { learned: 1, progress: 100 })]);
  const r1 = await syncBoth(client, d, [], ACCOUNT);
  const counter1 = (await client.execute("SELECT value FROM sync_counter")).rows[0].value;
  await withWriteTx(client, (tx) => mergeAnonIntoAccount(tx, r1.owner_id, d.anonId));
  const counter2 = (await client.execute("SELECT value FROM sync_counter")).rows[0].value;
  assert.equal(counter2, counter1);
});

test("a memorize merge that fails part-way changes nothing", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncBoth(client, d, [memOp(1, { progress: 25 }), memOp(2, { progress: 50 }), memOp(3, { progress: 75 })]);
  const account = randomUUID();
  await client.execute({ sql: "INSERT INTO owners (id, kind, user_id, created_at) VALUES (?, 'account', 'google:1', 1)", args: [account] });
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      let writes = 0;
      const failing = {
        execute: (arg) => {
          if (String(arg.sql ?? arg).startsWith("INSERT INTO memorize") && ++writes === 2) return Promise.reject(new Error("boom"));
          return tx.execute(arg);
        },
      };
      await mergeAnonIntoAccount(failing, account, d.anonId);
    }),
    /boom/
  );
  const rows = await client.execute({ sql: "SELECT count(*) n FROM memorize WHERE owner_id = ?", args: [account] });
  assert.equal(Number(rows.rows[0].n), 0);
  const anon = await client.execute({ sql: "SELECT merged_into FROM owners WHERE id = ?", args: [d.anonId] });
  assert.equal(anon.rows[0].merged_into, null);
  const r = await syncBoth(client, d, [], ACCOUNT);
  assert.deepEqual(memState(r.rows), { 1: [0, 25, 0], 2: [0, 50, 0], 3: [0, 75, 0] });
});

test("the sign-in merge covers memorize records even when the device asks for bookmarks only", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncBoth(client, d, [memOp(5, { progress: 50 })]);
  const old = await sync(client, d, [], ACCOUNT); // code that predates memorize: no types
  assert.deepEqual(old.rows.filter((row) => row.type === "memorize"), []);
  const full = await syncBoth(client, { ...d, cursor: 0 }, [], ACCOUNT);
  assert.deepEqual(memState(full.rows), { 5: [0, 50, 0] });
});

test("a signed-out device gets no memorize records from the account", async (t) => {
  const client = await setup(t);
  const a = device();
  await syncBoth(client, a, [memOp(5, { progress: 50 })], ACCOUNT);
  const fresh = device();
  const r = await syncBoth(client, fresh, [], null);
  assert.deepEqual(r.rows, []);
});

// ---- settings at sign-in (add-preferences 3.4; user-identity spec) ----

const ALL = ["bookmark", "memorize", "preference"];
const prefOp = (pref_key, value, client_ts, extra = {}) => ({
  op_id: randomUUID(),
  type: "preference",
  pref_key,
  fields: { value, if_absent: 0, ...extra },
  client_ts,
});

/** Like `sync`, but asks for every record type. */
async function syncAll(client, dev, ops = [], session = null) {
  const r = await syncRequest(
    client,
    { anonId: dev.anonId, cursor: dev.cursor, ops, types: ALL },
    { session, cookieOwnerId: dev.cookie, now: NOW }
  );
  if (r.set_cookie_owner_id) dev.cookie = r.set_cookie_owner_id;
  dev.cursor = r.cursor;
  return r;
}

const prefState = (rows) => Object.fromEntries(rows.filter((r) => r.type === "preference").map((r) => [r.pref_key, r.value]));
const counter = async (client) => Number((await client.execute("SELECT value FROM sync_counter")).rows[0].value);

/** What the account holds now, read by a signed-in device that starts from position 0. */
async function accountSettings(client) {
  return prefState((await syncAll(client, device(), [], ACCOUNT)).rows);
}

test("settings: the account already has a choice, so the account's value wins whatever the times", async (t) => {
  const client = await setup(t);
  const other = device();
  await syncAll(client, other, [prefOp("theme", "dark", 100)], ACCOUNT); // the account has dark, at an early time
  const d = device();
  await syncAll(client, d, [prefOp("theme", "light", 999_999)]); // this anonymous device chose light, later
  const r = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(prefState(r.rows), { theme: "dark" });
  assert.deepEqual(await accountSettings(client), { theme: "dark" });
});

test("settings: the account has no choice yet, so the device's value is used", async (t) => {
  const client = await setup(t);
  const other = device();
  await syncAll(client, other, [prefOp("theme", "dark", 100)], ACCOUNT); // the account has a theme but no text size
  const d = device();
  await syncAll(client, d, [prefOp("arabic_font", "large", 50), prefOp("theme", "light", 60)]);
  const r = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(prefState(r.rows), { theme: "dark", arabic_font: "large" });
  assert.deepEqual(await accountSettings(client), { theme: "dark", arabic_font: "large" });
});

test("settings: an empty account takes every setting of the device, including the reciter", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncAll(client, d, [prefOp("theme", "dark", 1), prefOp("arabic_font", "small", 2), prefOp("reciter_id", "7", 3)]);
  const r = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(prefState(r.rows), { theme: "dark", arabic_font: "small", reciter_id: "7" });
});

test("settings: a change made after signing in follows newest-wins", async (t) => {
  const client = await setup(t);
  const other = device();
  await syncAll(client, other, [prefOp("theme", "dark", 100)], ACCOUNT);
  const d = device();
  const first = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(prefState(first.rows), { theme: "dark" });
  const after = await syncAll(client, d, [prefOp("theme", "light", 200)], ACCOUNT);
  assert.deepEqual(prefState(after.rows), { theme: "light" });
  assert.deepEqual(await accountSettings(client), { theme: "light" });
});

test("settings: a second merge of the same anonymous owner is a no-op", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncAll(client, d, [prefOp("theme", "dark", 10), prefOp("arabic_font", "large", 11)]);
  const r1 = await syncAll(client, d, [], ACCOUNT);
  const before = await counter(client);
  await withWriteTx(client, (tx) => mergeAnonIntoAccount(tx, r1.owner_id, d.anonId));
  assert.equal(await counter(client), before);
  assert.deepEqual(await accountSettings(client), { theme: "dark", arabic_font: "large" });
});

test("settings: a merge that fails part-way changes nothing, and works when tried again", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncAll(client, d, [prefOp("theme", "dark", 10), prefOp("arabic_font", "large", 11), prefOp("reciter_id", "7", 12)]);
  const account = randomUUID();
  await client.execute({ sql: "INSERT INTO owners (id, kind, user_id, created_at) VALUES (?, 'account', 'google:1', 1)", args: [account] });
  await assert.rejects(
    withWriteTx(client, async (tx) => {
      let writes = 0;
      const failing = {
        execute: (arg) => {
          if (String(arg.sql ?? arg).startsWith("INSERT INTO preferences") && ++writes === 2) return Promise.reject(new Error("boom"));
          return tx.execute(arg);
        },
      };
      await mergeAnonIntoAccount(failing, account, d.anonId);
    }),
    /boom/
  );
  const rows = await client.execute({ sql: "SELECT count(*) n FROM preferences WHERE owner_id = ?", args: [account] });
  assert.equal(Number(rows.rows[0].n), 0);
  const anon = await client.execute({ sql: "SELECT merged_into FROM owners WHERE id = ?", args: [d.anonId] });
  assert.equal(anon.rows[0].merged_into, null);
  const r = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(prefState(r.rows), { theme: "dark", arabic_font: "large", reciter_id: "7" });
});

test("settings: the first of two anonymous devices to merge provides a setting the account lacks", async (t) => {
  const client = await setup(t);
  const a = device();
  const b = device();
  await syncAll(client, a, [prefOp("theme", "dark", 100)]);
  await syncAll(client, b, [prefOp("theme", "light", 900)]); // newer, but merges second
  const ra = await syncAll(client, a, [], ACCOUNT);
  assert.deepEqual(prefState(ra.rows), { theme: "dark" });
  const rb = await syncAll(client, b, [], ACCOUNT);
  assert.deepEqual(prefState(rb.rows), { theme: "dark" }); // device B now shows the account's value
  assert.deepEqual(await accountSettings(client), { theme: "dark" });
});

test("settings: the sign-in merge covers settings even when the device asks for bookmarks only", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncAll(client, d, [prefOp("theme", "dark", 10)]);
  const old = await sync(client, d, [], ACCOUNT); // code that predates settings: no types
  assert.deepEqual(old.rows.filter((row) => row.type === "preference"), []);
  const full = await syncAll(client, { ...d, cursor: 0 }, [], ACCOUNT);
  assert.deepEqual(prefState(full.rows), { theme: "dark" });
});

test("settings: the safety-net re-send after sign-in (no merge possible) keeps the account's value and fills a missing one", async (t) => {
  const client = await setup(t);
  const other = device();
  await syncAll(client, other, [prefOp("theme", "dark", 100)], ACCOUNT);
  const d = device();
  await syncAll(client, d, [prefOp("theme", "light", 999), prefOp("arabic_font", "xlarge", 5)]);
  const lostCookie = { ...d, cookie: null, cursor: 0 }; // the cookie was lost, so the server could not merge
  // What the browser queues at sign-in: one if_absent change per local setting.
  const r = await syncAll(client, lostCookie, [prefOp("theme", "light", 999, { if_absent: 1 }), prefOp("arabic_font", "xlarge", 5, { if_absent: 1 })], ACCOUNT);
  assert.deepEqual(prefState(r.rows), { theme: "dark", arabic_font: "xlarge" });
});

test("settings: a signed-out device gets no settings from the account", async (t) => {
  const client = await setup(t);
  await syncAll(client, device(), [prefOp("theme", "dark", 10)], ACCOUNT);
  const r = await syncAll(client, device(), [], null);
  assert.deepEqual(r.rows, []);
});

test("settings, bookmarks and memorize merge together at sign-in", async (t) => {
  const client = await setup(t);
  const d = device();
  await syncAll(client, d, [op(1, 0, 10), memOp(2, { progress: 25 }), prefOp("theme", "dark", 10)]);
  const r = await syncAll(client, d, [], ACCOUNT);
  assert.deepEqual(live(r.rows.filter((row) => row.type === "bookmark")), [1]);
  assert.deepEqual(memState(r.rows), { 2: [0, 25, 0] });
  assert.deepEqual(prefState(r.rows), { theme: "dark" });
});
