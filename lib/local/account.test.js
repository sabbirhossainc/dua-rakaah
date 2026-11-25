import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, getMeta, setMeta } from "./db.js";
import { listBookmarks, toggleBookmark } from "./bookmarks.js";
import { setMemorize } from "./memorize.js";
import { getPreferences, setPreference } from "./preferences.js";
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
import { testClient } from "../sync/test-helpers.js";
import { handleSync } from "../sync/handler.js";

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

// ---- memorize with sign-in and sign-out (design D6, D8) ----

const memAction = (value) => ({ kind: "progress", value });

test("signing in re-sends every local memorize record with new op ids, once", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 1, memAction(25));
  await setMemorize(db, 2, memAction(75));
  await setMemorize(db, 2, memAction(25)); // a reset: generation 1
  await db.outbox.clear(); // everything was confirmed
  await completeSignIn(db, "google:X");
  const ops = (await db.outbox.toArray()).filter((o) => o.type === "memorize");
  assert.deepEqual(ops.map((o) => [o.dua_id, o.fields]).sort((a, b) => a[0] - b[0]), [
    [1, { learned: 0, progress: 25, reset_gen: 0 }],
    [2, { learned: 0, progress: 25, reset_gen: 1 }],
  ]);
  assert.equal(new Set(ops.map((o) => o.op_id)).size, 2);
  assert.equal(await completeSignIn(db, "google:X"), false);
  assert.equal(await db.outbox.count(), 2); // signing in again as the same account queues nothing more
});

test("offline sign-out keeps unsent memorize changes, clears the memorize table, and hides them from the next person", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await setMemorize(db, 1, memAction(25));
  await setMemorize(db, 2, { kind: "learned", value: true });
  await toggleBookmark(db, 3);
  assert.equal(await unsyncedCount(db), 3);
  const result = await signOutLocal(db, { keepUnsynced: true, now: 5000 });
  assert.equal(result.kept, 3);
  assert.equal(await db.memorize.count(), 0);
  assert.equal(await db.outbox.count(), 0);
  const kept = await db.kept_ops.toArray();
  assert.deepEqual(kept.map((k) => k.type).sort(), ["bookmark", "memorize", "memorize"]);
  assert.ok(kept.every((k) => k.account_owner === "google:X"));
  // The next person's sync sends only what they do themselves.
  await completePendingSignOut(db, async () => {});
  await setMemorize(db, 9, memAction(50));
  const sent = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (sent.push(...JSON.parse(init.body).ops), answer()) });
  await runner.sync();
  assert.deepEqual(sent.map((o) => [o.type, o.dua_id]), [["memorize", 9]]);
});

test("online sign-out clears memorize records with the rest", async (t) => {
  const db = await signedInDevice(t);
  await setMemorize(db, 1, memAction(25));
  await db.outbox.clear();
  const result = await signOutLocal(db, { keepUnsynced: false });
  assert.equal(result.kept, 0);
  assert.equal(await db.memorize.count(), 0);
  assert.equal(await db.kept_ops.count(), 0);
});

test("the same account signing in again sends its kept memorize changes and no longer holds them", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await setMemorize(db, 1, memAction(25));
  await setMemorize(db, 2, memAction(50));
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:X");
  assert.equal(await db.kept_ops.count(), 0);
  const sent = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (sent.push(...JSON.parse(init.body).ops), answer()) });
  await runner.sync();
  assert.deepEqual(sent.filter((o) => o.type === "memorize").map((o) => [o.dua_id, o.fields.progress]).sort(), [[1, 25], [2, 50]]);
  assert.equal(await db.outbox.count(), 0);
});

test("a different account never receives kept memorize changes, and they stay kept", async (t) => {
  const db = await signedInDevice(t, "google:X");
  await db.outbox.clear();
  await setMemorize(db, 1, memAction(25));
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:Y");
  assert.equal(await db.outbox.count(), 0);
  assert.equal(await db.kept_ops.count(), 1);
});

test("kept memorize changes older than 30 days are deleted, newer ones stay", async (t) => {
  const db = await signedInDevice(t);
  const now = 100 * DAY;
  const row = (n, kept_at) => ({
    op_id: randomUUID(),
    type: "memorize",
    dua_id: n,
    fields: { learned: 0, progress: 25, reset_gen: 0 },
    client_ts: 1,
    account_owner: "google:X",
    kept_at,
  });
  await db.kept_ops.bulkAdd([row(1, now - 31 * DAY), row(2, now - KEPT_DAYS * DAY + 1000)]);
  assert.equal(await purgeExpiredKept(db, now), 1);
  assert.deepEqual((await db.kept_ops.toArray()).map((o) => o.dua_id), [2]);
});

// ---- settings at sign-in and sign-out (add-preferences 4.2; design D3) ----

const settingOps = async (db) => (await db.outbox.toArray()).filter((o) => o.type === "preference");
const byName = (ops) => Object.fromEntries(ops.map((o) => [o.pref_key, o]));

test("settings: signing in replaces queued setting changes by one if_absent change per record, and leaves the others alone", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  await setPreference(db, "theme", "light", { now: 2000 }); // two queued changes for one setting
  await setPreference(db, "arabic_font", "large", { now: 3000 });
  await toggleBookmark(db, 4, { now: 4000 });
  await setMemorize(db, 5, memAction(50));
  const before = await db.outbox.toArray();
  const queuedBookmark = before.find((o) => o.type === "bookmark");
  const queuedMemorize = before.find((o) => o.type === "memorize");
  assert.equal((await settingOps(db)).length, 3);

  assert.equal(await completeSignIn(db, "google:X"), true);

  const settings = await settingOps(db);
  assert.equal(settings.length, 2, "one per local record, not one per queued change");
  assert.deepEqual(
    Object.fromEntries(Object.entries(byName(settings)).map(([name, o]) => [name, o.fields])),
    { theme: { value: "light", if_absent: 1 }, arabic_font: { value: "large", if_absent: 1 } }
  );
  assert.ok(settings.every((o) => !before.some((b) => b.op_id === o.op_id)), "new op ids");
  assert.equal(new Set(settings.map((o) => o.op_id)).size, 2);
  const after = await db.outbox.toArray();
  assert.ok(after.some((o) => o.op_id === queuedBookmark.op_id), "the queued bookmark change is kept as it was");
  assert.ok(after.some((o) => o.op_id === queuedMemorize.op_id), "the queued memorize change is kept as it was");
  // The local records themselves are untouched until the pull.
  assert.equal((await db.preferences.get("theme")).value, "light");
});

test("settings: signing in with a record and nothing queued still queues an if_absent change", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  await db.outbox.clear(); // confirmed earlier (anonymous owner)
  await completeSignIn(db, "google:X");
  assert.deepEqual((await settingOps(db)).map((o) => [o.pref_key, o.fields]), [["theme", { value: "dark", if_absent: 1 }]]);
  assert.equal(await completeSignIn(db, "google:X"), false);
  assert.equal((await settingOps(db)).length, 1, "signing in again as the same account queues nothing more");
});

test("settings: signing in with no settings queues none", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 4);
  await completeSignIn(db, "google:X");
  assert.deepEqual(await settingOps(db), []);
});

test("settings: offline sign-out keeps unsent setting changes, clears the table, and hides them from the next person", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await setPreference(db, "theme", "dark", { now: 1000 });
  await setPreference(db, "arabic_font", "xlarge", { now: 1100 });
  await toggleBookmark(db, 3);
  const result = await signOutLocal(db, { keepUnsynced: true, now: 5000 });
  assert.equal(result.kept, 3);
  assert.equal(await db.preferences.count(), 0);
  assert.equal(await db.outbox.count(), 0);
  const kept = await db.kept_ops.toArray();
  assert.deepEqual(kept.filter((k) => k.type === "preference").map((k) => [k.pref_key, k.fields.value]).sort(), [["arabic_font", "xlarge"], ["theme", "dark"]]);
  assert.ok(kept.every((k) => k.account_owner === "google:X" && k.kept_at === 5000));
  assert.ok(kept.filter((k) => k.type === "preference").every((k) => k.dua_id === undefined), "kept with pref_key, not dua_id");
  // The next person's sync sends only what they do themselves.
  await completePendingSignOut(db, async () => {});
  await setPreference(db, "theme", "light"); // no record: nothing to send for the default
  await setPreference(db, "reciter_id", "9", { now: 6000 });
  const sent = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (sent.push(...JSON.parse(init.body).ops), answer()) });
  await runner.sync();
  assert.deepEqual(sent.map((o) => [o.type, o.pref_key]), [["preference", "reciter_id"]]);
});

test("settings: the same account signing in again sends its kept setting changes as ordinary changes", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await setPreference(db, "theme", "dark", { now: 1000 });
  await setPreference(db, "arabic_font", "large", { now: 1100 });
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:X");
  assert.equal(await db.kept_ops.count(), 0);
  const queued = await settingOps(db);
  assert.deepEqual(
    queued.map((o) => [o.pref_key, o.fields]).sort((x, y) => (x[0] < y[0] ? -1 : 1)),
    [
      ["arabic_font", { value: "large", if_absent: 0 }],
      ["theme", { value: "dark", if_absent: 0 }],
    ]
  );
  const sent = [];
  const runner = createSyncRunner({ db, fetchFn: async (url, init) => (sent.push(...JSON.parse(init.body).ops), answer()) });
  await runner.sync();
  assert.deepEqual(sent.map((o) => o.pref_key).sort(), ["arabic_font", "theme"]);
  assert.equal(await db.outbox.count(), 0);
});

test("settings: a different account never receives kept setting changes, and they stay kept", async (t) => {
  const db = await signedInDevice(t, "google:X");
  await db.outbox.clear();
  await setPreference(db, "theme", "dark", { now: 1000 });
  await signOutLocal(db, { keepUnsynced: true });
  await completePendingSignOut(db, async () => {});
  await completeSignIn(db, "google:Y");
  assert.deepEqual(await settingOps(db), []);
  assert.equal((await db.kept_ops.toArray()).filter((k) => k.type === "preference").length, 1);
});

test("settings: online sign-out clears the settings with the rest, so the device reads the defaults", async (t) => {
  const db = await signedInDevice(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  await setPreference(db, "arabic_font", "large", { now: 1100 });
  await db.outbox.clear();
  const result = await signOutLocal(db, { keepUnsynced: false });
  assert.equal(result.kept, 0);
  assert.equal(await db.preferences.count(), 0);
  assert.equal(await db.kept_ops.count(), 0);
  assert.deepEqual(await getPreferences(db), { theme: "light", arabic_font: "medium", reciter_id: null });
});

test("settings: kept setting changes older than 30 days are deleted, newer ones stay", async (t) => {
  const db = await signedInDevice(t);
  await db.outbox.clear();
  await setPreference(db, "theme", "dark", { now: 1000 });
  await signOutLocal(db, { keepUnsynced: true, now: 1_000_000 });
  assert.equal(await purgeExpiredKept(db, 1_000_000 + (KEPT_DAYS - 1) * DAY), 0);
  assert.equal(await purgeExpiredKept(db, 1_000_000 + (KEPT_DAYS + 1) * DAY), 1);
});

/** A device and a runner that talks to the real handler, signed in as one account. */
async function handlerDevice(t, h, accountId = "google:pref-acct") {
  const deps = { getClient: async () => h.client, getSession: async () => ({ accountId }), secret: "account-settings-test" };
  const db = freshDb(t);
  const fetchFn = (url, init) => handleSync(new Request(`http://localhost:3100${url}`, { ...init, headers: { ...init.headers } }), deps);
  return { db, runner: createSyncRunner({ db, fetchFn }) };
}

test("settings: the account's value wins at sign-in, whatever the times, and the device then shows it", async (t) => {
  const h = await testClient();
  t.after(h.cleanup);
  const other = await handlerDevice(t, h);
  await setPreference(other.db, "theme", "dark", { now: 500 });
  await setPreference(other.db, "theme", "light", { now: 1000 }); // the account's choice: light, early (a real record, not the default)
  await other.runner.sync();
  assert.equal((await h.client.execute("SELECT value FROM preferences WHERE pref_key = 'theme'")).rows[0].value, "light");

  const device = await handlerDevice(t, h); // an anonymous device that chose dark much later, offline, never sent
  await setPreference(device.db, "theme", "dark", { now: 999_999 });
  await setPreference(device.db, "arabic_font", "large", { now: 999_999 }); // the account has no text size yet
  await completeSignIn(device.db, "google:pref-acct");
  await device.runner.sync();

  assert.deepEqual(await getPreferences(device.db), { theme: "light", arabic_font: "large", reciter_id: null });
  await other.runner.sync();
  assert.deepEqual(await getPreferences(other.db), { theme: "light", arabic_font: "large", reciter_id: null });
});

test("settings: a change made after signing in follows newest-wins", async (t) => {
  const h = await testClient();
  t.after(h.cleanup);
  const other = await handlerDevice(t, h);
  await setPreference(other.db, "theme", "dark", { now: 1000 });
  await other.runner.sync();
  const device = await handlerDevice(t, h);
  await completeSignIn(device.db, "google:pref-acct");
  await device.runner.sync();
  assert.equal((await getPreferences(device.db)).theme, "dark");
  await setPreference(device.db, "theme", "light", { now: 2000 });
  await device.runner.sync();
  await other.runner.sync();
  assert.equal((await getPreferences(other.db)).theme, "light");
});

test("settings: an offline-signed-out device that signs in again keeps the account's own earlier choice", async (t) => {
  const h = await testClient();
  t.after(h.cleanup);
  const device = await handlerDevice(t, h);
  await completeSignIn(device.db, "google:pref-acct");
  await device.runner.sync();
  await setPreference(device.db, "arabic_font", "xlarge", { now: 1000 }); // unsent: the device is offline
  await signOutLocal(device.db, { keepUnsynced: true, now: 2000 });
  await completePendingSignOut(device.db, async () => {});
  await setPreference(device.db, "arabic_font", "small", { now: 3000 }); // the next person, anonymous
  await completeSignIn(device.db, "google:pref-acct");
  await device.runner.sync();
  // The kept choice is the account's own, sent as an ordinary change; the anonymous choice only fills a gap.
  assert.equal((await getPreferences(device.db)).arabic_font, "xlarge");
});

test("settings: with more queued changes than one request holds, the account's value still wins on the device", async (t) => {
  const db = freshDb(t);
  const bookmarks = Array.from({ length: 250 }, (_, i) => ({ dua_id: i + 1, deleted: 0, updated_at: 10 + i, op_id: randomUUID() }));
  await db.bookmarks.bulkPut(bookmarks);
  await db.preferences.put({ pref_key: "theme", value: "dark", updated_at: 999_999, op_id: randomUUID() }); // this device's own, later choice
  await completeSignIn(db, "google:X"); // 250 bookmark changes and the if_absent setting change: two requests
  assert.equal(await db.outbox.count(), 251);
  let calls = 0;
  const sent = [];
  const fetchFn = async (url, init) => {
    const body = JSON.parse(init.body);
    sent.push(body.ops.length);
    // The account already has "light"; the first answer carries that row, later ones do not (it is already behind the cursor).
    const rows = ++calls === 1 ? [{ type: "preference", pref_key: "theme", value: "light", updated_at: 100, op_id: randomUUID(), server_seq: 7 }] : [];
    return answer({ cursor: 7, rows });
  };
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(sent, [200, 51]);
  assert.equal(await db.outbox.count(), 0);
  assert.equal((await db.preferences.get("theme")).value, "light");
});
