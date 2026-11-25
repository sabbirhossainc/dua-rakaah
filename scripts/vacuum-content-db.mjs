// Compacts data/dua_main.sqlite with VACUUM, but only replaces the original if the compacted
// copy has exactly the same schema and the same rows in the same order (design D8).
//   npm run db:vacuum [path]        (stop the dev server first: on Windows it holds the file open)
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const DEFAULT_DB = fileURLToPath(new URL("../data/dua_main.sqlite", import.meta.url));

function tableNames(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((r) => r.name);
}

// Returns a list of differences between two databases; empty means identical content.
// rowid numbers are not compared (SQLite may renumber them), but row order is.
export function compareDatabases(aPath, bPath) {
  const a = new Database(aPath, { readonly: true });
  const b = new Database(bPath, { readonly: true });
  const problems = [];
  try {
    const schema = (db) => db.prepare("SELECT type, name, tbl_name, sql FROM sqlite_master ORDER BY type, name").all();
    if (JSON.stringify(schema(a)) !== JSON.stringify(schema(b))) problems.push("schema differs");
    const tables = tableNames(a);
    if (JSON.stringify(tables) !== JSON.stringify(tableNames(b))) problems.push("table list differs");
    for (const t of tables) {
      const q = `SELECT * FROM "${t}" ORDER BY rowid`;
      const ra = a.prepare(q).raw().all();
      const rb = b.prepare(q).raw().all();
      if (ra.length !== rb.length) {
        problems.push(`${t}: row count ${ra.length} vs ${rb.length}`);
        continue;
      }
      const bad = ra.findIndex((row, i) => JSON.stringify(row) !== JSON.stringify(rb[i]));
      if (bad !== -1) problems.push(`${t}: row ${bad + 1} differs`);
    }
  } finally {
    a.close();
    b.close();
  }
  return problems;
}

const pragma = (file, name) => {
  const db = new Database(file, { readonly: true });
  try {
    return db.pragma(name, { simple: true });
  } finally {
    db.close();
  }
};

/**
 * @param {string} dbPath
 * @param {{ afterVacuum?: (tmpPath: string) => void }} [hooks] test hook, runs on the compacted copy before checks
 * @returns {{ ok: boolean, replaced: boolean, problems: string[], bytesBefore: number, bytesAfter: number, freelistBefore: number, freelistAfter: number }}
 */
export function vacuumContentDb(dbPath, hooks = {}) {
  const tmp = `${dbPath}.vacuum-tmp`;
  const bytesBefore = fs.statSync(dbPath).size;
  const freelistBefore = pragma(dbPath, "freelist_count");
  fs.rmSync(tmp, { force: true });

  const report = { ok: false, replaced: false, problems: [], bytesBefore, bytesAfter: bytesBefore, freelistBefore, freelistAfter: freelistBefore };
  try {
    const src = new Database(dbPath, { readonly: true });
    try {
      src.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    } finally {
      src.close();
    }
    hooks.afterVacuum?.(tmp);

    report.problems = compareDatabases(dbPath, tmp);
    report.freelistAfter = pragma(tmp, "freelist_count");
    report.bytesAfter = fs.statSync(tmp).size;
    if (report.freelistAfter !== 0) report.problems.push(`compacted file still has ${report.freelistAfter} free pages`);
    if (report.problems.length > 0) return report;

    try {
      fs.renameSync(tmp, dbPath);
      report.replaced = true;
      report.ok = true;
    } catch (err) {
      report.problems.push(`could not replace ${dbPath}: ${err.code ?? err.message} (is the dev server still running?)`);
    }
  } finally {
    fs.rmSync(tmp, { force: true });
  }
  return report;
}

function main() {
  const dbPath = path.resolve(process.argv[2] ?? DEFAULT_DB);
  const r = vacuumContentDb(dbPath);
  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`file:       ${dbPath}`);
  console.log(`size:       ${kb(r.bytesBefore)} -> ${kb(r.bytesAfter)}`);
  console.log(`free pages: ${r.freelistBefore} -> ${r.freelistAfter}`);
  if (r.ok) {
    console.log("checks:     schema, row counts and every row in order are identical; original replaced");
    return 0;
  }
  console.error("NOT replaced. Problems:");
  for (const p of r.problems) console.error(`  - ${p}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main();
}
