import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { cachingFetch, matchAudio } from "./match-audio.mjs";
import { INDEX_URL, chapterUrl } from "../lib/audio/source.js";
import { textSha } from "../lib/audio/parts.js";
import { TANZIL_URL, VERSE_COUNT } from "../lib/audio/quran.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const REAL_DB = fileURLToPath(new URL("../data/dua_main.sqlite", import.meta.url));

// The fixtures use Arabic from our own database as the "source" items; none of the source's text is used.
const db = new Database(REAL_DB, { readonly: true });
const DUA_4 = db.prepare("SELECT dua_arabic a FROM dua WHERE id = 4").get().a;
db.close();

const item = (ID, ARABIC_TEXT = DUA_4) => ({ ID, ARABIC_TEXT, AUDIO: `http://www.hisnmuslim.com/audio/ar/${ID}.mp3` });
const body = (data) => `﻿${JSON.stringify(data)}`;
// A Quran-shaped download: surahs 1 to 113 with one verse and the rest in surah 114, all of an invented filler.
// `first` replaces verse 1:1.
const FILLER = "ظظظظغغغغذذذذخخخخثثثثضضضض";
const quranText = ({ first = FILLER, verses = VERSE_COUNT } = {}) => {
  const lines = Array.from({ length: verses }, (_, i) => (i < 113 ? `${i + 1}|1|${FILLER}` : `114|${i - 112}|${FILLER}`));
  lines[0] = `1|1|${first}`;
  return `${lines.join("\n")}\n\n# Copyright (C) Tanzil Project\n`;
};
const source = (...items) => ({
  [TANZIL_URL]: quranText(),
  [INDEX_URL]: body({ English: [{ ID: 1 }] }),
  [chapterUrl(1)]: body({ x: items }),
});
const fetchFrom = (table) => async (url) => {
  if (table[url] === undefined) throw new Error(`HTTP 500 for ${url}`);
  return table[url];
};

function workspace(t, { review = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-match-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const paths = {
    dbPath: REAL_DB,
    sourcesPath: path.join(dir, "audio-sources.json"),
    reviewPath: path.join(dir, "audio-review.json"),
    cacheDir: path.join(dir, "cache"),
  };
  fs.writeFileSync(paths.reviewPath, JSON.stringify(review));
  const lines = [];
  // Collects every argument, as console.log would print it.
  const run = (table) => matchAudio({ ...paths, fetchText: fetchFrom(table), log: (...args) => lines.push(args.join(" ")) });
  return { dir, paths, lines, run, list: () => JSON.parse(fs.readFileSync(paths.sourcesPath, "utf8")).recordings };
}

test("a run writes the list and the report, and a repeat run changes nothing", async (t) => {
  const w = workspace(t);
  const first = await w.run(source(item(10)));
  assert.equal(first.changed, true);
  assert.equal(w.lines[0], "Source: 1 items from 1 chapters", "each line is logged on its own");
  assert.ok(w.list().some((r) => r.dua_id === 4 && r.part === 1 && r.candidates[0].item === 10 && r.text_sha === textSha(DUA_4)));
  const bytes = fs.readFileSync(w.paths.sourcesPath);
  const second = await w.run(source(item(10)));
  assert.equal(second.changed, false);
  assert.deepEqual(fs.readFileSync(w.paths.sourcesPath), bytes);
  assert.ok(fs.readFileSync(first.reportPath, "utf8").includes("Audio match review"));
});

test("Windows line endings in the list are not a change", async (t) => {
  const w = workspace(t);
  await w.run(source(item(10)));
  fs.writeFileSync(w.paths.sourcesPath, fs.readFileSync(w.paths.sourcesPath, "utf8").replace(/\n/g, "\r\n"));
  assert.equal((await w.run(source(item(10)))).changed, false);
});

test("the report shows source text as plain text, with a player and both decision lines", async (t) => {
  const w = workspace(t);
  const hostile = `${DUA_4} <script>alert(1)</script><img src=x onerror=alert(2)>`;
  const r = await w.run(source(item(10, hostile)));
  const html = fs.readFileSync(r.reportPath, "utf8");
  assert.ok(!html.includes("<script>") && !html.includes("<img"), "markup is escaped");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes('<audio controls preload="none" src="https://www.hisnmuslim.com/audio/ar/10.mp3">'));
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes("&quot;decision&quot;:&quot;approve&quot;") && html.includes("&quot;decision&quot;:&quot;reject&quot;"));
  assert.ok(html.includes(textSha(hostile)), "the item hash is filled in");
});

test("a failed download leaves the list as it was", async (t) => {
  const w = workspace(t);
  await w.run(source(item(10)));
  const bytes = fs.readFileSync(w.paths.sourcesPath);
  const broken = source(item(11));
  delete broken[chapterUrl(1)];
  await assert.rejects(w.run(broken), /500/);
  assert.deepEqual(fs.readFileSync(w.paths.sourcesPath), bytes);
});

test("a bad decision or a missing review file fails and writes no list", async (t) => {
  const w = workspace(t, { review: [{ dua_id: 4, part: 9, item: 10, decision: "approve", text_sha: textSha("a"), item_sha: textSha("b") }] });
  await assert.rejects(w.run(source(item(10))), /has no part 9/);
  assert.equal(fs.existsSync(w.paths.sourcesPath), false);
  fs.rmSync(w.paths.reviewPath);
  await assert.rejects(w.run(source(item(10))), /audio-review\.json/);
});

test("parts that lose their recording, unreadable chapters and bad addresses are named", async (t) => {
  const w = workspace(t);
  await w.run(source(item(10)));
  const table = source({ ...item(11), AUDIO: "http://other.example/11.mp3" });
  table[INDEX_URL] = body({ English: [{ ID: 1 }, { ID: 126 }] });
  table[chapterUrl(126)] = "not data";
  w.lines.length = 0;
  const r = await w.run(table);
  const out = w.lines.join("\n");
  assert.match(out, /Chapter 126 could not be read/);
  assert.match(out, /Item 11 has an unexpected audio address/);
  assert.match(out, /Lost its recording: dua 4 part 1/);
  assert.deepEqual(r.recordings, []);
});

test("a reviewed rejection stays out on the next run", async (t) => {
  const w = workspace(t);
  await w.run(source(item(10)));
  const listed = w.list().filter((r) => r.candidates.some((c) => c.item === 10));
  const rejects = listed.map((r) => ({ dua_id: r.dua_id, part: r.part, item: 10, decision: "reject", text_sha: r.text_sha, item_sha: textSha(DUA_4) }));
  fs.writeFileSync(w.paths.reviewPath, JSON.stringify(rejects));
  await w.run(source(item(10)));
  assert.deepEqual(w.list(), []);
});

test("whole verses are listed, and losing them is named while the recording stays", async (t) => {
  const w = workspace(t);
  await w.run({ ...source(item(10)), [TANZIL_URL]: quranText({ first: DUA_4 }) });
  const dua4 = () => w.list().find((r) => r.dua_id === 4 && r.part === 1);
  assert.deepEqual(dua4().quran, { from: "1:1", to: "1:1", coverage: "full", approved: false });
  assert.ok(w.lines.some((l) => l.startsWith("With Quran verses: 1 parts, 0 of them")));
  w.lines.length = 0;
  await w.run(source(item(10)));
  assert.equal(dua4().quran, null);
  assert.match(w.lines.join("\n"), /Lost its Quran verses: dua 4 part 1/);
  assert.doesNotMatch(w.lines.join("\n"), /Lost its recording/);
});

test("a failed or truncated Quran download leaves the list as it was", async (t) => {
  const w = workspace(t);
  await w.run(source(item(10)));
  const bytes = fs.readFileSync(w.paths.sourcesPath);
  const missing = source(item(11));
  delete missing[TANZIL_URL];
  await assert.rejects(w.run(missing), /500/);
  await assert.rejects(w.run({ ...source(item(11)), [TANZIL_URL]: quranText({ verses: 6000 }) }), /6000 verses.*--cached/s);
  assert.deepEqual(fs.readFileSync(w.paths.sourcesPath), bytes);
});

test("the download cache is written, and reused only when asked", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audio-cache-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  let calls = 0;
  const get = async () => `body ${++calls}`;
  assert.equal(await cachingFetch(dir, { get })("u", "a.json"), "body 1");
  assert.equal(await cachingFetch(dir, { get, cached: true })("u", "a.json"), "body 1");
  assert.equal(await cachingFetch(dir, { get })("u", "a.json"), "body 2");
  assert.equal(await cachingFetch(dir, { get, cached: true })("u", "b.json"), "body 3", "not cached yet");
  const failing = cachingFetch(dir, { get: async () => { throw new Error("offline"); } });
  await assert.rejects(failing("https://x.example/y", "y.json"), /x\.example.*offline/);
  assert.equal(fs.existsSync(path.join(dir, "y.json")), false);
});
