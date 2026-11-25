import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, ensureAnonId, getMeta, setMeta } from "./db.js";
import { isBookmarked, listBookmarks, toggleBookmark } from "./bookmarks.js";

function freshDb(t) {
  const db = createDb({ indexedDB: new IDBFactory(), IDBKeyRange });
  t.after(() => db.close());
  return db;
}

test("toggling adds a bookmark and queues one change, toggling again removes it", async (t) => {
  const db = freshDb(t);
  assert.equal(await toggleBookmark(db, 5, { now: 1000 }), true);
  assert.equal(await isBookmarked(db, 5), true);
  assert.equal((await db.outbox.toArray()).length, 1);
  assert.equal(await toggleBookmark(db, 5, { now: 2000 }), false);
  assert.equal(await isBookmarked(db, 5), false);
  const outbox = await db.outbox.orderBy("seq").toArray();
  assert.deepEqual(outbox.map((o) => o.fields.deleted), [0, 1]);
  // The record is kept (as removed) so the removal can sync.
  assert.equal((await db.bookmarks.get(5)).deleted, 1);
});

test("one bookmark per dua, whatever the number of parts", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 121, { now: 1 });
  assert.equal((await db.bookmarks.count()), 1);
});

test("the list is newest first and leaves out removed bookmarks", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1, { now: 1000 });
  await toggleBookmark(db, 2, { now: 2000 });
  await toggleBookmark(db, 3, { now: 3000 });
  await toggleBookmark(db, 2, { now: 4000 }); // removed
  assert.deepEqual((await listBookmarks(db)).map((r) => r.dua_id), [3, 1]);
});

test("a bad id is refused and nothing is written", async (t) => {
  const db = freshDb(t);
  for (const bad of [0, -1, 1.5, "5", null]) await assert.rejects(toggleBookmark(db, bad));
  assert.equal(await db.bookmarks.count(), 0);
  assert.equal(await db.outbox.count(), 0);
});

test("the record and the queued change are written together or not at all", async (t) => {
  const db = freshDb(t);
  const sameId = randomUUID();
  await toggleBookmark(db, 1, { now: 1, newId: () => sameId });
  // A second change with the same op id breaks the unique index, so the whole transaction must roll back.
  await assert.rejects(toggleBookmark(db, 2, { now: 2, newId: () => sameId }));
  assert.equal(await db.bookmarks.get(2), undefined);
  assert.equal(await db.outbox.count(), 1);
});

test("the anonymous id is created once, even when asked twice at the same time", async (t) => {
  const db = freshDb(t);
  const ids = await Promise.all([ensureAnonId(db), ensureAnonId(db), ensureAnonId(db)]);
  assert.equal(new Set(ids).size, 1);
  assert.equal(await getMeta(db, "anon_id"), ids[0]);
});

test("meta returns the fallback until a value is set", async (t) => {
  const db = freshDb(t);
  assert.equal(await getMeta(db, "cursor", 0), 0);
  await setMeta(db, "cursor", 12);
  assert.equal(await getMeta(db, "cursor", 0), 12);
});
