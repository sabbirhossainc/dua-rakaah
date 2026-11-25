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
