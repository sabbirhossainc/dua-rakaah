import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, getMeta, setMeta } from "./db.js";
import { listBookmarks, toggleBookmark } from "./bookmarks.js";
import {
  KEPT_DAYS,
  completePendingSignOut,
  completeSignIn,
  isSignOutPending,
  purgeExpiredKept,
  signOutLocal,
  unsyncedCount,
} from "./account.js";
import { createSyncRunner } from "./sync.js";

const DAY = 24 * 60 * 60 * 1000;

function freshDb(t) {
  const db = createDb({ indexedDB: new IDBFactory(), IDBKeyRange });
  t.after(() => db.close());
  return db;
}

async function signedInDevice(t, account = "google:X") {
  const db = freshDb(t);
  await completeSignIn(db, account);
  return db;
}

const answer = (over = {}) =>
  new Response(JSON.stringify({ owner_id: "o", kind: "anon", cursor: 0, rows: [], ...over }), { status: 200 });

test("signing in starts a new epoch, resets the cursor and queues every local bookmark once", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1, { now: 1000 });
  await toggleBookmark(db, 2, { now: 2000 });
  await db.outbox.filter((o) => o.dua_id === 1).delete(); // pretend 1 was confirmed, 2 is still waiting
  await setMeta(db, "cursor", 40);
  assert.equal(await completeSignIn(db, "google:X"), true);
  assert.equal(await getMeta(db, "account"), "google:X");
  assert.equal(await getMeta(db, "cursor"), 0);
  assert.equal(await getMeta(db, "epoch"), 1);
  const ops = await db.outbox.toArray();
  assert.deepEqual(ops.map((o) => o.dua_id).sort(), [1, 2]); // 2 is not queued twice
  assert.equal(await completeSignIn(db, "google:X"), false); // already signed in as this account: nothing changes
  assert.equal(await getMeta(db, "epoch"), 1);
});

test("online sign-out clears the account's data and starts a new anonymous identity", async (t) => {
  const db = await signedInDevice(t);
  await toggleBookmark(db, 1);
  await db.outbox.clear(); // everything was sent
  const oldAnon = await getMeta(db, "anon_id");
  const result = await signOutLocal(db, { keepUnsynced: false });
  assert.equal(result.kept, 0);
  assert.deepEqual(await listBookmarks(db), []);
  assert.equal(await db.outbox.count(), 0);
  assert.equal(await db.kept_ops.count(), 0);
  assert.equal(await getMeta(db, "account"), null);
  assert.notEqual(await getMeta(db, "anon_id"), oldAnon);
  assert.equal(await isSignOutPending(db), true);
});

test("offline sign-out keeps exactly the unsent changes, hidden from the next person", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  for (const id of [1, 2, 3]) await toggleBookmark(db, id, { now: 1000 + id });
  assert.equal(await unsyncedCount(db), 3);
  const result = await signOutLocal(db, { keepUnsynced: true, now: 5000 });
  assert.equal(result.kept, 3);
  assert.deepEqual(await listBookmarks(db), []); // the next person sees no bookmarks
  assert.equal(await db.outbox.count(), 0); // and nothing of the account is queued to send
  const kept = await db.kept_ops.toArray();
  assert.equal(kept.length, 3);
  assert.ok(kept.every((k) => k.account_owner === "google:X" && k.kept_at === 5000));
});

test("kept changes are never sent by the next anonymous person's syncs", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await toggleBookmark(db, 1);
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await toggleBookmark(db, 9); // the next person bookmarks something
  const bodies = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (bodies.push(JSON.parse(init.body)), answer()) });
  await runner.sync();
  assert.deepEqual(bodies.flatMap((b) => b.ops.map((o) => o.dua_id)), [9]);
});

test("the same account signing in again sends its kept changes and no longer holds them", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  for (const id of [1, 2, 3]) await toggleBookmark(db, id);
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:X");
  assert.equal(await db.kept_ops.count(), 0);
  assert.deepEqual((await db.outbox.toArray()).map((o) => o.dua_id).sort(), [1, 2, 3]);
  const sent = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (sent.push(...JSON.parse(init.body).ops), answer()) });
  await runner.sync();
  assert.deepEqual(sent.map((o) => o.dua_id).sort(), [1, 2, 3]);
  assert.equal(await db.outbox.count(), 0);
});

test("a different account signing in never receives the kept changes, and they stay kept", async (t) => {
  const db = await signedInDevice(t, "google:X");
  await db.outbox.clear();
  await toggleBookmark(db, 1);
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:Y");
  assert.equal(await db.outbox.count(), 0);
  assert.equal(await db.kept_ops.count(), 1);
});

test("kept changes older than 30 days are deleted, newer ones stay", async (t) => {
  const db = await signedInDevice(t);
  const now = 100 * DAY;
  const row = (n, kept_at) => ({ op_id: randomUUID(), type: "bookmark", dua_id: n, fields: { deleted: 0 }, client_ts: 1, account_owner: "google:X", kept_at });
  await db.kept_ops.bulkAdd([row(1, now - 31 * DAY), row(2, now - KEPT_DAYS * DAY + 1000), row(3, now)]);
  assert.equal(await purgeExpiredKept(db, now), 1);
  assert.deepEqual((await db.kept_ops.toArray()).map((o) => o.dua_id).sort(), [2, 3]);
});

test("the sync runner deletes expired kept changes before each sync", async (t) => {
  const db = await signedInDevice(t);
  const now = 100 * DAY;
  await db.kept_ops.add({ op_id: randomUUID(), type: "bookmark", dua_id: 1, fields: { deleted: 0 }, client_ts: 1, account_owner: "google:X", kept_at: now - 31 * DAY });
  const runner = createSyncRunner({ db, now: () => now, fetchFn: async () => answer() });
  await runner.sync();
  assert.equal(await db.kept_ops.count(), 0);
});

test("syncing is paused until the server-side sign-out has finished", async (t) => {
  const db = await signedInDevice(t);
  await signOutLocal(db, { keepUnsynced: false });
  await toggleBookmark(db, 5);
  let calls = 0;
  const runner = createSyncRunner({ db, fetchFn: async () => (calls++, answer()) });
  assert.equal((await runner.sync()).reason, "signing_out");
  assert.equal(calls, 0);
  // Offline: the remote sign-out fails and the pause stays.
  assert.equal(await completePendingSignOut(db, async () => { throw new Error("offline"); }), false);
  assert.equal((await runner.sync()).reason, "signing_out");
  // Back online: it succeeds, and syncing resumes.
  assert.equal(await completePendingSignOut(db, async () => {}), true);
  await runner.sync();
  assert.equal(calls, 1);
});

test("with nothing pending, completing a sign-out does nothing", async (t) => {
  const db = freshDb(t);
  let called = false;
  assert.equal(await completePendingSignOut(db, async () => { called = true; }), true);
  assert.equal(called, false);
});

test("an answer to a request sent before sign-in does not change the signed-in device", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1);
  const fetchFn = async () => {
    await completeSignIn(db, "google:X"); // the reader signs in while the request is away
    return answer({ owner_id: "anon-owner", cursor: 77, rows: [{ type: "bookmark", dua_id: 8, deleted: 0, updated_at: 1, op_id: randomUUID(), server_seq: 77 }] });
  };
  let n = 0;
  const wrapped = async (...args) => (++n === 1 ? fetchFn(...args) : answer({ cursor: 3 }));
  await createSyncRunner({ db, fetchFn: wrapped }).sync();
  assert.equal(await db.bookmarks.get(8), undefined);
  assert.equal(await getMeta(db, "cursor"), 3);
});
