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
