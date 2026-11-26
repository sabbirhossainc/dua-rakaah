import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { listedVerses } from "../audio/lookup.js";
import { textSha } from "../audio/parts.js";
import { handleReciters, handleRecitation } from "./handlers.js";
import { Unavailable } from "./recitations.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const URLS = ["https://verses.quran.com/x/002285.mp3"];
const LIST = [{ id: 7, name: "Seven", style: null }];

function setup({ fail = null, service = true } = {}) {
  const calls = [];
  const lines = [];
  const fake = {
    async recitation(verses, reciter) {
      calls.push({ verses, reciter });
      if (fail) throw fail;
      return { urls: URLS, reciter: { id: reciter, name: "Seven" } };
    },
    async reciters() {
      calls.push("list");
      if (fail) throw fail;
      return LIST;
    },
  };
  const deps = {
    service: service ? fake : null,
    versesOf: (d, p) => (d === 202 && p === 1 ? { verses: ["2:285", "2:286"], coverage: "full" } : null),
    log: (l) => lines.push(l),
  };
  const part = (duaId, n, query = "") =>
    handleRecitation(new Request(`http://x/api/audio/${duaId}/${n}${query}`), { duaId, part: n }, deps);
  return { part, reciters: () => handleReciters(deps), calls, lines };
}

const read = async (response) => {
  const r = await response;
  assert.equal(r.headers.get("cache-control"), "no-store");
  return [r.status, await r.json()];
};

test("a listed part answers with its addresses, coverage and reciter, using recitation 7 by default", async () => {
  const s = setup();
  assert.deepEqual(await read(s.part("202", "1")), [200, { urls: URLS, coverage: "full", reciter: { id: 7, name: "Seven" } }]);
  assert.deepEqual(s.calls, [{ verses: ["2:285", "2:286"], reciter: 7 }]);
  await read(s.part("202", "1", "?reciter=3"));
  assert.equal(s.calls[1].reciter, 3);
});

test("the caller cannot choose verses", async () => {
  const s = setup();
  await read(s.part("202", "1", "?verses=1:1&url=https://evil.example"));
  assert.deepEqual(s.calls[0].verses, ["2:285", "2:286"]);
});

test("an unlisted part is not found, and the source is not asked", async () => {
  const s = setup();
  assert.equal((await read(s.part("202", "2")))[0], 404);
  assert.equal((await read(s.part("9", "1")))[0], 404);
  assert.deepEqual(s.calls, []);
});

test("values that are not positive whole numbers are refused, and the source is not asked", async () => {
  const s = setup();
  const bad = [["0", "1"], ["-1", "1"], ["1.5", "1"], ["abc", "1"], ["202", "0"], ["202", "01"], ["1e3", "1"], ["9999999999", "1"]];
  for (const [d, p] of bad) assert.equal((await read(s.part(d, p)))[0], 400, `${d}/${p}`);
  for (const q of ["?reciter=", "?reciter=0", "?reciter=x", "?reciter=7.0", "?reciter=1234567"]) {
    assert.equal((await read(s.part("202", "1", q)))[0], 400, q);
  }
  assert.deepEqual(s.calls, []);
});

test("without the source both routes answer not found", async () => {
  const s = setup({ service: false });
  assert.equal((await read(s.part("202", "1")))[0], 404);
  assert.equal((await read(s.reciters()))[0], 404);
});

test("a failing source answers unavailable, with nothing about the source", async () => {
  const known = setup({ fail: new Unavailable("HTTP 429") });
  assert.deepEqual(await read(known.part("202", "1")), [503, { error: "unavailable" }]);
  assert.deepEqual(await read(known.reciters()), [503, { error: "unavailable" }]);
  assert.deepEqual(known.lines, []);
  const unknown = setup({ fail: new TypeError("Bearer invented-token") });
  assert.deepEqual(await read(unknown.part("202", "1")), [503, { error: "unavailable" }]);
  assert.deepEqual(unknown.lines, ["Quran.com request failed: TypeError"]);
});

test("the reciter list comes with the default", async () => {
  assert.deepEqual(await read(setup().reciters()), [200, { reciters: LIST, default: 7 }]);
});

// ---- the verses the routes serve, from real content rows ----
const db = new Database(fileURLToPath(new URL("../../data/dua_main.sqlite", import.meta.url)), { readonly: true });
const rowsOf = (id) => db.prepare("SELECT * FROM dua WHERE id = ? ORDER BY rowid").all(id);

test("every listed run of verses is served for the current content, in verse order", () => {
  const sources = JSON.parse(fs.readFileSync(new URL("../../data/audio-sources.json", import.meta.url), "utf8"));
  const listed = sources.recordings.filter((r) => r.quran);
  assert.ok(listed.length > 0);
  for (const r of listed) {
    const got = listedVerses(rowsOf(r.dua_id), sources, r.dua_id, r.part);
    assert.ok(got, `dua ${r.dua_id} part ${r.part}`);
    assert.equal(got.verses[0], r.quran.from);
    assert.equal(got.verses.at(-1), r.quran.to);
  }
  assert.deepEqual(listedVerses(rowsOf(202), sources, 202, 1), { verses: ["2:285", "2:286"], coverage: "full" });
});

test("changed text, a part without verses or a missing dua serves nothing", () => {
  const rows = rowsOf(4);
  const quran = { from: "1:5", to: "1:5", coverage: "full" };
  const list = (entry) => ({ recordings: [{ dua_id: 4, part: 1, text_sha: textSha(rows[0].dua_arabic), quran, candidates: [], ...entry }] });
  assert.ok(listedVerses(rows, list({}), 4, 1));
  assert.equal(listedVerses(rows, list({ text_sha: textSha("older") }), 4, 1), null);
  assert.equal(listedVerses(rows, list({ quran: null }), 4, 1), null);
  assert.equal(listedVerses(rows, list({}), 4, 2), null);
  assert.equal(listedVerses([], list({}), 4, 1), null);
});

test.after(() => db.close());
