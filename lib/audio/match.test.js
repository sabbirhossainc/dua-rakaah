import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic } from "./arabic.js";
import { ACCEPT_AT, REPORT_AT, REVIEW_AT, compare, isAutoAccepted, isReportable, needsReview } from "./match.js";

test("vowel marks, punctuation, spacing, digits and tatweel do not matter", () => {
  const marked = "سُبْحَـانَ اللَّهِ، وَبِحَمْدِهِ. (١٠٠)\n";
  const bare = "سبحانالله وبحمده";
  assert.equal(normalizeArabic(marked), normalizeArabic(bare));
  assert.equal(compare(normalizeArabic(marked), normalizeArabic(bare)).likeness, 1);
});

test("spelling variants of one letter compare as equal", () => {
  const pairs = [
    ["أإآٱ", "اااا"],
    ["ىی", "يي"],
    ["ئؤ", "يو"],
    ["ةھہ", "ههه"],
    ["ک", "ك"],
  ];
  for (const [a, b] of pairs) assert.equal(normalizeArabic(a), normalizeArabic(b), a);
});

test("a hamza written as a combining mark equals the single letter", () => {
  assert.equal(normalizeArabic("أ"), normalizeArabic("أ"));
});

test("Quran brackets, annotation letters, direction marks and Latin text are dropped", () => {
  assert.equal(normalizeArabic("﴿‏قُلْۥ abc 12﴾ۚ"), "قل");
});

test("presentation forms are folded into letters", () => {
  assert.equal(normalizeArabic("ﻻ"), "لا");
});

test("a hamza on its own is a letter and stays", () => {
  assert.equal(normalizeArabic("شيء"), "شيء");
});

test("a missing text normalizes to nothing and matches nothing", () => {
  for (const value of [null, undefined, 7, "", "  . "]) assert.equal(normalizeArabic(value), "");
  assert.deepEqual(compare("", "ابجد"), { likeness: 0, contained: 0 });
  assert.deepEqual(compare("ابجد", ""), { likeness: 0, contained: 0 });
});

test("likeness is one minus the edit distance over the longer text", () => {
  assert.equal(compare("ابجد", "ابجد").likeness, 1);
  assert.equal(compare("ابجد", "ابجه").likeness, 0.75);
  assert.equal(compare("ابج", "ابجد").likeness, 0.75);
  assert.equal(compare("ابجد", "ابج").likeness, 0.75, "the order of the two texts does not matter");
});

test("an item that holds the part and another sentence of the same length", () => {
  const part = "سبحاناللهوبحمده";
  const item = part + "ظظظظظظظظظظظظظظظظ".slice(0, part.length);
  const figures = compare(part, item);
  assert.equal(figures.contained, 1);
  assert.equal(figures.likeness, 0.5);
  assert.equal(isAutoAccepted(figures), false);
  assert.equal(needsReview(figures), true);
});

test("the contained figure counts edits inside the best stretch", () => {
  assert.equal(compare("ابجد", "ظظابهدظظ").contained, 0.75);
});

test("the three thresholds are inclusive", () => {
  assert.deepEqual([ACCEPT_AT, REVIEW_AT, REPORT_AT], [0.95, 0.85, 0.6]);
  const f = (likeness, contained = 0) => ({ likeness, contained });
  assert.equal(isAutoAccepted(f(0.95)), true);
  assert.equal(isAutoAccepted(f(0.9499999)), false);
  assert.equal(isAutoAccepted(f(0.5, 1)), false);
  assert.equal(needsReview(f(0.95)), false);
  assert.equal(needsReview(f(0.85)), true);
  assert.equal(needsReview(f(0.3, 0.85)), true);
  assert.equal(needsReview(f(0.8499, 0.8499)), false);
  assert.equal(isReportable(f(0.6)), true);
  assert.equal(isReportable(f(0, 0.6)), true);
  assert.equal(isReportable(f(0.5999, 0.5999)), false);
});

test("real lengths: 19 of 20 letters alike is accepted, 18 is not", () => {
  const base = "ابجدهوزحطيكلمنسعفصقر";
  assert.equal(base.length, 20);
  assert.equal(isAutoAccepted(compare(base, base.slice(0, 19) + "ظ")), true);
  assert.equal(isAutoAccepted(compare(base, base.slice(0, 18) + "ظظ")), false);
});
