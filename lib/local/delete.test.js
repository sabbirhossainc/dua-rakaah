// Data deletion on the device (data-deletion spec): clearing, the runner's 410, and kept changes.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, getMeta, setMeta } from "./db.js";
import { listBookmarks, toggleBookmark } from "./bookmarks.js";
import { setMemorize } from "./memorize.js";
import { getPreferences, setPreference } from "./preferences.js";
import {
  completePendingSignOut,
  completeSignIn,
  currentAccount,
  deleteLocal,
  deleteMyData,
  isSignOutPending,
  signOutLocal,
} from "./account.js";
import { createSyncRunner } from "./sync.js";
import { testClient } from "../sync/test-helpers.js";
import { handleDelete, handleSync } from "../sync/handler.js";

function freshDb(t) {
  const db = createDb({ indexedDB: new IDBFactory(), IDBKeyRange });
  t.after(() => db.close());
  return db;
}

const kept = (account_owner) => ({
  op_id: randomUUID(), type: "bookmark", dua_id: 9, fields: { deleted: 0 }, client_ts: 1, account_owner, kept_at: Date.now(),
});

async function filled(t) {
  const db = freshDb(t);
  await completeSignIn(db, "google:X");
  await toggleBookmark(db, 1);
  await setMemorize(db, 2, { kind: "progress", value: 50 });
  await setPreference(db, "theme", "dark");
  await db.kept_ops.bulkAdd([kept("google:X"), kept("google:Y")]);
  await setMeta(db, "cursor", 12);
  await setMeta(db, "refresh_cursor", 12);
  return db;
}

async function assertCleared(db, oldAnon) {
  for (const table of ["bookmarks", "memorize", "preferences", "outbox"]) assert.equal(await db[table].count(), 0, table);
  assert.equal(await currentAccount(db), null);
  assert.equal(await getMeta(db, "cursor"), 0);
  assert.equal(await getMeta(db, "refresh_cursor"), 0);
  assert.notEqual(await getMeta(db, "anon_id"), oldAnon);
  assert.equal(await isSignOutPending(db), true);
  assert.deepEqual(await getPreferences(db), await getPreferences(freshDefaults));
}

let freshDefaults;
test.before(() => {
  freshDefaults = createDb({ indexedDB: new IDBFactory(), IDBKeyRange });
});
test.after(() => freshDefaults.close());

test("deleteLocal clears everything of the account, and kept changes of other accounts stay", async (t) => {
  const db = await filled(t);
  const anon = await getMeta(db, "anon_id", null);
  assert.equal(await deleteLocal(db), true);
  await assertCleared(db, anon);
  assert.deepEqual((await db.kept_ops.toArray()).map((o) => o.account_owner), ["google:Y"]);
});

test("a 410 clears the device and says so, and does not ask again", async (t) => {
  const db = await filled(t);
  const events = [];
  let calls = 0;
  const runner = createSyncRunner({
    db,
    fetchFn: async () => {
      calls++;
      return new Response(JSON.stringify({ error: "deleted" }), { status: 410 });
    },
    onEvent: (e) => events.push(e.type),
  });
  const result = await runner.sync();
  assert.equal(result.reason, "deleted");
  assert.equal(calls, 1);
  assert.deepEqual(events, ["deleted"]);
  await assertCleared(db, null);
  assert.equal(await db.kept_ops.count(), 1);
});

/** A stand-in for the browser's localStorage, holding a saved home place, for one test. */
function savedHome(t) {
  const map = new Map([["dua-home", '{"place":{"kind":"town","id":"sylhet"},"hijriOffset":1}'], ["dua-prefs", "{}"]]);
  const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: (k) => map.get(k) ?? null, removeItem: (k) => map.delete(k) },
  });
  t.after(() => {
    if (before) Object.defineProperty(globalThis, "localStorage", before);
    else delete globalThis.localStorage;
  });
  return map;
}

test("deleting removes the saved home place and nothing else from localStorage", async (t) => {
  const db = await filled(t);
  const map = savedHome(t);
  assert.equal(await deleteLocal(db), true);
  assert.deepEqual([...map.keys()], ["dua-prefs"]);
});

test("a 410 removes the saved home place too", async (t) => {
  const db = await filled(t);
  const map = savedHome(t);
  const runner = createSyncRunner({ db, fetchFn: async () => new Response("{}", { status: 410 }) });
  assert.equal((await runner.sync()).reason, "deleted");
  assert.equal(map.has("dua-home"), false);
});

test("the saved home place stays when the device was not cleared", async (t) => {
  const db = await filled(t);
  const map = savedHome(t);
  assert.equal(await deleteLocal(db, { ifEpoch: -1 }), false);
  assert.equal(map.has("dua-home"), true);
});

test("deleting works where there is no localStorage, or it is blocked", async (t) => {
  assert.equal(globalThis.localStorage, undefined);
  assert.equal(await deleteLocal(await filled(t)), true);
  savedHome(t);
  globalThis.localStorage.removeItem = () => {
    throw new Error("blocked");
  };
  assert.equal(await deleteLocal(await filled(t)), true);
});

test("a 410 for a request sent before the device was cleared keeps what was made since", async (t) => {
  const db = await filled(t);
  const events = [];
  let calls = 0;
  const runner = createSyncRunner({
    db,
    fetchFn: async () => {
      if (++calls === 1) {
        // Another tab clears the device, finishes signing out, and the reader makes a new bookmark.
        await deleteLocal(db);
        await completePendingSignOut(db, async () => {});
        await toggleBookmark(db, 7);
        return new Response("{}", { status: 410 });
      }
      return new Response(JSON.stringify({ owner_id: null, kind: null, cursor: 0, rows: [] }), { status: 503 });
    },
    onEvent: (e) => events.push(e.type),
  });
  await runner.sync();
  assert.deepEqual(events, []);
  assert.deepEqual((await listBookmarks(db)).map((r) => r.dua_id), [7]);
  assert.equal(await db.outbox.count(), 1);
});

/** A real server, and devices whose session the test sets. */
async function world(t) {
  const server = await testClient();
  t.after(server.cleanup);
  let clock = Date.now() - 100_000;
  return {
    client: server.client,
    time: () => ++clock,
    device() {
      const db = freshDb(t);
      let session = null;
      let cookie = "";
      const call = async (handler, url, init) => {
        const headers = { ...init.headers, ...(cookie ? { cookie } : {}) };
        const deps = { getClient: async () => server.client, getSession: async () => session, secret: "delete-device", now: () => ++clock };
        const res = await handler(new Request(`http://localhost:3100${url}`, { ...init, headers }), deps);
        const set = res.headers.get("set-cookie");
        if (set) cookie = set.split(";")[0];
        return res;
      };
      const runner = createSyncRunner({ db, fetchFn: (url, init) => call(handleSync, url, init) });
      return {
        db,
        runner,
        expire: () => (session = null),
        async signIn() {
          session = { accountId: "google:again", signedInAt: ++clock };
          await completeSignIn(db, session.accountId);
          await runner.sync();
        },
        remove: async () =>
          call(handleDelete, "/api/account/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scope: "account", anon_id: await getMeta(db, "anon_id") }),
          }),
      };
    },
  };
}

const onServer = async (w) =>
  (await w.client.execute("SELECT dua_id FROM bookmarks WHERE deleted = 0 ORDER BY dua_id")).rows.map((r) => Number(r.dua_id));

for (const again of [false, true]) {
  const how = again ? "even after being set aside a second time" : "and leave the queue";
  test(`changes kept from before a deletion are not stored at the next sign-in, ${how}`, async (t) => {
    const w = await world(t);
    const a = w.device();
    const b = w.device();
    await a.signIn();
    await b.signIn();
    await toggleBookmark(b.db, 5); // unsent: b is offline
    await signOutLocal(b.db, { keepUnsynced: true, now: w.time() });
    await completePendingSignOut(b.db, async () => {});
    assert.equal((await a.remove()).status, 200);
    await toggleBookmark(b.db, 6); // made as an anonymous device
    if (again) {
      // b signs in and goes offline before anything is sent, then signs out again.
      await completeSignIn(b.db, "google:again");
      await signOutLocal(b.db, { keepUnsynced: true, now: Date.now() + 1_000_000 });
      await completePendingSignOut(b.db, async () => {});
      await toggleBookmark(b.db, 6);
    }
    await b.signIn();
    assert.deepEqual(await onServer(w), [6]);
    assert.deepEqual((await listBookmarks(b.db)).map((r) => r.dua_id), [6]);
    assert.equal(await b.db.outbox.count(), 0);
    assert.equal(await b.db.kept_ops.count(), 0);
  });
}

test("deleteMyData asks for the account when signed in and for the anonymous owner otherwise", async (t) => {
  for (const signedIn of [true, false]) {
    const db = freshDb(t);
    if (signedIn) await completeSignIn(db, "google:X");
    await toggleBookmark(db, 1);
    const sent = [];
    const result = await deleteMyData(db, {
      fetchFn: async (url, init) => {
        sent.push([url, JSON.parse(init.body)]);
        return new Response("{}", { status: 200 });
      },
    });
    assert.equal(result, "deleted");
    assert.equal(sent[0][0], "/api/account/delete");
    assert.equal(sent[0][1].scope, signedIn ? "account" : "anon");
    assert.notEqual(await getMeta(db, "anon_id"), sent[0][1].anon_id);
    assert.equal(await db.bookmarks.count(), 0);
    assert.equal(await db.outbox.count(), 0);
  }
});

test("deleteMyData changes nothing unless the server confirms", async (t) => {
  const db = await filled(t);
  const dump = async () =>
    Promise.all(["meta", "bookmarks", "memorize", "preferences", "outbox", "kept_ops"].map((name) => db[name].toArray()));
  await setMeta(db, "anon_id", randomUUID());
  const before = await dump();
  const answers = [[401, "signin"], [403, "failed"], [410, "failed"], [503, "failed"]];
  for (const [status, expected] of answers) {
    assert.equal(await deleteMyData(db, { fetchFn: async () => new Response("{}", { status }) }), expected, String(status));
  }
  assert.equal(await deleteMyData(db, { fetchFn: async () => { throw new TypeError("offline"); } }), "failed");
  assert.deepEqual(await dump(), before);
});

test("checkDeleted sends no changes, clears the device on 410 only, and ignores other answers", async (t) => {
  for (const [status, cleared] of [[200, false], [401, false], [503, false], [410, true]]) {
    const db = await filled(t);
    const events = [];
    const bodies = [];
    const runner = createSyncRunner({
      db,
      fetchFn: async (url, init) => {
        bodies.push(JSON.parse(init.body));
        return new Response("{}", { status });
      },
      onEvent: (e) => events.push(e.type),
    });
    assert.equal(await runner.checkDeleted(), cleared, String(status));
    assert.deepEqual(bodies[0].ops, []);
    assert.equal((await db.bookmarks.count()) === 0, cleared);
    assert.deepEqual(events, cleared ? ["deleted"] : []);
  }
});

test("an ended session on a device of a deleted account is found out without storing anything", async (t) => {
  const w = await world(t);
  const a = w.device();
  const b = w.device();
  await toggleBookmark(b.db, 4); // anonymous first, so the server has an owner for b that sign-in merges
  await b.runner.sync();
  await a.signIn();
  await b.signIn();
  await toggleBookmark(b.db, 5); // unsent
  assert.equal((await a.remove()).status, 200);
  b.expire();
  assert.equal(await b.runner.checkDeleted(), true);
  assert.deepEqual(await onServer(w), []);
  assert.equal(await b.db.bookmarks.count(), 0);
  assert.equal(await b.db.kept_ops.count(), 0);
});
