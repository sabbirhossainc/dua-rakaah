import test from "node:test";
import assert from "node:assert/strict";
import { buildContentIndex, resolveBookmarks, resolveMemorize } from "./content-index.js";
import { groupDuas } from "./content.js";

const categories = [
  { cat_id: 5, cat_name_en: "Morning & Evening", cat_name_bn: "সকাল ও সন্ধ্যা" },
  { cat_id: 6, cat_name_en: "Sleep", cat_name_bn: null },
];
const row = (over) => ({
  id: 1, cat_id: 5, subcat_id: 1, dua_id: 1,
  dua_name_en: "A", dua_name_bn: "ক", dua_arabic: "x", ...over,
});
const duaRows = [
  row({ id: 10, dua_name_en: "Morning dua", dua_name_bn: "সকালের দোয়া" }),
  row({ id: 200, cat_id: 6, dua_name_en: "Tasbih", dua_name_bn: "তাসবিহ" }),
  row({ id: 200, cat_id: 6, dua_name_en: null, dua_name_bn: null }), // second part of dua 200
  row({ id: 201, cat_id: 6, dua_name_en: null, dua_name_bn: null }), // no title in either language
  row({ id: 300, cat_id: 99, dua_name_en: "Orphan" }), // unknown category
];

test("one entry per dua, with the title of that language", () => {
  const en = buildContentIndex({ categories, duaRows }, "en");
  assert.deepEqual(en.duas, [[10, "Morning dua", 5], [200, "Tasbih", 6], [201, "Dua 201", 6]]);
  const bn = buildContentIndex({ categories, duaRows }, "bn");
  assert.deepEqual(bn.duas.slice(0, 2), [[10, "সকালের দোয়া", 5], [200, "তাসবিহ", 6]]);
  assert.match(bn.duas[2][1], /201/);
  assert.notEqual(bn.duas[2][1], en.duas[2][1]);
});

test("the title rule is the one the cards use", () => {
  const index = buildContentIndex({ categories, duaRows }, "en");
  const grouped = groupDuas(duaRows, "en");
  for (const [id, title] of index.duas) {
    const g = grouped.find((d) => d.id === id);
    assert.equal(title, g.title ?? `Dua ${id}`);
  }
});

test("categories carry a name and the category page link in the page language", () => {
  const en = buildContentIndex({ categories, duaRows }, "en");
  assert.deepEqual(en.categories[5], { name: "Morning & Evening", href: "/duas/morning-evening?cat=5" });
  const bn = buildContentIndex({ categories, duaRows }, "bn");
  assert.deepEqual(bn.categories[5], { name: "সকাল ও সন্ধ্যা", href: "/bn/duas/morning-evening?cat=5" });
  // A category with no Bangla name falls back to the English one, never to a blank.
  assert.equal(bn.categories[6].name, "Sleep");
});

test("resolveBookmarks keeps the order, builds the links and drops unknown duas", () => {
  const en = buildContentIndex({ categories, duaRows }, "en");
  const list = resolveBookmarks([{ dua_id: 200 }, { dua_id: 7777 }, { dua_id: 10 }], en);
  assert.deepEqual(list, [
    { id: 200, title: "Tasbih", category: "Sleep", href: "/duas/sleep?cat=6#dua-200" },
    { id: 10, title: "Morning dua", category: "Morning & Evening", href: "/duas/morning-evening?cat=5#dua-10" },
  ]);
  const bn = buildContentIndex({ categories, duaRows }, "bn");
  assert.equal(resolveBookmarks([{ dua_id: 10 }], bn)[0].href, "/bn/duas/morning-evening?cat=5#dua-10");
});

test("no bookmarks gives an empty list", () => {
  assert.deepEqual(resolveBookmarks([], buildContentIndex({ categories, duaRows }, "en")), []);
});

// ---- memorize (design D7) ----

const mrec = (dua_id, learned, progress, reset_gen = 0) => ({ dua_id, learned, progress, reset_gen });

test("memorize: started duas split into in progress (high to low, then number) and learned (by number)", () => {
  const index = buildContentIndex({ categories, duaRows }, "en");
  const out = resolveMemorize(
    [mrec(201, 0, 25), mrec(200, 1, 100), mrec(10, 0, 75), mrec(300, 0, 25)],
    index
  );
  assert.deepEqual(out.inProgress.map((e) => [e.id, e.progress]), [[10, 75], [201, 25]]);
  assert.deepEqual(out.learned.map((e) => e.id), [200]);
  assert.equal(out.learned[0].learned, true);
});

test("memorize: a start-over record and an untouched record are not listed", () => {
  const index = buildContentIndex({ categories, duaRows }, "en");
  const out = resolveMemorize([mrec(10, 0, 0, 3), mrec(200, 0, 0)], index);
  assert.deepEqual(out, { inProgress: [], learned: [] });
});

test("memorize: a dua the content does not have is left out", () => {
  const index = buildContentIndex({ categories, duaRows }, "en");
  assert.deepEqual(resolveMemorize([mrec(9999, 1, 100), mrec(8888, 0, 50)], index), { inProgress: [], learned: [] });
});

test("memorize: entries carry the title, category and a link to the card in the page language", () => {
  const en = resolveMemorize([mrec(200, 0, 50)], buildContentIndex({ categories, duaRows }, "en"));
  assert.equal(en.inProgress[0].title, "Tasbih");
  assert.equal(en.inProgress[0].category, "Sleep");
  assert.match(en.inProgress[0].href, /^\/duas\/.+\?cat=6#dua-200$/);
  const bn = resolveMemorize([mrec(200, 0, 50)], buildContentIndex({ categories, duaRows }, "bn"));
  assert.equal(bn.inProgress[0].title, "তাসবিহ");
  assert.match(bn.inProgress[0].href, /^\/bn\/duas\/.+\?cat=6#dua-200$/);
});

test("memorize: a dua with no title gets the fallback title", () => {
  const out = resolveMemorize([mrec(201, 0, 25)], buildContentIndex({ categories, duaRows }, "en"));
  assert.equal(out.inProgress[0].title, "Dua 201");
});

test("memorize: the records given are not changed or reordered in place", () => {
  const records = [mrec(201, 0, 25), mrec(10, 0, 75)];
  const copy = structuredClone(records);
  resolveMemorize(records, buildContentIndex({ categories, duaRows }, "en"));
  assert.deepEqual(records, copy);
});
