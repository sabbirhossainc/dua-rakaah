import test from "node:test";
import assert from "node:assert/strict";
import { DecisionError, buildRecordings, lostRecordings, lostVerses, serializeSources } from "./build.js";
import { textSha } from "./parts.js";
import { createLocator } from "./quran.js";

// Invented texts of 20 letters or so: no text of any source.
const A = "ابجدهوزحطيكلمنسعفصقر";
const B = "ققققففففممممننننللللل";
const R = "طططظظظعععغغغثثثخخخذذذ";
const verse = (sura, aya, arabic) => ({ sura, aya, key: `${sura}:${aya}`, line: `${sura}|${aya}|${arabic}`, arabic });
const VERSES = [verse(2, 1, A), verse(2, 2, B), verse(3, 1, R), verse(3, 2, R)];
const quran = createLocator(VERSES);

const part = (dua_id, n, arabic) => ({ dua_id, cat_id: 1, title: null, part: n, arabic });
const url = (id) => `https://www.hisnmuslim.com/audio/ar/${id}.mp3`;
const item = (id, arabic) => ({ id, arabic, url: url(id) });
const build = (parts, { items = [], decisions = [], text = quran } = {}) =>
  buildRecordings({ parts, items, decisions, quran: text });
const decide = (p, verses, decision, extra = {}) => {
  const [from, to] = verses.split("-");
  return {
    dua_id: p.dua_id,
    part: p.part,
    verses,
    decision,
    text_sha: textSha(p.arabic),
    verses_sha: textSha(quran.range(from, to).source),
    ...extra,
  };
};
const shipped = (from, to, coverage, approved = false) => ({ from, to, coverage, approved });

test("whole verses are accepted, and a part with nothing else is listed with its keys and no address", () => {
  const p = part(4, 1, `${A} ${B}`);
  const r = build([p]);
  assert.deepEqual(r.recordings, [
    { dua_id: 4, part: 1, text_sha: textSha(p.arabic), quran: shipped("2:1", "2:2", "full"), candidates: [] },
  ]);
  assert.equal(r.report[0].accepted, true);
  assert.equal(r.report[0].review, false);
  assert.equal(r.report[0].verses.entries[0].status, "auto");
});

test("verses sit beside a part's other recordings", () => {
  const r = build([part(4, 1, A)], { items: [item(10, A)] });
  assert.deepEqual(r.recordings[0].quran, shipped("2:1", "2:1", "full"));
  assert.deepEqual(r.recordings[0].candidates.map((c) => c.item), [10]);
});

test("part of a verse is reported for review and not listed", () => {
  const r = build([part(4, 1, A.slice(0, 12))]);
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].review, true);
  assert.deepEqual(r.report[0].verses.entries.map((e) => [e.from, e.coverage, e.status]), [["2:1", "partial", "review"]]);
});

test("approving part of a verse lists it as covering more, approved by a person", () => {
  const p = part(4, 1, A.slice(0, 12));
  const r = build([p], { decisions: [decide(p, "2:1-2:1", "approve", { note: "checked" })] });
  assert.deepEqual(r.recordings[0].quran, shipped("2:1", "2:1", "partial", true));
  assert.equal(r.report[0].review, false);
});

test("approving verses the search did not find lists them too", () => {
  const p = part(4, 1, A);
  const r = build([p], { decisions: [decide(p, "3:1-3:2", "approve")] });
  assert.deepEqual(r.recordings[0].quran, shipped("3:1", "3:2", "partial", true));
});

test("rejecting an automatic verse match removes it", () => {
  const p = part(4, 1, A);
  const r = build([p], { decisions: [decide(p, "2:1-2:1", "reject")] });
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].verses.entries[0].status, "rejected");
  assert.equal(r.report[0].review, false);
});

test("a repeated verse is listed only once a person picks the place", () => {
  const p = part(4, 1, R);
  assert.deepEqual(build([p]).recordings, []);
  const r = build([p], { decisions: [decide(p, "3:2-3:2", "approve")] });
  assert.deepEqual(r.recordings[0].quran, shipped("3:2", "3:2", "full", true));
});

test("two approved runs for one part stop the build", () => {
  const p = part(4, 1, R);
  const decisions = [decide(p, "3:1-3:1", "approve"), decide(p, "3:2-3:2", "approve")];
  assert.throws(() => build([p], { decisions }), /only one run of verses.*3:1-3:1 and 3:2-3:2/s);
});

test("a decision naming verses that do not exist, or malformed, stops the build", () => {
  const p = part(4, 1, A);
  const good = decide(p, "2:1-2:1", "approve");
  const bad = [
    { ...good, verses: "2:9-2:9" },
    { ...good, verses: "2:2-2:1" },
    { ...good, verses: "2:1-3:1" },
    { ...good, verses: "2:1" },
    { ...good, verses: 21 },
    { ...good, item: 10 },
    { ...good, verses_sha: "abc" },
    { ...good, item_sha: textSha("x") },
    { ...good, part: 5 },
  ];
  for (const d of bad) assert.throws(() => build([p], { items: [item(10, A)], decisions: [d] }), DecisionError, JSON.stringify(d));
  assert.throws(() => build([p], { decisions: [good, { ...good, decision: "reject" }] }), /second decision/);
  assert.throws(() => build([p], { decisions: [good], text: null }), DecisionError);
});

test("an approval is ignored and reported when the verses' text has changed", () => {
  const p = part(4, 1, A.slice(0, 12));
  const stale = { ...decide(p, "2:1-2:1", "approve"), verses_sha: textSha("older text") };
  const r = build([p], { decisions: [stale] });
  assert.deepEqual(r.recordings, []);
  assert.deepEqual(r.stale, [stale]);
  assert.equal(r.report[0].verses.entries[0].outdated, true);
});

test("an out-of-date rejection keeps the verses out and asks for review", () => {
  const p = part(4, 1, A);
  const stale = { ...decide(p, "2:1-2:1", "reject"), text_sha: textSha("older card") };
  const r = build([p], { decisions: [stale] });
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].verses.entries[0].status, "review");
  assert.equal(r.report[0].review, true);
});

test("item decisions and verse decisions apply side by side", () => {
  const p = part(4, 1, A);
  const items = [item(10, A)];
  const itemReject = {
    dua_id: 4,
    part: 1,
    item: 10,
    decision: "reject",
    text_sha: textSha(A),
    item_sha: textSha(A),
  };
  const r = build([p], { items, decisions: [itemReject] });
  assert.deepEqual([r.recordings[0].candidates, r.recordings[0].quran.from], [[], "2:1"]);
});

test("the list is version 2, holds no source text and repeats byte for byte", () => {
  const parts = [part(9, 1, B), part(4, 1, `${A} ${B}`)];
  const first = serializeSources(build(parts, { items: [item(10, B)] }).recordings);
  const second = serializeSources(build([...parts].reverse(), { items: [item(10, B)] }).recordings);
  assert.equal(first, second);
  assert.equal(JSON.parse(first).version, 2);
  assert.doesNotMatch(first, /\p{Script=Arabic}/u);
});

test("lost verses are named when another recording stays, and a lost recording when nothing does", () => {
  const v = shipped("2:1", "2:1", "full");
  const before = [
    { dua_id: 1, part: 1, quran: v, candidates: [{}] },
    { dua_id: 2, part: 1, quran: v, candidates: [] },
    { dua_id: 3, part: 1, quran: v, candidates: [] },
  ];
  const after = [{ dua_id: 1, part: 1, quran: null, candidates: [{}] }, before[2]];
  assert.deepEqual(lostVerses(before, after), [{ dua_id: 1, part: 1 }]);
  assert.deepEqual(lostRecordings(before, after), [{ dua_id: 2, part: 1 }]);
});
