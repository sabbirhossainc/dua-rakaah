import test from "node:test";
import assert from "node:assert/strict";
import { testClient } from "./test-helpers.js";
import { ensureSchema } from "./schema.js";

test("ensureSchema twice succeeds and creates the four tables", async () => {
  const { client, cleanup } = await testClient({ schema: false });
  try {
    await ensureSchema(client);
    await ensureSchema(client);
    const r = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const names = r.rows.map((row) => row.name);
    for (const name of ["owners", "sync_counter", "bookmarks", "applied_ops"]) assert.ok(names.includes(name), name);
    const counter = await client.execute("SELECT value FROM sync_counter");
    assert.equal(counter.rows.length, 1);
  } finally {
    cleanup();
  }
});
