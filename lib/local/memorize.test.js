import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import Dexie from "dexie";
import { createDb } from "./db.js";
import { toggleBookmark } from "./bookmarks.js";
import { isStarted, listMemorize, setMemorize } from "./memorize.js";

function freshDb(t, factory = new IDBFactory()) {
  const db = createDb({ indexedDB: factory, IDBKeyRange });
  t.after(() => db.close());
  return db;
}

const progress = (value) => ({ kind: "progress", value });
const learned = (value) => ({ kind: "learned", value });
const START_OVER = { kind: "startOver" };
const state = async (db, id) => {
  const r = await db.memorize.get(id);
  return r && [r.learned, r.progress, r.reset_gen];
};

test("choosing a first step starts the dua at that progress with one queued change", async (t) => {
  const db = freshDb(t);
  const record = await setMemorize(db, 5, progress(25), { now: 1000 });
  assert.deepEqual(record, { dua_id: 5, learned: 0, progress: 25, reset_gen: 0 });
  const outbox = await db.outbox.toArray();
  assert.equal(outbox.length, 1);
  assert.deepEqual(
    { type: outbox[0].type, dua_id: outbox[0].dua_id, fields: outbox[0].fields, client_ts: outbox[0].client_ts },
    { type: "memorize", dua_id: 5, fields: { learned: 0, progress: 25, reset_gen: 0 }, client_ts: 1000 }
  );
});

test("ticking learned sets progress to 100 without a reset", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, progress(50));
  await setMemorize(db, 5, learned(true));
  assert.deepEqual(await state(db, 5), [1, 100, 0]);
});

test("un-ticking learned is a reset that leaves the progress alone", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, learned(true));
  await setMemorize(db, 5, learned(false));
  assert.deepEqual(await state(db, 5), [0, 100, 1]);
});

test("raising progress keeps the generation, lowering it is a reset, and the reset's change carries the new generation", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, progress(25));
  await setMemorize(db, 5, progress(75));
  assert.deepEqual(await state(db, 5), [0, 75, 0]);
  await setMemorize(db, 5, progress(25));
  assert.deepEqual(await state(db, 5), [0, 25, 1]);
  const outbox = await db.outbox.orderBy("seq").toArray();
  assert.deepEqual(outbox.map((o) => o.fields.reset_gen), [0, 0, 1]);
  await setMemorize(db, 5, progress(50)); // forward again, in the new generation
  assert.deepEqual(await state(db, 5), [0, 50, 1]);
});

test("choosing a step below 100 on a learned dua also un-ticks learned, and 100 does not tick it", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, learned(true));
  await setMemorize(db, 5, progress(75));
  assert.deepEqual(await state(db, 5), [0, 75, 1]);
  await setMemorize(db, 5, progress(100));
  assert.deepEqual(await state(db, 5), [0, 100, 1]); // forward, learned stays off
});

test("start over is a reset to 0 and not learned, and only if there was something to reset", async (t) => {
  const db = freshDb(t);
  assert.equal(await setMemorize(db, 5, START_OVER), null); // never touched: nothing to do
  assert.equal(await db.outbox.count(), 0);
  await setMemorize(db, 5, progress(50));
  await setMemorize(db, 5, START_OVER);
  assert.deepEqual(await state(db, 5), [0, 0, 1]);
  assert.equal(await db.outbox.count(), 2);
  assert.equal(await setMemorize(db, 5, START_OVER) !== null, true); // returns the existing record
  assert.equal(await db.outbox.count(), 2); // and queues nothing
});

test("setting the state a dua is already in queues nothing", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, progress(50));
  await setMemorize(db, 5, progress(50));
  assert.equal(await db.outbox.count(), 1);
});

test("a stale generation: a device that did not see another device's reset makes its change at the old generation", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, progress(50)); // local state at generation 0
  const change = (await db.outbox.toArray())[0];
  assert.equal(change.fields.reset_gen, 0); // it would lose to a reset to generation 1 on the server
});

test("one record per dua, whatever the number of parts", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 121, progress(25));
  await setMemorize(db, 121, progress(50));
  assert.equal(await db.memorize.count(), 1);
});

test("a bad dua id is refused and nothing is written", async (t) => {
  const db = freshDb(t);
  for (const bad of [0, -1, 1.5, "5", NaN]) await assert.rejects(setMemorize(db, bad, progress(25)));
  assert.equal(await db.memorize.count(), 0);
  assert.equal(await db.outbox.count(), 0);
});

test("listMemorize returns started duas only", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 1, progress(25));
  await setMemorize(db, 2, learned(true));
  await setMemorize(db, 3, progress(50));
  await setMemorize(db, 3, START_OVER);
  assert.deepEqual((await listMemorize(db)).map((r) => r.dua_id).sort(), [1, 2]);
  assert.equal(isStarted(undefined), false);
  assert.equal(isStarted({ learned: 0, progress: 0 }), false);
  assert.equal(isStarted({ learned: 0, progress: 25 }), true);
  assert.equal(isStarted({ learned: 1, progress: 0 }), true);
});

test("a version 1 database with bookmarks opens at version 2 with the bookmarks intact", async (t) => {
  const factory = new IDBFactory();
  const v1 = new Dexie("dua-user", { indexedDB: factory, IDBKeyRange });
  v1.version(1).stores({
    bookmarks: "dua_id, updated_at",
    outbox: "++seq, &op_id",
    meta: "name",
    kept_ops: "++seq, &op_id, account_owner, kept_at",
  });
  await v1.open();
  await v1.table("bookmarks").put({ dua_id: 7, deleted: 0, updated_at: 5, op_id: randomUUID() });
  await v1.table("meta").put({ name: "cursor", value: 12 });
  v1.close();

  const db = freshDb(t, factory);
  await db.open();
  assert.equal((await db.bookmarks.get(7)).dua_id, 7);
  assert.equal((await db.meta.get("cursor")).value, 12);
  assert.equal(await db.memorize.count(), 0);
  await setMemorize(db, 7, progress(25));
  await toggleBookmark(db, 8);
  assert.equal(await db.memorize.count(), 1);
});
