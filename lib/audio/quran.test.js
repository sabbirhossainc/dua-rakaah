import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { PLACES, VERSE_COUNT, createLocator, parseQuran } from "./quran.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const db = new Database(fileURLToPath(new URL("../../data/dua_main.sqlite", import.meta.url)), { readonly: true });
const duaText = (id) => db.prepare("SELECT dua_arabic a FROM dua WHERE id = ? ORDER BY rowid LIMIT 1").get(id).a;
const DUA_4 = duaText(4);
db.close();

// Invented "verses" in Arabic letters: no text of any source is copied here.
const BAS = "بسم الله الرحمن الرحيم";
const A = "ابجدهوزحطيكلمنسعفصقر";
const B = "ققققففففممممننننللللل";
const C = "ددددررررسسسسششششصصصص";
const R = "طططظظظعععغغغ";
const verse = (sura, aya, arabic) => ({ sura, aya, key: `${sura}:${aya}`, line: `${sura}|${aya}|${arabic}`, arabic });
const VERSES = [
  verse(1, 1, BAS),
  verse(1, 2, R),
  verse(2, 1, `${BAS} ${A}`),
  verse(2, 2, B),
  verse(2, 3, R),
  verse(3, 1, `${BAS} ${C}`),
  verse(3, 2, R),
  verse(3, 3, R),
];
const locator = createLocator(VERSES);
const where = (r) => r.places.map((p) => [p.from, p.to, p.coverage]);

test("a surah's opening verses with their basmala are located as whole verses", () => {
  const r = locator.locate(`${BAS} ${A} ﴿١﴾ ${B} ﴿٢﴾`);
  assert.equal(r.auto, true);
  assert.deepEqual(where(r), [["2:1", "2:2", "full"]]);
});

test("the same verses without the basmala are located too, and marks are ignored", () => {
  const r = locator.locate("اَبجدهوزحطيكلمنسعفصقر، " + B);
  assert.deepEqual([r.auto, where(r)], [true, [["2:1", "2:2", "full"]]]);
});

test("the basmala is optional only before the first verse of a surah", () => {
  const r = locator.locate(`${BAS} ${B}`);
  assert.equal(r.auto, false);
});

test("a part that is the basmala alone is verse 1:1", () => {
  assert.deepEqual(where(locator.locate(BAS)), [["1:1", "1:1", "full"]]);
});

test("a part inside a longer verse needs a person", () => {
  const r = locator.locate(A.slice(3, 15));
  assert.equal(r.auto, false);
  assert.deepEqual(where(r), [["2:1", "2:1", "partial"]]);
});

test("a repeated verse needs a person, and only some places are listed", () => {
  const r = locator.locate(R);
  assert.equal(r.auto, false);
  assert.equal(r.total, 4);
  assert.equal(r.places.length, PLACES);
  assert.ok(r.places.every((p) => p.coverage === "full"));
});

test("a run never crosses surahs", () => {
  const r = locator.locate(`${R} ${A}`); // 1:2 followed by 2:1
  assert.equal(r.auto, false);
  assert.ok(r.places.every((p) => p.from.split(":")[0] === p.to.split(":")[0]));
});

test("one differing letter needs a person", () => {
  const r = locator.locate(`${A} ${B.slice(0, -1)}ظ`);
  assert.equal(r.auto, false);
  assert.deepEqual([r.places[0].from, r.places[0].to], ["2:1", "2:2"]);
  assert.ok(r.places[0].likeness >= 0.95 && r.places[0].likeness < 1);
});

test("a near run that holds more than the part says so", () => {
  const r = locator.locate(B.slice(0, -3) + "ظ");
  assert.deepEqual(where(r), [["2:2", "2:2", "partial"]]);
});

test("words that are not in the text are not accepted, even if some are", () => {
  const r = locator.locate(`${B} هذاكلامليسفيالنصابداومطلقا ${C}`);
  assert.deepEqual([r.auto, r.places], [false, []]);
});

test("text without Arabic letters is nowhere", () => {
  assert.deepEqual(locator.locate("123 ..."), { auto: false, places: [], total: 0 });
  assert.deepEqual(locator.locate(null), { auto: false, places: [], total: 0 });
});

test("a range gives the downloaded lines, and refuses verses that are not there", () => {
  assert.equal(locator.range("2:2", "2:3").source, `2|2|${B}\n2|3|${R}`);
  for (const [from, to] of [["2:3", "2:2"], ["1:2", "2:1"], ["2:9", "2:9"], ["9:1", "9:1"], ["02:1", "2:1"], ["2", "2"]]) {
    assert.equal(locator.range(from, to), null, `${from}-${to}`);
  }
});

test("measuring a chosen run says whether it holds more than the part", () => {
  assert.deepEqual(locator.measure(`${BAS} ${A}`, "2:1", "2:1"), { coverage: "full", likeness: 1 });
  assert.equal(locator.measure(A.slice(0, 8), "2:1", "2:1").coverage, "partial");
  assert.equal(locator.measure(A, "2:9", "2:9"), null);
});

test("our own dua 4 is located inside a Quran-shaped text", () => {
  const found = createLocator([verse(1, 1, BAS), verse(1, 2, R), verse(1, 3, DUA_4)]).locate(DUA_4);
  assert.deepEqual(where(found), [["1:3", "1:3", "full"]]);
});

test("skipping unlikely runs loses none that is alike enough", () => {
  // A fixed pseudo-random text, so the result is the same on every run.
  let seed = 7;
  const next = (n) => (seed = (seed * 48271) % 2147483647) % n;
  const letters = "ابجدهوزحطي";
  const word = (length) => Array.from({ length }, () => letters[next(letters.length)]).join("");
  const verses = Array.from({ length: 60 }, (_, i) => verse(2, i + 1, word(6 + next(25))));
  const search = createLocator(verses);
  for (let round = 0; round < 150; round++) {
    const from = next(58);
    const text = [...verses.slice(from, from + 1 + next(3)).map((v) => v.arabic).join("")];
    // Change at most a tenth of the letters, so the run stays above the review line.
    for (let edits = 1 + next(Math.max(1, Math.floor(text.length / 10))); edits > 0; edits--) {
      const at = next(text.length);
      text.splice(at, next(2), "ظ");
    }
    const r = search.locate(text.join(""));
    if (r.places.length && r.places[0].likeness === 1) continue;
    const best = Math.max(
      ...verses.flatMap((_, i) => verses.slice(i).map((__, j) => search.measure(text.join(""), verses[i].key, verses[i + j].key).likeness))
    );
    if (best >= 0.85) assert.equal(r.places[0]?.likeness, best, text.join(""));
    else assert.deepEqual(r.places, []);
  }
});

// A download of the right shape: surahs 1 to 113 with one verse, and the rest in surah 114.
function download({ verses = VERSE_COUNT, notice = "#  Copyright (C) Tanzil Project", swap = false } = {}) {
  const lines = [];
  for (let i = 0; i < verses; i++) lines.push(i < 113 ? `${i + 1}|1|${A}` : `114|${i - 112}|${B}`);
  if (swap) [lines[200], lines[201]] = [lines[201], lines[200]];
  return `${lines.join("\r\n")}\r\n\r\n\r\n# PLEASE DO NOT REMOVE\r\n${notice}\r\n`;
}

test("a complete download with its notice is read", () => {
  const verses = parseQuran(download());
  assert.equal(verses.length, VERSE_COUNT);
  assert.deepEqual([verses[0].key, verses[0].line, verses.at(-1).key], ["1:1", `1|1|${A}`, "114:6123"]);
});

test("a download that is short, out of order, without its notice or not the text is refused", () => {
  assert.throws(() => parseQuran(download({ verses: VERSE_COUNT - 1 })), /6235 verses/);
  assert.throws(() => parseQuran(download({ swap: true })), /out of order/);
  assert.throws(() => parseQuran(download({ notice: "#" })), /notice/);
  assert.throws(() => parseQuran("<html>Tanzil Project is busy</html>"), /unexpected line/);
  assert.throws(() => parseQuran(download({ verses: 100 })), /100 verses/);
});
