import test from "node:test";
import assert from "node:assert/strict";
import { buildRecordings } from "./build.js";
import { createLocator } from "./quran.js";
import { renderReport } from "./report.js";

// Invented texts: no text of any source.
const A = "ابجدهوزحطيكلمنسعفصقر";
const verse = (sura, aya, arabic) => ({ sura, aya, key: `${sura}:${aya}`, line: `${sura}|${aya}|${arabic}`, arabic });
const page = (verses, arabic, decisions = []) => {
  const parts = [{ dua_id: 4, cat_id: 1, title: "<b>title</b>", part: 1, arabic }];
  const built = buildRecordings({ parts, items: [], decisions, quran: createLocator(verses) });
  return { built, html: renderReport({ report: built.report, stale: built.stale, summary: [] }) };
};

test("a verse candidate shows both texts, its keys, its coverage and the two lines to copy", () => {
  const { built, html } = page([verse(2, 1, `${A} <script>x</script>`)], A.slice(0, 12));
  assert.ok(!html.includes("<script>") && !html.includes("<b>title"), "markup is escaped");
  assert.ok(html.includes("Quran 2:1"));
  assert.ok(html.includes(A.slice(0, 12)) && html.includes(`${A} &lt;script&gt;`));
  assert.ok(html.includes('dir="rtl"'));
  assert.ok(html.includes("the verses hold more than the card"));
  assert.ok(html.includes("Needs review (1)"));
  assert.ok(html.includes("&quot;verses&quot;:&quot;2:1-2:1&quot;,&quot;decision&quot;:&quot;approve&quot;"));
  assert.ok(html.includes("&quot;decision&quot;:&quot;reject&quot;"));
  assert.ok(html.includes(built.report[0].verses.entries[0].verses_sha));
  assert.ok(html.includes('href="https://tanzil.net"'));
  assert.ok(!html.includes("<audio"));
});

test("only a few of many places are shown, with how many there are", () => {
  const verses = Array.from({ length: 8 }, (_, i) => verse(2, i + 1, A));
  const { html } = page(verses, A.slice(0, 12));
  assert.ok(html.includes("Found in 8 places; showing 3."));
  assert.equal(html.match(/<h4>Verses \(Tanzil\)<\/h4>/g).length, 3);
});

test("an out-of-date verse decision is listed", () => {
  const decision = { dua_id: 4, part: 1, verses: "2:1-2:1", decision: "approve", text_sha: "0".repeat(64), verses_sha: "0".repeat(64) };
  const { html } = page([verse(2, 1, A)], A.slice(0, 12), [decision]);
  assert.ok(html.includes("verses 2:1-2:1 (approve)"));
});
