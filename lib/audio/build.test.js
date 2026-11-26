import test from "node:test";
import assert from "node:assert/strict";
import { DecisionError, buildRecordings, coverage, lostRecordings, serializeSources } from "./build.js";
import { listParts, textSha } from "./parts.js";

// Invented texts: 20 letters each, so one changed letter is 5%.
const A = "ابجدهوزحطيكلمنسعفصقر";
const B = "ققققففففممممننننللللل";
const edit = (text, n) => text.slice(0, text.length - n) + "ظ".repeat(n);
const url = (id) => `https://www.hisnmuslim.com/audio/ar/${id}.mp3`;
const item = (id, arabic, address = url(id)) => ({ id, arabic, url: address });
const part = (dua_id, n, arabic, cat_id = 1) => ({ dua_id, cat_id, title: null, part: n, arabic });
const decide = (p, i, decision, extra = {}) => ({
  dua_id: p.dua_id,
  part: p.part,
  item: i.id,
  decision,
  text_sha: textSha(p.arabic),
  item_sha: textSha(i.arabic),
  ...extra,
});
const build = (parts, items, decisions = []) => buildRecordings({ parts, items, decisions });
const itemsOf = (result, i = 0) => result.recordings[i]?.candidates.map((c) => c.item) ?? [];

test("parts are numbered in row order within each dua", () => {
  const row = (id, arabic) => ({ id, cat_id: 2, subcat_id: 1, dua_id: id, dua_arabic: arabic });
  const parts = listParts([row(7, "ا"), row(7, "  "), row(7, "ج"), row(9, "د")]);
  assert.deepEqual(
    parts.map((p) => [p.dua_id, p.part, p.arabic, p.cat_id]),
    [[7, 1, "ا", 2], [7, 2, null, 2], [7, 3, "ج", 2], [9, 1, "د", 2]]
  );
});

test("a near-identical item is listed without a decision, with the part's text hash", () => {
  const p = part(4, 1, A);
  const r = build([p], [item(10, A), item(11, B)]);
  assert.deepEqual(r.recordings, [
    { dua_id: 4, part: 1, text_sha: textSha(A), quran: null, candidates: [{ provider: "hisnmuslim", item: 10, url: url(10), score: 1, approved: false }] },
  ]);
});

test("a part without Arabic text gets no recording and no report row", () => {
  const r = build([part(4, 1, null)], [item(10, A)]);
  assert.deepEqual([r.recordings, r.report], [[], []]);
});

test("a contained but longer item is not listed, and is marked for review", () => {
  const r = build([part(4, 1, A)], [item(10, A + B)]);
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].review, true);
  assert.equal(r.report[0].entries[0].status, "review");
});

test("rejecting an automatic match removes it", () => {
  const p = part(4, 1, A);
  const i = item(10, A);
  const r = build([p], [i], [decide(p, i, "reject")]);
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].entries[0].status, "rejected");
  assert.equal(r.report[0].review, false);
});

test("approving a weak match lists it, marked as approved", () => {
  const p = part(4, 1, A);
  const i = item(10, edit(A, 6));
  assert.deepEqual(build([p], [i]).recordings, []);
  const r = build([p], [i], [decide(p, i, "approve", { note: "listened" })]);
  assert.deepEqual(r.recordings[0].candidates, [{ provider: "hisnmuslim", item: 10, url: url(10), score: 0.7, approved: true }]);
});

test("approving a pair below the report floor lists it too", () => {
  const p = part(4, 1, A);
  const i = item(10, B);
  assert.deepEqual(itemsOf(build([p], [i], [decide(p, i, "approve")])), [10]);
});

test("a decision naming an unknown part, a part without Arabic or an unknown item fails", () => {
  const p = part(4, 1, A);
  const i = item(10, A);
  const parts = [p, part(4, 2, null)];
  for (const bad of [{ part: 3 }, { dua_id: 5 }, { part: 2 }, { item: 99 }]) {
    assert.throws(() => build(parts, [i], [{ ...decide(p, i, "approve"), ...bad }]), DecisionError, JSON.stringify(bad));
  }
});

test("a malformed decision fails", () => {
  const p = part(4, 1, A);
  const i = item(10, A);
  const good = decide(p, i, "approve");
  const bad = [
    { not: "a list" },
    [null],
    [{ ...good, decision: "maybe" }],
    [{ ...good, decision: undefined }],
    [{ ...good, part: "1" }],
    [{ ...good, text_sha: "abc" }],
    [{ ...good, item_sha: undefined }],
    [{ ...good, note: 5 }],
    [{ ...good, decison: "reject" }],
    [good, { ...good, decision: "reject" }],
  ];
  for (const decisions of bad) assert.throws(() => build([p], [i], decisions), DecisionError, JSON.stringify(decisions));
});

test("every problem is reported at once", () => {
  const p = part(4, 1, A);
  const i = item(10, A);
  const good = decide(p, i, "approve");
  try {
    build([p], [i], [{ ...good, item: 98 }, { ...good, item: 99 }]);
    assert.fail("should throw");
  } catch (err) {
    assert.equal(err.problems.length, 2);
  }
});

test("an approval is ignored and reported when the item's text has changed", () => {
  const p = part(4, 1, A);
  const reviewed = item(10, edit(A, 6));
  const decision = decide(p, reviewed, "approve");
  const r = build([p], [item(10, edit(A, 7))], [decision]);
  assert.deepEqual(r.recordings, []);
  assert.deepEqual(r.stale, [decision]);
  assert.equal(r.report[0].entries[0].outdated, true);
});

test("an out-of-date approval on a near-identical pair leaves the automatic acceptance", () => {
  const p = part(4, 1, A);
  const i = item(10, A);
  const r = build([p], [i], [{ ...decide(p, i, "approve"), item_sha: textSha("old") }]);
  assert.deepEqual(itemsOf(r), [10]);
  assert.equal(r.recordings[0].candidates[0].approved, false);
  assert.equal(r.stale.length, 1);
});

test("an out-of-date rejection keeps the pair out and marks it for review", () => {
  const before = part(4, 1, A);
  const i = item(10, A);
  const decision = decide(before, i, "reject");
  const r = build([part(4, 1, A + " .")], [i], [decision]);
  assert.deepEqual(r.recordings, []);
  assert.equal(r.report[0].entries[0].status, "review");
  assert.equal(r.report[0].review, true);
  assert.deepEqual(r.stale, [decision]);
});

test("play order: approved first, then by likeness, then by item", () => {
  const p = part(4, 1, A);
  const weak = item(30, edit(A, 6));
  const r = build([p], [item(21, A), weak, item(20, A), item(10, edit(A, 1))], [decide(p, weak, "approve")]);
  assert.deepEqual(itemsOf(r), [30, 20, 21, 10]);
});

test("an item with a refused address is never listed, even when approved", () => {
  const p = part(4, 1, A);
  const i = item(10, A, null);
  assert.deepEqual(build([p], [i]).recordings, []);
  assert.deepEqual(build([p], [i], [decide(p, i, "approve")]).recordings, []);
});

test("the report shows three closest candidates, review ones first and rejected ones last", () => {
  const p = part(4, 1, A);
  const rejected = item(1, edit(A, 2));
  const items = [rejected, item(2, edit(A, 8)), item(3, edit(A, 6)), item(4, A + B), item(5, edit(A, 7)), item(6, B)];
  const [row] = build([p], items, [decide(p, rejected, "reject")]).report;
  assert.deepEqual(row.entries.map((e) => e.item.id), [4, 3, 5]);
});

test("the list is sorted by dua and part and the same inputs give the same bytes", () => {
  const parts = [part(9, 1, B), part(4, 2, A), part(4, 1, A)];
  const items = [item(11, B), item(10, A)];
  const first = serializeSources(build(parts, items).recordings);
  const second = serializeSources(build([...parts].reverse(), [...items].reverse()).recordings);
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first).recordings.map((r) => [r.dua_id, r.part]), [[4, 1], [4, 2], [9, 1]]);
  assert.ok(first.endsWith("\n"));
});

test("the shipped list holds none of the source's text", () => {
  const out = serializeSources(build([part(4, 1, A)], [item(10, A)]).recordings);
  assert.doesNotMatch(out, /\p{Script=Arabic}/u);
});

test("parts that lose their only recording are named", () => {
  const before = [{ dua_id: 1, part: 1 }, { dua_id: 1, part: 2 }];
  assert.deepEqual(lostRecordings(before, [{ dua_id: 1, part: 2 }]), [{ dua_id: 1, part: 1 }]);
  assert.deepEqual(lostRecordings(before, before), []);
});

test("coverage counts parts and duas with Arabic text, per category", () => {
  const parts = [part(1, 1, A, 1), part(1, 2, B, 1), part(2, 1, null, 1), part(3, 1, A, 2)];
  const c = coverage(parts, [{ dua_id: 1, part: 1 }]);
  assert.deepEqual(c.total, { parts: 3, partsWith: 1, duas: 2, duasWith: 1 });
  assert.deepEqual(c.categories, [
    { cat_id: 1, parts: 2, partsWith: 1, duas: 1, duasWith: 1 },
    { cat_id: 2, parts: 1, partsWith: 0, duas: 1, duasWith: 0 },
  ]);
});
