import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import Dexie from "dexie";
import { createDb } from "./db.js";
import { toggleBookmark } from "./bookmarks.js";
import { setMemorize } from "./memorize.js";
import { getPreferences, setPreference } from "./preferences.js";
import { validateOp } from "../sync/records.js";

function freshDb(t, factory = new IDBFactory()) {
  const db = createDb({ indexedDB: factory, IDBKeyRange });
  t.after(() => db.close());
  return db;
}

const outboxOf = async (db) => (await db.outbox.toArray()).filter((o) => o.type === "preference");

test("a first choice writes the record and queues one change together", async (t) => {
  const db = freshDb(t);
  const id = randomUUID();
  const record = await setPreference(db, "theme", "dark", { now: 1000, newId: () => id });
  assert.deepEqual(record, { pref_key: "theme", value: "dark", updated_at: 1000, op_id: id });
  assert.deepEqual(await db.preferences.toArray(), [record]);
  const queued = await outboxOf(db);
  assert.equal(queued.length, 1);
  assert.deepEqual(
    { op_id: queued[0].op_id, type: queued[0].type, pref_key: queued[0].pref_key, fields: queued[0].fields, client_ts: queued[0].client_ts },
    { op_id: id, type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: 1000 }
  );
  assert.equal(validateOp(queued[0]).ok, true);
});

test("choosing the value it already has changes nothing and queues nothing", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  const again = await setPreference(db, "theme", "dark", { now: 2000 });
  assert.equal(again.updated_at, 1000);
  assert.equal(await db.preferences.count(), 1);
  assert.equal((await outboxOf(db)).length, 1);
});

test("choosing the default with no record changes nothing and queues nothing", async (t) => {
  const db = freshDb(t);
  assert.equal(await setPreference(db, "theme", "light", { now: 1000 }), null);
  assert.equal(await setPreference(db, "arabic_font", "medium", { now: 1000 }), null);
  assert.equal(await db.preferences.count(), 0);
  assert.equal(await db.outbox.count(), 0);
});

test("choosing the default with a record is a change that goes to the other devices", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  const back = await setPreference(db, "theme", "light", { now: 2000 });
  assert.equal(back.value, "light");
  assert.equal((await db.preferences.get("theme")).value, "light");
  const queued = await outboxOf(db);
  assert.deepEqual(queued.map((o) => o.fields.value), ["dark", "light"]);
  assert.ok(queued[1].client_ts > queued[0].client_ts);
});

test("a clock behind the stored record still gives the new choice a newer time", async (t) => {
  const db = freshDb(t);
  await db.preferences.put({ pref_key: "theme", value: "dark", updated_at: 9_000_000, op_id: randomUUID() }); // pulled from a device with a faster clock
  const record = await setPreference(db, "theme", "light", { now: 1000 });
  assert.equal(record.updated_at, 9_000_001);
  assert.equal((await outboxOf(db))[0].client_ts, 9_000_001);
});

test("a bad name or value is refused with nothing written", async (t) => {
  const db = freshDb(t);
  for (const [name, value] of [["theme", "blue"], ["language", "bn"], ["arabic_font", "huge"], ["reciter_id", "0"], ["theme", 1], ["theme", null], ["__proto__", "dark"]]) {
    await assert.rejects(setPreference(db, name, value, { now: 1000 }), /not a valid value/, `${name}=${value}`);
  }
  assert.equal(await db.preferences.count(), 0);
  assert.equal(await db.outbox.count(), 0);
});

test("a failure while queuing the change leaves no record behind", async (t) => {
  const db = freshDb(t);
  await db.open();
  await db.outbox.add({ op_id: "taken", type: "bookmark", dua_id: 1, fields: { deleted: 0 }, client_ts: 1 });
  // A new id equal to one already queued makes the outbox refuse the change (op_id is unique).
  await assert.rejects(setPreference(db, "theme", "dark", { now: 1000, newId: () => "taken" }));
  assert.equal(await db.preferences.count(), 0);
  assert.equal(await db.outbox.count(), 1);
});

test("the reciter is stored like the others", async (t) => {
  const db = freshDb(t);
  const record = await setPreference(db, "reciter_id", "7", { now: 1000 });
  assert.equal(record.value, "7");
  assert.equal((await getPreferences(db)).reciter_id, "7");
  assert.equal(validateOp((await outboxOf(db))[0]).ok, true);
});

test("getPreferences gives defaults for what was never chosen, and ignores a stored value that is not valid", async (t) => {
  const db = freshDb(t);
  assert.deepEqual(await getPreferences(db), { theme: "light", arabic_font: "medium", reciter_id: null });
  await setPreference(db, "theme", "dark", { now: 1 });
  await setPreference(db, "arabic_font", "xlarge", { now: 2 });
  assert.deepEqual(await getPreferences(db), { theme: "dark", arabic_font: "xlarge", reciter_id: null });
  await db.preferences.put({ pref_key: "arabic_font", value: "enormous", updated_at: 5, op_id: randomUUID() });
  await db.preferences.put({ pref_key: "unknown", value: "x", updated_at: 5, op_id: randomUUID() });
  assert.deepEqual(await getPreferences(db), { theme: "dark", arabic_font: "medium", reciter_id: null });
});

test("a version 2 database with bookmarks and memorize opens at version 3 with both intact", async (t) => {
  const factory = new IDBFactory();
  const v2 = new Dexie("dua-user", { indexedDB: factory, IDBKeyRange });
  v2.version(1).stores({
    bookmarks: "dua_id, updated_at",
    outbox: "++seq, &op_id",
    meta: "name",
    kept_ops: "++seq, &op_id, account_owner, kept_at",
  });
  v2.version(2).stores({ memorize: "dua_id, progress" });
  await v2.open();
  await v2.table("bookmarks").put({ dua_id: 7, deleted: 0, updated_at: 5, op_id: randomUUID() });
  await v2.table("memorize").put({ dua_id: 7, learned: 0, progress: 50, reset_gen: 0 });
  await v2.table("meta").put({ name: "cursor", value: 12 });
  v2.close();

  const db = freshDb(t, factory);
  await db.open();
  assert.equal(db.verno, 3);
  assert.equal((await db.bookmarks.get(7)).dua_id, 7);
  assert.equal((await db.memorize.get(7)).progress, 50);
  assert.equal((await db.meta.get("cursor")).value, 12);
  assert.equal(await db.preferences.count(), 0);
  await setPreference(db, "theme", "dark");
  await toggleBookmark(db, 8);
  await setMemorize(db, 8, { kind: "progress", value: 25 });
  assert.equal(await db.preferences.count(), 1);
});

test("code that declares only version 2 still opens a version 3 database", async (t) => {
  const factory = new IDBFactory();
  const db3 = freshDb(t, factory);
  await setPreference(db3, "theme", "dark");
  await toggleBookmark(db3, 4);
  db3.close();

  const old = new Dexie("dua-user", { indexedDB: factory, IDBKeyRange });
  old.version(1).stores({
    bookmarks: "dua_id, updated_at",
    outbox: "++seq, &op_id",
    meta: "name",
    kept_ops: "++seq, &op_id, account_owner, kept_at",
  });
  old.version(2).stores({ memorize: "dua_id, progress" });
  t.after(() => old.close());
  await old.open();
  assert.equal((await old.table("bookmarks").get(4)).dua_id, 4);
  assert.equal(await old.table("memorize").count(), 0);
});
