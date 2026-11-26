// Data deletion through the real handlers (data-deletion spec, server requirements).
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { handleDelete, handleSync } from "./handler.js";
import { ANON_COOKIE, signOwnerId } from "./cookie.js";

const SECRET = "delete-test-secret";
const ORIGIN = "http://localhost:3100";
const ACCOUNT = "google:1234567890";
const TABLES = ["owners", "bookmarks", "memorize", "preferences", "applied_ops", "purge_marks"];

const cookieOf = (id) => `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(id, SECRET))}`;
const ops = () => [
  { op_id: randomUUID(), type: "bookmark", dua_id: 1, fields: { deleted: 0 }, client_ts: 1000 },
  { op_id: randomUUID(), type: "memorize", dua_id: 2, fields: { learned: 0, progress: 50, reset_gen: 0 }, client_ts: 1000 },
  { op_id: randomUUID(), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: 1000 },
];

async function world(t) {
  const h = await testClient();
  t.after(h.cleanup);
  let clock = 1_800_000_000_000;
  const request = (path, body, headers) =>
    new Request(ORIGIN + path, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
  const deps = (session) => ({ getClient: async () => h.client, getSession: async () => session, secret: SECRET, now: () => ++clock });

  const w = {
    client: h.client,
    time: () => clock,
    session: (accountId = ACCOUNT) => ({ accountId, signedInAt: ++clock }),
    async sync({ anon, session = null, cookie, changes = [] }) {
      const res = await handleSync(
        request("/api/sync", { anon_id: anon, cursor: 0, ops: changes }, cookie ? { cookie: cookieOf(cookie) } : {}),
        deps(session)
      );
      return { status: res.status, body: await res.json() };
    },
    async remove({ scope, anon, session = null, cookie, headers = {}, dependencies = {} }) {
      const res = await handleDelete(
        request("/api/account/delete", { scope, anon_id: anon }, { ...(cookie ? { cookie: cookieOf(cookie) } : {}), ...headers }),
        { ...deps(session), ...dependencies }
      );
      return { status: res.status, setCookie: res.headers.get("set-cookie"), cache: res.headers.get("cache-control") };
    },
    /** Every row of the reader's tables, as text, to compare before and after. */
    async dump() {
      const out = [];
      for (const table of TABLES) {
        for (const row of (await h.client.execute(`SELECT * FROM ${table}`)).rows) out.push(`${table} ${JSON.stringify(row)}`);
      }
      return out.sort();
    },
    /** An anonymous device with synced records. */
    async anonDevice() {
      const anon = randomUUID();
      assert.equal((await w.sync({ anon, changes: ops() })).status, 200);
      return anon;
    },
    /** An account with records, into which two anonymous devices were merged. */
    async account(accountId = ACCOUNT) {
      const first = await w.anonDevice();
      const second = await w.anonDevice();
      const session = w.session(accountId);
      await w.sync({ anon: first, cookie: first, session, changes: ops() });
      await w.sync({ anon: second, cookie: second, session });
      return { session, first, second };
    },
  };
  return w;
}

test("account: nothing is left of the account or the devices merged into it, and others are unchanged", async (t) => {
  const w = await world(t);
  await w.anonDevice();
  await w.account("google:other");
  const others = await w.dump();
  const { session, first } = await w.account();
  await w.client.execute("INSERT INTO purge_marks (owner_id, seq, removed_before) SELECT id, 1, 1 FROM owners WHERE user_id = 'google:1234567890'");

  const res = await w.remove({ scope: "account", anon: first, session });
  assert.equal(res.status, 200);
  assert.match(res.setCookie, new RegExp(`^${ANON_COOKIE}=;.*Max-Age=0`));
  assert.equal(res.cache, "no-store");
  assert.deepEqual(await w.dump(), others);
  assert.equal((await w.client.execute("SELECT * FROM deleted_owners")).rows.length, 3);
  assert.equal((await w.client.execute("SELECT * FROM deleted_accounts")).rows.length, 1);
});

test("account: this device's unmerged anonymous owner goes too, but only with its cookie", async (t) => {
  const w = await world(t);
  const mine = await w.anonDevice();
  const theirs = await w.anonDevice();
  await w.remove({ scope: "account", anon: theirs, cookie: mine, session: w.session() });
  assert.equal((await w.client.execute("SELECT * FROM owners")).rows.length, 2);
  await w.remove({ scope: "account", anon: mine, cookie: mine, session: w.session("google:second") });
  assert.deepEqual((await w.client.execute("SELECT id FROM owners")).rows.map((r) => r.id), [theirs]);
});

test("the markers hold no personal data", async (t) => {
  const w = await world(t);
  const { session, first } = await w.account();
  await w.remove({ scope: "account", anon: first, session });
  const everything = [...(await w.dump())];
  for (const table of ["deleted_accounts", "deleted_owners"]) {
    everything.push(JSON.stringify((await w.client.execute(`SELECT * FROM ${table}`)).rows));
  }
  assert.doesNotMatch(everything.join("\n"), /1234567890|google/);
});

test("anonymous: everything of that owner goes and other readers are unchanged, and a retry succeeds", async (t) => {
  const w = await world(t);
  await w.account();
  await w.anonDevice();
  const others = await w.dump();
  const anon = await w.anonDevice();
  assert.equal((await w.remove({ scope: "anon", anon, cookie: anon })).status, 200);
  assert.deepEqual(await w.dump(), others);
  // The answer was lost: the device asks again, with or without the cookie.
  assert.equal((await w.remove({ scope: "anon", anon, cookie: anon })).status, 200);
  assert.equal((await w.remove({ scope: "anon", anon })).status, 200);
});

test("anonymous: a device that never synced succeeds", async (t) => {
  const w = await world(t);
  assert.equal((await w.remove({ scope: "anon", anon: randomUUID() })).status, 200);
});

test("refusals delete nothing: no cookie, another cookie, a merged owner, no session, another site, a bad body", async (t) => {
  const w = await world(t);
  const { first } = await w.account();
  const anon = await w.anonDevice();
  const other = await w.anonDevice();
  const before = await w.dump();
  const cases = [
    [403, { scope: "anon", anon }],
    [403, { scope: "anon", anon, cookie: other }],
    [401, { scope: "anon", anon: first, cookie: first }],
    [401, { scope: "account", anon, cookie: anon }],
    [403, { scope: "anon", anon, cookie: anon, headers: { origin: "https://evil.example" } }],
    [403, { scope: "account", anon, session: { accountId: ACCOUNT, signedInAt: 9e12 }, headers: { origin: "https://evil.example" } }],
    [400, { scope: "everything", anon, cookie: anon }],
    [400, { scope: "anon", anon: "nope" }],
    [413, { scope: "anon", anon: "x".repeat(70_000) }],
    [503, { scope: "account", anon, dependencies: { getSession: async () => { throw new Error("broken"); } } }],
    [503, { scope: "anon", anon, cookie: anon, dependencies: { secret: undefined } }],
  ];
  for (const [status, input] of cases) {
    const res = await w.remove(input);
    assert.equal(res.status, status, JSON.stringify(input).slice(0, 200));
    assert.equal(res.setCookie, null);
  }
  assert.deepEqual(await w.dump(), before);
});

test("a deletion that fails part-way deletes nothing and leaves no marker", async (t) => {
  const w = await world(t);
  const { session, first } = await w.account();
  const before = await w.dump();
  await w.client.execute("CREATE TRIGGER stop BEFORE DELETE ON preferences BEGIN SELECT RAISE(ABORT, 'stop'); END");
  assert.equal((await w.remove({ scope: "account", anon: first, session })).status, 503);
  assert.deepEqual(await w.dump(), before);
  assert.equal((await w.client.execute("SELECT * FROM deleted_owners")).rows.length, 0);
  assert.equal((await w.client.execute("SELECT * FROM deleted_accounts")).rows.length, 0);
});

test("account: a retry succeeds and a session older than the deletion cannot delete a newer account", async (t) => {
  const w = await world(t);
  const { session, first } = await w.account();
  assert.equal((await w.remove({ scope: "account", anon: first, session })).status, 200);
  assert.equal((await w.remove({ scope: "account", anon: first, session })).status, 200);
  const newer = w.session();
  await w.sync({ anon: randomUUID(), session: newer, changes: ops() });
  const before = await w.dump();
  assert.equal((await w.remove({ scope: "account", anon: first, session })).status, 200);
  assert.deepEqual(await w.dump(), before);
  // The newer session can delete it, and that moves the marker forward.
  assert.equal((await w.remove({ scope: "account", anon: first, session: newer })).status, 200);
  assert.deepEqual(await w.dump(), []);
  assert.equal((await w.sync({ anon: randomUUID(), session: newer })).status, 410);
});

test("a second signed-in device is answered 410 and stores nothing, also with a session from before times were kept", async (t) => {
  const w = await world(t);
  const { session, first, second } = await w.account();
  await w.remove({ scope: "account", anon: first, session });
  for (const old of [session, { accountId: ACCOUNT }]) {
    const r = await w.sync({ anon: second, cookie: second, session: old, changes: ops() });
    assert.deepEqual(r, { status: 410, body: { error: "deleted" } });
  }
  assert.deepEqual(await w.dump(), []);
});

test("an expired session on a merged device, and a deleted anonymous device, are answered 410 and store nothing", async (t) => {
  const w = await world(t);
  const { session, first, second } = await w.account();
  await w.remove({ scope: "account", anon: first, session });
  const anon = await w.anonDevice();
  await w.remove({ scope: "anon", anon, cookie: anon });
  for (const input of [
    { anon: second, cookie: second, changes: ops() },
    { anon: second, changes: ops() }, // the cookie is gone
    { anon: randomUUID(), cookie: second, changes: ops() }, // the cookie names a deleted owner
    { anon, cookie: anon, changes: ops() },
    { anon, changes: [] },
  ]) {
    assert.equal((await w.sync(input)).status, 410);
  }
  assert.deepEqual(await w.dump(), []);
});

test("signing in again starts a new account: the deleted device cookie is not merged", async (t) => {
  const w = await world(t);
  const { session, first } = await w.account();
  await w.remove({ scope: "account", anon: first, session });
  const r = await w.sync({ anon: first, cookie: first, session: w.session() });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.rows, []);
  assert.equal((await w.client.execute("SELECT * FROM owners")).rows.length, 1);
});

test("kept changes from before the deletion are not stored in the new account, later and ordinary ones are", async (t) => {
  const w = await world(t);
  const { session, first } = await w.account();
  const keptBefore = w.time();
  await w.remove({ scope: "account", anon: first, session });
  const deletedAt = w.time();
  const change = (dua_id, kept_at) => ({
    op_id: randomUUID(), type: "bookmark", dua_id, fields: { deleted: 0 }, client_ts: 1000,
    ...(kept_at === undefined ? {} : { kept_at }),
  });
  const changes = [change(1, keptBefore), change(2, deletedAt), change(3, deletedAt + 1), change(4)];
  const anon = randomUUID();
  const r = await w.sync({ anon, session: w.session(), changes });
  assert.equal(r.status, 200);
  assert.deepEqual((await w.client.execute("SELECT dua_id FROM bookmarks ORDER BY dua_id")).rows.map((x) => Number(x.dua_id)), [3, 4]);
  // Remembered as applied, so the device drops them from its queue and sending them again changes nothing.
  assert.equal((await w.client.execute("SELECT * FROM applied_ops")).rows.length, 4);
});

test("a kept change of an account that was never deleted is stored", async (t) => {
  const w = await world(t);
  const changes = [{ ...ops()[0], kept_at: 5 }];
  await w.sync({ anon: randomUUID(), session: w.session(), changes });
  assert.equal((await w.client.execute("SELECT * FROM bookmarks")).rows.length, 1);
});

test("a kept_at that is not a time is refused", async (t) => {
  const w = await world(t);
  for (const kept_at of [-1, "5", null]) {
    assert.equal((await w.sync({ anon: randomUUID(), changes: [{ ...ops()[0], kept_at }] })).status, 400);
  }
});
