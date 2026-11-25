import test from "node:test";
import assert from "node:assert/strict";
import { testClient } from "./test-helpers.js";
import { ensureSchema } from "./schema.js";

test("ensureSchema twice succeeds and creates the six tables", async () => {
  const { client, cleanup } = await testClient({ schema: false });
  try {
    await ensureSchema(client);
    await ensureSchema(client);
    const r = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const names = r.rows.map((row) => row.name);
    for (const name of ["owners", "sync_counter", "bookmarks", "applied_ops", "memorize", "preferences"]) assert.ok(names.includes(name), name);
    const counter = await client.execute("SELECT value FROM sync_counter");
    assert.equal(counter.rows.length, 1);
  } finally {
    cleanup();
  }
});

test("the memorize table refuses values outside their ranges", async () => {
  const { client, cleanup } = await testClient();
  try {
    const insert = (learned, progress, reset_gen) =>
      client.execute({
        sql: "INSERT INTO memorize (owner_id, dua_id, learned, progress, reset_gen, server_seq) VALUES ('o', 1, ?, ?, ?, 1)",
        args: [learned, progress, reset_gen],
      });
    await assert.rejects(insert(2, 0, 0));
    await assert.rejects(insert(0, 101, 0));
    await assert.rejects(insert(0, -1, 0));
    await assert.rejects(insert(0, 0, -1));
    await insert(1, 100, 0);
  } finally {
    cleanup();
  }
});

test("the preferences table refuses an empty or oversized name or value, and keeps one row per owner and name", async () => {
  const { client, cleanup } = await testClient();
  try {
    const insert = (key, value, owner = "o") =>
      client.execute({
        sql: "INSERT INTO preferences (owner_id, pref_key, value, updated_at, op_id, server_seq) VALUES (?, ?, ?, 1, 'x', 1)",
        args: [owner, key, value],
      });
    await assert.rejects(insert("", "dark"));
    await assert.rejects(insert("k".repeat(33), "dark"));
    await assert.rejects(insert("theme", ""));
    await assert.rejects(insert("theme", "v".repeat(65)));
    await insert("k".repeat(32), "v".repeat(64));
    await insert("theme", "dark");
    await assert.rejects(insert("theme", "light"), "a second row for the same owner and name");
    await insert("theme", "light", "another-owner");
    const index = await client.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'preferences_by_seq'");
    assert.equal(index.rows.length, 1);
  } finally {
    cleanup();
  }
});

test("ensureSchema leaves rows in the earlier tables alone when it runs again", async () => {
  const { client, cleanup } = await testClient();
  try {
    await client.execute("INSERT INTO bookmarks (owner_id, dua_id, deleted, updated_at, op_id, server_seq) VALUES ('o', 1, 0, 1, 'x', 1)");
    await client.execute("INSERT INTO preferences (owner_id, pref_key, value, updated_at, op_id, server_seq) VALUES ('o', 'theme', 'dark', 1, 'y', 2)");
    await ensureSchema(client);
    assert.equal((await client.execute("SELECT COUNT(*) AS n FROM bookmarks")).rows[0].n, 1);
    assert.equal((await client.execute("SELECT COUNT(*) AS n FROM preferences")).rows[0].n, 1);
  } finally {
    cleanup();
  }
});
