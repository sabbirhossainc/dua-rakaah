import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { compareDatabases, vacuumContentDb } from "./vacuum-content-db.mjs";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const REAL_DB = fileURLToPath(new URL("../data/dua_main.sqlite", import.meta.url));
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

// Work on scratch copies in the OS temp folder; the real database is never touched.
function scratchCopy(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vacuum-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, "dua_main.sqlite");
  fs.copyFileSync(REAL_DB, file);
  const original = path.join(dir, "original.sqlite");
  fs.copyFileSync(REAL_DB, original);
  return { dir, file, original };
}

test("a bloated database is compacted with identical content", (t) => {
  const { dir, file, original } = scratchCopy(t);
  // The shipped file may already be compacted, so make it bloated: add and delete rows.
  const db = new Database(file);
  db.exec("CREATE TABLE junk (x TEXT)");
  const insert = db.prepare("INSERT INTO junk VALUES (?)");
  db.transaction(() => {
    for (let i = 0; i < 2000; i++) insert.run("x".repeat(2000));
  })();
  db.exec("DROP TABLE junk");
  db.close();
  assert.ok(fs.statSync(file).size > 1024 * 1024, "scratch file should start bloated");

  const r = vacuumContentDb(file);
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  assert.equal(r.replaced, true);
  assert.equal(r.freelistAfter, 0);
  assert.ok(fs.statSync(file).size < 1024 * 1024, `compacted size ${fs.statSync(file).size}`);
  assert.deepEqual(compareDatabases(original, file), []);
  assert.equal(fs.existsSync(`${file}.vacuum-tmp`), false);
  assert.equal(fs.readdirSync(dir).includes("dua_main.sqlite.vacuum-tmp"), false);
});

test("a compacted copy that differs is refused and the original stays untouched", (t) => {
  const { file } = scratchCopy(t);
  const before = sha(file);

  const r = vacuumContentDb(file, {
    afterVacuum(tmp) {
      const db = new Database(tmp);
      db.exec("UPDATE dua SET dua_name_en = 'CHANGED' WHERE rowid = (SELECT MIN(rowid) FROM dua)");
      db.close();
    },
  });

  assert.equal(r.ok, false);
  assert.equal(r.replaced, false);
  assert.ok(r.problems.some((p) => p.startsWith("dua:")), r.problems.join("; "));
  assert.equal(sha(file), before, "original file must be byte-identical");
  assert.equal(fs.existsSync(`${file}.vacuum-tmp`), false, "temp file must be removed");
});

test("a changed row count is refused", (t) => {
  const { file } = scratchCopy(t);
  const before = sha(file);
  const r = vacuumContentDb(file, {
    afterVacuum(tmp) {
      const db = new Database(tmp);
      db.exec("DELETE FROM sub_category WHERE rowid = (SELECT MAX(rowid) FROM sub_category)");
      db.close();
    },
  });
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => p.startsWith("sub_category: row count")), r.problems.join("; "));
  assert.equal(sha(file), before);
});

test("a changed schema is refused", (t) => {
  const { file } = scratchCopy(t);
  const before = sha(file);
  const r = vacuumContentDb(file, {
    afterVacuum(tmp) {
      const db = new Database(tmp);
      db.exec("CREATE TABLE extra (x)");
      db.close();
    },
  });
  assert.equal(r.ok, false);
  assert.ok(r.problems.includes("schema differs"), r.problems.join("; "));
  assert.equal(sha(file), before);
});
