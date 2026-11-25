import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDb, getMeta, setMeta } from "./db.js";
import { listBookmarks, toggleBookmark } from "./bookmarks.js";
import { setMemorize } from "./memorize.js";
import { getPreferences, setPreference } from "./preferences.js";
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

test("the request names the record types this device understands", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  const fetchFn = fakeFetch(() => okAnswer());
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(fetchFn.calls[0].body.types, ["bookmark", "memorize", "preference"]);
});

test("a row of a type this build does not know is skipped, and the cursor still moves", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  const fetchFn = fakeFetch((body) =>
    okAnswer({
      cursor: 9,
      rows: [
        { type: "future", dua_id: 7, whatever: 1, server_seq: 8 },
        { type: "bookmark", dua_id: 8, deleted: 0, updated_at: 5, op_id: randomUUID(), server_seq: 9 },
      ],
    })
  );
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(await db.bookmarks.get(7), undefined);
  assert.equal((await db.bookmarks.get(8)).deleted, 0);
  assert.equal(await getMeta(db, "cursor"), 9);
});

test("the cursor goes back to 0 once when the types this device asks for change", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  await setMeta(db, "cursor", 50);
  await setMeta(db, "pulled_types", "bookmark,somethingelse");
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 60 }));
  const runner = createSyncRunner({ db, fetchFn });
  await runner.sync();
  assert.equal(fetchFn.calls[0].body.cursor, 0);
  assert.equal(await getMeta(db, "pulled_types"), "bookmark,memorize,preference");
  assert.equal(await getMeta(db, "cursor"), 60);
  await toggleBookmark(db, 6);
  await runner.sync();
  assert.equal(fetchFn.calls[1].body.cursor, 60);
});

test("a device that synced before memorize existed (no recorded types) pulls from 0 once", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  await setMeta(db, "cursor", 50);
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 70 }));
  const runner = createSyncRunner({ db, fetchFn });
  await runner.sync();
  assert.equal(fetchFn.calls[0].body.cursor, 0);
  await toggleBookmark(db, 6);
  await runner.sync();
  assert.equal(fetchFn.calls[1].body.cursor, 70);
});

// ---- memorize in the runner (design D6) ----

const memRow = (dua_id, learned, progress, reset_gen, server_seq) => ({ type: "memorize", dua_id, learned, progress, reset_gen, server_seq });
const memState = async (db, id) => {
  const r = await db.memorize.get(id);
  return r && [r.learned, r.progress, r.reset_gen];
};

test("memorize changes are sent with their fields and leave the queue once confirmed", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, { kind: "progress", value: 50 }, { now: 1000 });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 3, rows: [memRow(5, 0, 50, 0, 3)] }));
  const result = await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(result.ok, true);
  assert.equal(fetchFn.calls[0].body.ops[0].type, "memorize");
  assert.deepEqual(fetchFn.calls[0].body.ops[0].fields, { learned: 0, progress: 50, reset_gen: 0 });
  assert.equal(await db.outbox.count(), 0);
  assert.deepEqual(await memState(db, 5), [0, 50, 0]);
});

test("a failed send keeps a queued memorize change", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, { kind: "progress", value: 50 });
  await createSyncRunner({ db, fetchFn: async () => { throw new TypeError("down"); } }).sync();
  assert.equal(await db.outbox.count(), 1);
  assert.deepEqual(await memState(db, 5), [0, 50, 0]);
});

test("a pulled memorize row with a higher generation replaces a lower local one", async (t) => {
  const db = freshDb(t);
  await db.memorize.put({ dua_id: 5, learned: 1, progress: 100, reset_gen: 0 });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 9, rows: [memRow(5, 0, 25, 1, 9)] }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(await memState(db, 5), [0, 25, 1]);
});

test("a pulled memorize row with the same generation keeps the larger values", async (t) => {
  const db = freshDb(t);
  await db.memorize.put({ dua_id: 5, learned: 0, progress: 75, reset_gen: 1 });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 9, rows: [memRow(5, 1, 50, 1, 9)] }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(await memState(db, 5), [1, 75, 1]);
});

test("a pending reset beats a lower-generation pulled row", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, { kind: "progress", value: 75 });
  await setMemorize(db, 5, { kind: "progress", value: 25 }); // a reset, generation 1, still queued
  // The server answers (for the first request) with a row from before the reset and acknowledges nothing else.
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 4, rows: [memRow(5, 0, 75, 0, 4)] }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(await memState(db, 5), [0, 25, 1]);
});

test("a memorize change added during a request survives it and is sent next", async (t) => {
  const db = freshDb(t);
  await setMemorize(db, 5, { kind: "progress", value: 25 });
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) await gate;
    return okAnswer({ cursor: calls.length, rows: [] });
  };
  const running = createSyncRunner({ db, fetchFn }).sync();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await setMemorize(db, 5, { kind: "progress", value: 75 }); // made while the first request is away
  assert.equal(await db.outbox.count(), 2);
  release();
  await running;
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].ops.map((o) => o.fields.progress), [25]);
  assert.deepEqual(calls[1].ops.map((o) => o.fields.progress), [75]);
  assert.equal(await db.outbox.count(), 0);
  assert.deepEqual(await memState(db, 5), [0, 75, 0]);
});

test("a 403 re-sends the memorize records too", async (t) => {
  const db = freshDb(t);
  await db.memorize.put({ dua_id: 5, learned: 0, progress: 50, reset_gen: 1 });
  const answers = [json(403, { error: "forbidden" }), okAnswer({ cursor: 2, rows: [] })];
  const fetchFn = fakeFetch((body, n) => answers[n - 1]);
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls.length, 2);
  const resent = fetchFn.calls[1].body.ops.find((o) => o.type === "memorize");
  assert.deepEqual(resent.fields, { learned: 0, progress: 50, reset_gen: 1 });
  assert.notEqual(fetchFn.calls[1].body.anon_id, fetchFn.calls[0].body.anon_id);
});

test("two browsers sync memorize through the real handler and end with the same state", async (t) => {
  const h = await testClient();
  t.after(h.cleanup);
  const SECRET = "memorize-sync-test";
  const deps = { getClient: async () => h.client, getSession: async () => ({ accountId: "google:mem-1" }), secret: SECRET };
  const mkRunner = () => {
    const db = freshDb(t);
    // A cookie jar is not needed: both browsers are signed in as the same account.
    const fetchFn = (url, init) => handleSync(new Request(`http://localhost:3100${url}`, { ...init, headers: { ...init.headers } }), deps);
    return { db, runner: createSyncRunner({ db, fetchFn }) };
  };
  const a = mkRunner();
  const b = mkRunner();
  await setMemorize(a.db, 9, { kind: "progress", value: 75 });
  await setMemorize(b.db, 9, { kind: "progress", value: 25 });
  await setMemorize(b.db, 10, { kind: "learned", value: true });
  await a.runner.sync();
  await b.runner.sync();
  await a.runner.sync();
  assert.deepEqual(await memState(a.db, 9), [0, 75, 0]);
  assert.deepEqual(await memState(b.db, 9), [0, 75, 0]);
  assert.deepEqual(await memState(a.db, 10), [1, 100, 0]);
  // A reset on one browser wins on both after they sync.
  await setMemorize(a.db, 9, { kind: "startOver" });
  await a.runner.sync();
  await b.runner.sync();
  assert.deepEqual(await memState(a.db, 9), [0, 0, 1]);
  assert.deepEqual(await memState(b.db, 9), [0, 0, 1]);
});

// ---- settings in the runner (add-preferences 4.2; design D3, D4) ----

const prefRow = (pref_key, value, updated_at, server_seq, op_id = randomUUID()) => ({ type: "preference", pref_key, value, updated_at, op_id, server_seq });

test("settings: a change is sent with its name and if_absent, and leaves the queue once confirmed", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 1000 });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 3 }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls[0].body.ops.length, 1);
  const sent = fetchFn.calls[0].body.ops[0];
  assert.deepEqual(
    { type: sent.type, pref_key: sent.pref_key, fields: sent.fields, client_ts: sent.client_ts, dua_id: sent.dua_id },
    { type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0 }, client_ts: 1000, dua_id: undefined }
  );
  assert.deepEqual(Object.keys(sent).sort(), ["client_ts", "fields", "op_id", "pref_key", "type"]);
  assert.equal(await db.outbox.count(), 0);
});

test("settings: a failed send keeps a queued setting change", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "arabic_font", "large");
  await createSyncRunner({ db, fetchFn: async () => { throw new TypeError("network down"); } }).sync();
  assert.equal(await db.outbox.count(), 1);
  assert.equal((await db.preferences.get("arabic_font")).value, "large");
});

test("settings: a device whose recorded types are bookmark,memorize pulls from 0 once", async (t) => {
  const db = freshDb(t);
  await toggleBookmark(db, 5);
  await setMeta(db, "cursor", 50);
  await setMeta(db, "pulled_types", "bookmark,memorize");
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 70 }));
  const runner = createSyncRunner({ db, fetchFn });
  await runner.sync();
  assert.equal(fetchFn.calls[0].body.cursor, 0);
  assert.equal(await getMeta(db, "pulled_types"), "bookmark,memorize,preference");
  await toggleBookmark(db, 6);
  await runner.sync();
  assert.equal(fetchFn.calls[1].body.cursor, 70);
});

test("settings: a pulled setting row replaces the local one when nothing is queued, even with an older time", async (t) => {
  const db = freshDb(t);
  await db.preferences.put({ pref_key: "theme", value: "light", updated_at: 9000, op_id: randomUUID() });
  const fetchFn = fakeFetch(() => okAnswer({ cursor: 4, rows: [prefRow("theme", "dark", 100, 4), prefRow("arabic_font", "xlarge", 50, 3)] }));
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual((await db.preferences.get("theme")).value, "dark");
  assert.deepEqual((await db.preferences.get("theme")).updated_at, 100);
  assert.equal((await db.preferences.get("arabic_font")).value, "xlarge");
  assert.equal(await getMeta(db, "cursor"), 4);
});

/** A fetch whose first answer comes after the reader changes a setting (the change is queued, not yet sent), then empty answers. */
function answerAfterChoice(db, name, value, now, firstRows) {
  let n = 0;
  return async () => {
    if (++n === 1) {
      await setPreference(db, name, value, { now });
      return okAnswer({ cursor: 4, rows: firstRows });
    }
    return okAnswer({ cursor: 4 });
  };
}

test("settings: a queued newer change beats an older pulled row", async (t) => {
  const db = freshDb(t);
  const fetchFn = answerAfterChoice(db, "theme", "dark", 6000, [prefRow("theme", "light", 100, 4)]);
  await createSyncRunner({ db, fetchFn }).sync();
  const stored = await db.preferences.get("theme");
  assert.equal(stored.value, "dark");
  assert.equal(stored.updated_at, 6000);
  assert.equal(await db.outbox.count(), 0); // and it was sent in the next round
});

test("settings: an older queued change loses to a newer pulled row", async (t) => {
  const db = freshDb(t);
  const fetchFn = answerAfterChoice(db, "theme", "dark", 50, [prefRow("theme", "light", 100, 4)]);
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal((await db.preferences.get("theme")).value, "light");
});

test("settings: a row of an unknown type is still skipped next to a setting row", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 10 });
  const fetchFn = fakeFetch(() =>
    okAnswer({ cursor: 9, rows: [{ type: "future", pref_key: "x", server_seq: 7 }, prefRow("arabic_font", "small", 5, 9)] })
  );
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal((await db.preferences.get("arabic_font")).value, "small");
  assert.equal(await db.preferences.get("x"), undefined);
  assert.equal(await getMeta(db, "cursor"), 9);
});

test("settings: a 403 re-sends the settings as ordinary changes with a new anonymous identity", async (t) => {
  const db = freshDb(t);
  await db.preferences.put({ pref_key: "theme", value: "dark", updated_at: 700, op_id: randomUUID() });
  await db.preferences.put({ pref_key: "arabic_font", value: "large", updated_at: 800, op_id: randomUUID() });
  const answers = [json(403, { error: "forbidden" }), okAnswer({ cursor: 2, rows: [] })];
  const fetchFn = fakeFetch((body, n) => answers[n - 1]);
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls.length, 2);
  const resent = fetchFn.calls[1].body.ops.filter((o) => o.type === "preference");
  assert.deepEqual(
    resent.map((o) => [o.pref_key, o.fields, o.client_ts]).sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    [
      ["arabic_font", { value: "large", if_absent: 0 }, 800],
      ["theme", { value: "dark", if_absent: 0 }, 700],
    ]
  );
  assert.notEqual(fetchFn.calls[1].body.anon_id, fetchFn.calls[0].body.anon_id);
});

test("settings: a 403 does not queue a setting change that is already waiting a second time", async (t) => {
  const db = freshDb(t);
  await setPreference(db, "theme", "dark", { now: 700 }); // queued, with the record's own op id
  const answers = [json(403, { error: "forbidden" }), okAnswer({ cursor: 2, rows: [] })];
  const fetchFn = fakeFetch((body, n) => answers[n - 1]);
  await createSyncRunner({ db, fetchFn }).sync();
  assert.equal(fetchFn.calls[1].body.ops.filter((o) => o.type === "preference").length, 1);
});

test("settings: two browsers sync through the real handler and end with the same settings", async (t) => {
  const h = await testClient();
  t.after(h.cleanup);
  const deps = { getClient: async () => h.client, getSession: async () => ({ accountId: "google:pref-1" }), secret: "settings-sync-test" };
  const mkRunner = () => {
    const db = freshDb(t);
    const fetchFn = (url, init) => handleSync(new Request(`http://localhost:3100${url}`, { ...init, headers: { ...init.headers } }), deps);
    return { db, runner: createSyncRunner({ db, fetchFn }) };
  };
  const a = mkRunner();
  const b = mkRunner();
  await setPreference(a.db, "arabic_font", "small", { now: 1000 });
  await setPreference(b.db, "arabic_font", "xlarge", { now: 2000 }); // newer: wins on both
  await setPreference(b.db, "theme", "dark", { now: 2100 });
  await setPreference(a.db, "reciter_id", "7", { now: 1100 });
  await a.runner.sync();
  await b.runner.sync();
  await a.runner.sync();
  assert.deepEqual(await getPreferences(a.db), { theme: "dark", arabic_font: "xlarge", reciter_id: "7" });
  assert.deepEqual(await getPreferences(b.db), { theme: "dark", arabic_font: "xlarge", reciter_id: "7" });
  // Going back to the default on one browser (it has a record, so this is an ordinary change) reaches the other.
  await setPreference(a.db, "theme", "light", { now: 3000 });
  await a.runner.sync();
  await b.runner.sync();
  assert.equal((await getPreferences(b.db)).theme, "light");
  assert.equal((await b.db.preferences.get("theme")).value, "light");
});

test("settings: a waiting if_absent change does not hold back a pulled row, but a waiting ordinary change still can", async (t) => {
  const db = freshDb(t);
  const sentIds = [];
  // Two setting changes wait that this request does not carry: the sign-in one for theme, and an ordinary newer one for arabic_font.
  await db.preferences.put({ pref_key: "theme", value: "dark", updated_at: 900, op_id: randomUUID() });
  await db.preferences.put({ pref_key: "arabic_font", value: "large", updated_at: 900, op_id: randomUUID() });
  await db.outbox.bulkAdd([
    ...Array.from({ length: 200 }, (_, i) => ({ op_id: randomUUID(), type: "bookmark", dua_id: i + 1, fields: { deleted: 0 }, client_ts: 1 })),
    { op_id: randomUUID(), type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 1 }, client_ts: 900 },
    { op_id: randomUUID(), type: "preference", pref_key: "arabic_font", fields: { value: "large", if_absent: 0 }, client_ts: 900 },
  ]);
  let n = 0;
  const fetchFn = async (url, init) => {
    sentIds.push(JSON.parse(init.body).ops.length);
    return okAnswer({ cursor: 8, rows: ++n === 1 ? [prefRow("theme", "light", 100, 7), prefRow("arabic_font", "small", 100, 8)] : [] });
  };
  await createSyncRunner({ db, fetchFn }).sync();
  assert.deepEqual(sentIds, [200, 2]);
  assert.equal((await db.preferences.get("theme")).value, "light", "the account's value replaces the device's");
  assert.equal((await db.preferences.get("arabic_font")).value, "large", "a newer ordinary change of ours is kept");
});
