import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, getMeta, setMeta } from "./db.js";
import { listBookmarks, toggleBookmark } from "./bookmarks.js";
import { createSyncRunner, DEBOUNCE_MS } from "./sync.js";
import { testClient } from "../sync/test-helpers.js";
import { handleSync } from "../sync/handler.js";

function freshDb(t) {
  const db = createDb({ indexedDB: new IDBFactory(), IDBKeyRange });
  t.after(() => db.close());
  return db;
}

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const okAnswer = (over = {}) => json(200, { owner_id: randomUUID(), kind: "anon", cursor: 0, rows: [], ...over });

/** A fetch that records requests and answers from a list (or a function). */
function fakeFetch(answer) {
  const calls = [];
  const fn = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    return typeof answer === "function" ? answer(body, calls.length) : answer[Math.min(calls.length - 1, answer.length - 1)];
  };
  fn.calls = calls;
  return fn;
}

test("a failed send keeps the queued change", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  const runner = createSyncRunner({ db, fetchFn: async () => { throw new TypeError("network down"); } });
  const result = await runner.sync();
  assert.equal(result.ok, false);
  assert.equal(await db.outbox.count(), 1);
});

test("a 503 keeps the queued change and does not loop", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  const fetchFn = fakeFetch(() => json(503, { error: "unavailable" }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(await db.outbox.count(), 1);
  assert.equal(fetchFn.calls.length, 1);
});

test("offline sends nothing", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  const fetchFn = fakeFetch(() => okAnswer());
  const result = await createSyncRunner({ db, fetchFn, isOnline: () => false }).sync();
  assert.equal(result.reason, "offline");
  assert.equal(fetchFn.calls.length, 0);
  assert.equal(await db.outbox.count(), 1);
});

test("a confirmed change leaves the queue and the cursor and owner are saved", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5, { now: 1000 });
  const fetchFn = fakeFetch(() => okAnswer({ owner_id: "owner-1", cursor: 9 }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(await db.outbox.count(), 0);
  assert.equal(await getMeta(db, "cursor"), 9);
  assert.equal(await getMeta(db, "owner"), "owner-1");
  assert.equal(fetchFn.calls[0].body.ops.length, 1);
  assert.equal(fetchFn.calls[0].body.cursor, 0);
});

test("a change made while a request is away survives and goes in the next request", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1, { now: 1000 });
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const fetchFn = async (url, init) => {
    fetchFn.calls.push(JSON.parse(init.body));
    if (fetchFn.calls.length === 1) await gate;
    return okAnswer();
  };
  fetchFn.calls = [];
  const runner = createSyncRunner({ db, fetchFn });
  const running = runner.sync();
  await new Promise((r) => setTimeout(r, 20));
  await toggleBookmark(db, 2, { now: 2000 }); // while the first request is away
  release();
  await running;
  assert.equal(fetchFn.calls.length, 2);
  assert.deepEqual(fetchFn.calls[0].ops.map((o) => o.dua_id), [1]);
  assert.deepEqual(fetchFn.calls[1].ops.map((o) => o.dua_id), [2]);
  assert.equal(await db.outbox.count(), 0);
});

test("two triggers during one request make one request", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1);
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let active = 0;
  let maxActive = 0;
  const fetchFn = async (url, init) => {
    fetchFn.calls.push(JSON.parse(init.body));
    maxActive = Math.max(maxActive, ++active);
    await gate;
    active--;
    return okAnswer();
  };
  fetchFn.calls = [];
  const runner = createSyncRunner({ db, fetchFn });
  const first = runner.sync();
  const second = runner.sync();
  const third = runner.sync();
  await new Promise((r) => setTimeout(r, 20));
  release();
  await Promise.all([first, second, third]);
  assert.equal(fetchFn.calls.length, 1);
  assert.equal(maxActive, 1);
});

test("a 403 starts a new anonymous identity, queues every bookmark, and sends again at once", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1, { now: 1000 });
  await toggleBookmark(db, 2, { now: 2000 });
  await db.outbox.clear(); // pretend both were already confirmed
  await setMeta(db, "cursor", 40);
  const ids = [randomUUID(), randomUUID()];
  const fetchFn = fakeFetch((body, n) => (n === 1 ? json(403, { error: "forbidden" }) : okAnswer({ owner_id: body.anon_id, cursor: 3 })));
  const runner = createSyncRunner({ db, fetchFn, newId: () => ids.shift() });
  await runner.sync();
  assert.equal(fetchFn.calls.length, 2);
  const [first, second] = fetchFn.calls.map((c) => c.body);
  assert.notEqual(second.anon_id, first.anon_id);
  assert.equal(second.cursor, 0);
  assert.deepEqual(second.ops.map((o) => o.dua_id).sort(), [1, 2]);
  assert.equal(await db.outbox.count(), 0);
});

test("a 401 tells the app the session is gone and keeps the queue", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1);
  const events = [];
  const runner = createSyncRunner({ db, fetchFn: fakeFetch(() => json(401, { error: "signed_out" })), onEvent: (e) => events.push(e.type) });
  await runner.sync();
  assert.deepEqual(events, ["signed_out"]);
  assert.equal(await db.outbox.count(), 1);
});

test("an answer that arrives after the identity changed is dropped, and the change is sent again", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1);
  const stale = { type: "bookmark", dua_id: 7, deleted: 0, updated_at: 5, op_id: randomUUID(), server_seq: 99 };
  const fetchFn = fakeFetch(async (body, n) => {
    if (n === 1) {
      await setMeta(db, "epoch", 1); // the reader signed in while the request was away
      return okAnswer({ cursor: 99, rows: [stale] });
    }
    return okAnswer({ cursor: 5 });
  });
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls.length, 2); // the first answer was dropped, so the change went out again
  assert.equal(await db.bookmarks.get(7), undefined);
  assert.equal(await getMeta(db, "cursor", 0), 5);
  assert.equal(await db.outbox.count(), 0);
});

test("a dropped answer is asked for again even when nothing is waiting to be sent", async (t) => {
  const db = freshDb(t);
  const row = { type: "bookmark", dua_id: 7, deleted: 0, updated_at: 5, op_id: randomUUID(), server_seq: 4 };
  const fetchFn = fakeFetch(async (body, n) => {
    if (n === 1) {
      await setMeta(db, "epoch", 1); // the reader signed in while this request was away
      return okAnswer({ cursor: 0, rows: [] });
    }
    return okAnswer({ cursor: 4, rows: [row] });
  });
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls.length, 2);
  assert.equal((await db.bookmarks.get(7)).op_id, row.op_id);
  assert.equal(await getMeta(db, "cursor"), 4);
});

test("pulled rows are applied, and a removal arrives as a record", async (t) => {
  const db = freshDb(t);
  const row = (dua_id, deleted, updated_at) => ({ type: "bookmark", dua_id, deleted, updated_at, op_id: randomUUID(), server_seq: updated_at });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 3, rows: [row(1, 0, 1), row(2, 0, 2), row(1, 1, 3)] }));
  await createSyncRunner({ db, fetchFn }).sync();
  // The server keeps one row per bookmark. Even so, applying them in order must leave the last one.
  assert.deepEqual((await listBookmarks(db)).map((r) => r.dua_id), [2]);
});

test("notifyChange waits, and a burst of changes becomes one sync", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 1);
  const timers = [];
  const cleared = [];
  const fetchFn = fakeFetch(() => okAnswer());
  const runner = createSyncRunner({
    db,
    fetchFn,
    setTimeoutFn: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimeoutFn: (id) => cleared.push(id),
  });
  runner.notifyChange();
  runner.notifyChange();
  runner.notifyChange();
  assert.equal(fetchFn.calls.length, 0);
  assert.deepEqual(cleared, [1, 2]);
  assert.equal(timers.at(-1).ms, DEBOUNCE_MS);
  timers.at(-1).fn();
  await runner.sync();
  assert.equal(fetchFn.calls.length, 1);
});

test("start syncs now, when back online and when the tab is visible, and stop removes the listeners", async (t) => {
  const db = freshDb(t);
  const fetchFn = fakeFetch(() => okAnswer());
  const runner = createSyncRunner({ db, fetchFn });
  const handlers = {};
  const win = { addEventListener: (n, f) => (handlers[n] = f), removeEventListener: (n) => delete handlers[n] };
  const doc = { visibilityState: "hidden", addEventListener: (n, f) => (handlers[n] = f), removeEventListener: (n) => delete handlers[n] };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
  let interval;
  const stop = runner.start({ win, doc, setIntervalFn: (fn) => (interval = setInterval(fn, 1e9)) });
  try {
    await settle();
    assert.equal(fetchFn.calls.length, 1); // at start
    handlers.online();
    await settle();
    assert.equal(fetchFn.calls.length, 2);
    handlers.visibilitychange(); // hidden: nothing
    await settle();
    assert.equal(fetchFn.calls.length, 2);
    doc.visibilityState = "visible";
    handlers.visibilitychange();
    await settle();
    assert.equal(fetchFn.calls.length, 3);
  } finally {
    stop();
    clearInterval(interval);
  }
  assert.deepEqual(Object.keys(handlers), []);
});

test("two browsers sync through the real handler and end with the same bookmarks", async (t) => {
  const server = await testClient();
  t.after(server.cleanup);
  const deps = { getClient: async () => server.client, getSession: async () => null, secret: "integration-secret" };

  // A browser: its own database and a cookie jar, talking to the real handler.
  function browser() {
    const db = freshDb(t);
    let cookie = "";
    const fetchFn = async (url, init) => {
      const headers = { ...init.headers, ...(cookie ? { cookie } : {}) };
      const res = await handleSync(new Request(`http://localhost:3100${url}`, { method: "POST", headers, body: init.body }), deps);
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      return res;
    };
    return { db, runner: createSyncRunner({ db, fetchFn }), clearCookie: () => (cookie = "") };
  }

  const a = browser();
  const b = browser();
  await toggleBookmark(a.db, 1, { now: 1000 });
  await toggleBookmark(a.db, 2, { now: 2000 });
  await a.runner.sync();
  await toggleBookmark(a.db, 1, { now: 3000 }); // remove
  await a.runner.sync();
  // b is a different anonymous reader: it must see nothing of a's data.
  await b.runner.sync();
  assert.deepEqual(await listBookmarks(b.db), []);
  // a clears its cookies: the server refuses the identifier, a rotates it and re-sends everything.
  a.clearCookie();
  await toggleBookmark(a.db, 3, { now: 4000 });
  await a.runner.sync();
  assert.equal(await a.db.outbox.count(), 0);
  assert.deepEqual((await listBookmarks(a.db)).map((r) => r.dua_id).sort(), [2, 3]);
  const owners = await server.client.execute("SELECT count(*) n FROM owners");
  assert.equal(Number(owners.rows[0].n), 2); // the old one is left behind, the new one holds everything
});
