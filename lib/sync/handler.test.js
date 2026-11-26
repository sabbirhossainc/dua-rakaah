import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { testClient } from "./test-helpers.js";
import { handleClear, handleSync, MAX_BODY_BYTES } from "./handler.js";
import { ANON_COOKIE, signOwnerId } from "./cookie.js";
import { MAX_OPS } from "./records.js";

const SECRET = "handler-test-secret";
const URL_ = "http://localhost:3100/api/sync";
const op = (dua_id, deleted = 0, client_ts = 1000) => ({
  op_id: randomUUID(),
  type: "bookmark",
  dua_id,
  fields: { deleted },
  client_ts,
});

function post(body, headers = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(URL_, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: text });
}

async function setup(t, overrides = {}) {
  const h = await testClient();
  t.after(h.cleanup);
  const deps = { getClient: async () => h.client, getSession: async () => null, secret: SECRET, ...overrides };
  return { client: h.client, call: (request) => handleSync(request, deps) };
}

test("a first sync is 200, not cacheable, and sets an HTTP-only signed cookie", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  const res = await call(post({ anon_id: anon, cursor: 0, ops: [op(5)] }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const cookie = res.headers.get("set-cookie");
  assert.ok(cookie.startsWith(`${ANON_COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
  const body = await res.json();
  assert.equal(body.owner_id, anon);
  assert.equal(body.rows.length, 1);
});

test("the cookie is Secure in production", async (t) => {
  const { client } = await setup(t);
  const res = await handleSync(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }), {
    getClient: async () => client, getSession: async () => null, secret: SECRET, secure: true,
  });
  assert.match(res.headers.get("set-cookie"), /; Secure/);
});

test("the cookie from the first sync is accepted on the next one", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  await call(post({ anon_id: anon, cursor: 0, ops: [op(5)] }));
  const cookie = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, SECRET))}`;
  const res = await call(post({ anon_id: anon, cursor: 0, ops: [] }, { cookie }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).rows.length, 1);
});

test("bad bodies are 400 and store nothing", async (t) => {
  const { call, client } = await setup(t);
  for (const body of ["not json", { anon_id: randomUUID(), cursor: 0 }, { anon_id: randomUUID(), cursor: 0, ops: [{ ...op(1), type: "x" }] }, []]) {
    const res = await call(post(body));
    assert.equal(res.status, 400, JSON.stringify(body));
  }
  assert.equal(Number((await client.execute("SELECT count(*) n FROM owners")).rows[0].n), 0);
});

test("too many changes is 413 and stores nothing", async (t) => {
  const { call, client } = await setup(t);
  const ops = Array.from({ length: MAX_OPS + 1 }, (_, i) => op(i + 1));
  const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops }));
  assert.equal(res.status, 413);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM bookmarks")).rows[0].n), 0);
});

test("a body over the size limit is 413", async (t) => {
  const { call } = await setup(t);
  const res = await call(post("x".repeat(MAX_BODY_BYTES + 1)));
  assert.equal(res.status, 413);
});

test("a guessed identifier is 403", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  await call(post({ anon_id: anon, cursor: 0, ops: [op(5)] }));
  const res = await call(post({ anon_id: anon, cursor: 0, ops: [op(6)] }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "forbidden");
});

test("a tampered cookie is ignored, so it is a guess too", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  await call(post({ anon_id: anon, cursor: 0, ops: [op(5)] }));
  const forged = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, "wrong-secret"))}`;
  const res = await call(post({ anon_id: anon, cursor: 0, ops: [] }, { cookie: forged }));
  assert.equal(res.status, 403);
});

test("a request from another origin is 403", async (t) => {
  const { call } = await setup(t);
  const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }, { origin: "https://evil.example" }));
  assert.equal(res.status, 403);
  const same = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }, { origin: "http://localhost:3100" }));
  assert.equal(same.status, 200);
});

test("an unreachable database is 503", async (t) => {
  const { call } = await setup(t, { getClient: async () => { throw new Error("cannot connect"); } });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }));
    assert.equal(res.status, 503);
  } finally {
    console.error = original;
  }
});

test("a missing cookie secret is 503", async (t) => {
  const { call } = await setup(t, { secret: undefined });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }));
    assert.equal(res.status, 503);
  } finally {
    console.error = original;
  }
});

test("a broken session lookup does not stop anonymous sync", async (t) => {
  const { call } = await setup(t, { getSession: async () => { throw new Error("no AUTH_SECRET"); } });
  const original = console.error;
  console.error = () => {};
  try {
    const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(1)] }));
    assert.equal(res.status, 200);
  } finally {
    console.error = original;
  }
});

test("a signed-in request is answered for the account and sets no anonymous cookie", async (t) => {
  const { call } = await setup(t, { getSession: async () => ({ accountId: "google:1" }) });
  const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(3)] }));
  const body = await res.json();
  assert.equal(body.kind, "account");
  assert.equal(res.headers.get("set-cookie"), null);
});

test("clearing removes the cookie", () => {
  const res = handleClear(new Request("http://localhost:3100/api/session/clear", { method: "POST" }));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie"), /Max-Age=0/);
});

test("types: absent or empty gives bookmarks, a list of unknown names gives nothing, a non-list is 400", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  const first = await call(post({ anon_id: anon, cursor: 0, ops: [op(5)] }));
  assert.equal(first.status, 200);
  const cookie = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, SECRET))}`;
  const rowsFor = async (extra) => {
    const res = await call(post({ anon_id: anon, cursor: 0, ops: [], ...extra }, { cookie }));
    return { status: res.status, body: await res.json() };
  };
  assert.equal((await rowsFor({})).body.rows.length, 1);
  assert.equal((await rowsFor({ types: [] })).body.rows.length, 1);
  assert.equal((await rowsFor({ types: ["bookmark"] })).body.rows.length, 1);
  assert.equal((await rowsFor({ types: ["nope"] })).body.rows.length, 0);
  assert.equal((await rowsFor({ types: "bookmark" })).status, 400);
});

test("memorize: a request with no types never gets a memorize row, one that names it does", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  const memOp = {
    op_id: randomUUID(),
    type: "memorize",
    dua_id: 9,
    fields: { learned: 0, progress: 50, reset_gen: 0 },
    client_ts: 1000,
  };
  const first = await call(post({ anon_id: anon, cursor: 0, ops: [op(5), memOp], types: ["bookmark", "memorize"] }));
  assert.equal(first.status, 200);
  assert.deepEqual((await first.json()).rows.map((r) => r.type).sort(), ["bookmark", "memorize"]);
  const cookie = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, SECRET))}`;
  const ask = async (extra) => (await (await call(post({ anon_id: anon, cursor: 0, ops: [], ...extra }, { cookie }))).json()).rows;
  assert.deepEqual((await ask({})).map((r) => r.type), ["bookmark"]);
  assert.deepEqual((await ask({ types: ["bookmark"] })).map((r) => r.type), ["bookmark"]);
  assert.deepEqual((await ask({ types: ["bookmark", "memorize"] })).map((r) => r.type), ["bookmark", "memorize"]);
  assert.deepEqual((await ask({ types: ["memorize"] })).map((r) => [r.type, r.progress]), [["memorize", 50]]);
});

test("memorize: a bad value is a 400 and stores nothing", async (t) => {
  const { call, client } = await setup(t);
  const bad = (fields) => ({ op_id: randomUUID(), type: "memorize", dua_id: 9, fields, client_ts: 1 });
  for (const fields of [
    { learned: 0, progress: 101, reset_gen: 0 },
    { learned: 2, progress: 50, reset_gen: 0 },
    { learned: 0, progress: 50, reset_gen: -1 },
    { learned: 0, progress: 12.5, reset_gen: 0 },
  ]) {
    const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(5), bad(fields)] }));
    assert.equal(res.status, 400, JSON.stringify(fields));
  }
  assert.equal(Number((await client.execute("SELECT count(*) n FROM memorize")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM bookmarks")).rows[0].n), 0);
  assert.equal(Number((await client.execute("SELECT count(*) n FROM owners")).rows[0].n), 0);
});

// ---- settings (add-preferences 3.4) ----

const prefChange = (pref_key, value, extra = {}) => ({
  op_id: randomUUID(),
  type: "preference",
  pref_key,
  fields: { value, ...extra },
  client_ts: 1000,
});

test("settings: a request with no types never gets a setting row, one that names it does", async (t) => {
  const { call } = await setup(t);
  const anon = randomUUID();
  const first = await call(post({ anon_id: anon, cursor: 0, ops: [op(5), prefChange("theme", "dark")], types: ["bookmark", "preference"] }));
  assert.equal(first.status, 200);
  const body = await first.json();
  assert.deepEqual(body.rows.map((r) => r.type).sort(), ["bookmark", "preference"]);
  assert.deepEqual(body.rows.find((r) => r.type === "preference").pref_key, "theme");
  const cookie = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, SECRET))}`;
  const ask = async (extra) => (await (await call(post({ anon_id: anon, cursor: 0, ops: [], ...extra }, { cookie }))).json()).rows;
  assert.deepEqual((await ask({})).map((r) => r.type), ["bookmark"]);
  assert.deepEqual((await ask({ types: [] })).map((r) => r.type), ["bookmark"]);
  assert.deepEqual((await ask({ types: ["bookmark", "memorize"] })).map((r) => r.type), ["bookmark"]);
  assert.deepEqual((await ask({ types: ["bookmark", "memorize", "preference"] })).map((r) => r.type), ["bookmark", "preference"]);
  assert.deepEqual((await ask({ types: ["preference"] })).map((r) => [r.type, r.pref_key, r.value]), [["preference", "theme", "dark"]]);
});

test("settings: a bad name or value is a 400 and stores nothing", async (t) => {
  const { call, client } = await setup(t);
  const bad = [
    prefChange("theme", "blue"),
    prefChange("arabic_font", "huge"),
    prefChange("reciter_id", "0"),
    prefChange("language", "bn"),
    prefChange("theme", 1),
    prefChange("theme", "dark", { if_absent: 2 }),
    { ...prefChange("theme", "dark"), pref_key: undefined },
    { ...prefChange("theme", "dark"), pref_key: "" },
  ];
  for (const b of bad) {
    const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [op(5), b] }));
    assert.equal(res.status, 400, JSON.stringify(b));
  }
  for (const table of ["preferences", "bookmarks", "owners", "applied_ops"]) {
    assert.equal(Number((await client.execute(`SELECT count(*) n FROM ${table}`)).rows[0].n), 0, table);
  }
});

test("settings: bookmark and memorize changes in the form older versions send are still accepted", async (t) => {
  const { call } = await setup(t);
  const old = { op_id: randomUUID(), type: "bookmark", dua_id: 3, fields: { deleted: 0 }, client_ts: 5 };
  const mem = { op_id: randomUUID(), type: "memorize", dua_id: 4, fields: { learned: 0, progress: 25, reset_gen: 0 }, client_ts: 5 };
  const res = await call(post({ anon_id: randomUUID(), cursor: 0, ops: [old, mem], types: ["bookmark", "memorize"] }));
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).rows.map((r) => [r.type, r.dua_id]).sort(), [["bookmark", 3], ["memorize", 4]]);
});

test("settings: a mixed batch is applied in one request and the setting comes back with its name", async (t) => {
  const { call } = await setup(t);
  const res = await call(
    post({
      anon_id: randomUUID(),
      cursor: 0,
      ops: [op(1), prefChange("arabic_font", "xlarge"), prefChange("reciter_id", "42")],
      types: ["bookmark", "preference"],
    })
  );
  assert.equal(res.status, 200);
  const rows = (await res.json()).rows;
  assert.deepEqual(rows.filter((r) => r.type === "preference").map((r) => [r.pref_key, r.value]), [["arabic_font", "xlarge"], ["reciter_id", "42"]]);
  assert.ok(rows.every((r) => r.type !== "preference" || !("dua_id" in r)), "a setting row carries pref_key, not dua_id");
});

test("purge: a stale request is answered in full with removed_before, others are answered as before", async (t) => {
  const { call, client } = await setup(t);
  const anon = randomUUID();
  const cookie = `${ANON_COOKIE}=${encodeURIComponent(signOwnerId(anon, SECRET))}`;
  const first = await (await call(post({ anon_id: anon, cursor: 0, ops: [op(1)] }))).json();
  await client.execute({
    sql: "INSERT INTO purge_marks (owner_id, seq, removed_before) VALUES (?, ?, 500)",
    args: [anon, first.cursor + 3],
  });
  const ask = async (extra) => (await call(post({ anon_id: anon, cursor: first.cursor, ops: [], ...extra }, { cookie }))).json();

  const stale = await ask({ since: 0 });
  assert.equal(stale.full, true);
  assert.equal(stale.removed_before, 500);
  assert.equal(stale.rows.length, 1);
  assert.equal(stale.cursor, first.cursor + 3);

  for (const extra of [{ since: first.cursor + 3 }, {}]) {
    const body = await ask(extra);
    assert.deepEqual(Object.keys(body).sort(), ["cursor", "kind", "owner_id", "rows"]);
    assert.deepEqual(body.rows, []);
  }
  assert.equal((await call(post({ anon_id: anon, cursor: 0, ops: [], since: -1 }, { cookie }))).status, 400);
});
