import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { testClient } from "../lib/sync/test-helpers.js";
import { applySync } from "../lib/sync/store.js";

const SCRIPT = fileURLToPath(new URL("./purge-user-db.mjs", import.meta.url));
const DAY = 24 * 60 * 60 * 1000;

test("the purge command reports counts, and only deletes without --dry-run", async (t) => {
  const { client, url, cleanup } = await testClient();
  t.after(cleanup);
  const old = Date.now() - 200 * DAY;
  const ops = [1, 0].map((deleted, i) => ({ op_id: randomUUID(), type: "bookmark", dua_id: i + 1, fields: { deleted }, client_ts: old }));
  await applySync(client, { ownerId: "o", ops, cursor: 0, now: old });
  const run = (...args) =>
    spawnSync(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: "" },
      encoding: "utf8",
    });
  const count = async () => Number((await client.execute("SELECT COUNT(*) AS n FROM bookmarks")).rows[0].n);

  const dry = run("--dry-run");
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /Dry run: would delete 1 removed bookmark\(s\) and 2 change identifier\(s\)/);
  assert.equal(await count(), 2);

  const mistyped = run("--dryrun");
  assert.equal(mistyped.status, 1);
  assert.equal(await count(), 2);

  const real = run();
  assert.equal(real.status, 0, real.stderr);
  assert.match(real.stdout, /^Deleted 1 removed bookmark\(s\) and 2 change identifier\(s\)/);
  assert.equal(await count(), 1);

  const again = run();
  assert.match(again.stdout, /^Deleted 0 removed bookmark\(s\) and 0 change identifier\(s\)/);
});
