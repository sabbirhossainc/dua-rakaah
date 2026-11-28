import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryHref,
  categorySlug,
  groupBySubcategory,
  groupDuas,
  langPrefix,
  legacyCategoryId,
  parseCat,
  pick,
  langFromPathname,
  switchLanguageHref,
} from "./content.js";

const CATEGORY_NAMES = [
  ["Dua's Importance", "duas-importance"],
  ["Dua's Excellence", "duas-excellence"],
  ["Time of Dua", "time-of-dua"],
  ["Dua Acceptance", "dua-acceptance"],
  ["Morning & Evening", "morning-evening"],
  ["Sleep", "sleep"],
  ["Clothing", "clothing"],
  ["Home", "home"],
  ["Toilet", "toilet"],
  ["Adhaan & Iqamah", "adhaan-iqamah"],
];

test("categorySlug covers all 10 category names", () => {
  for (const [name, slug] of CATEGORY_NAMES) assert.equal(categorySlug(name), slug, name);
  assert.equal(new Set(CATEGORY_NAMES.map(([n]) => categorySlug(n))).size, 10);
});

test("an earlier slug finds its category, and nothing else does", () => {
  assert.equal(legacyCategoryId("cloths"), 7);
  for (const slug of ["clothing", "sleep", "", "__proto__", "constructor"]) assert.equal(legacyCategoryId(slug), null, slug);
});

test("categorySlug strips curly apostrophes and trims hyphens", () => {
  assert.equal(categorySlug("Dua’s  Importance!"), "duas-importance");
});

test("categoryHref uses the language prefix", () => {
  const cat = { cat_id: 6, cat_name_en: "Sleep" };
  assert.equal(categoryHref(cat, "en"), "/duas/sleep?cat=6");
  assert.equal(categoryHref(cat, "bn"), "/bn/duas/sleep?cat=6");
  assert.equal(langPrefix("en"), "");
  assert.equal(langPrefix("bn"), "/bn");
});

test("parseCat accepts only a single positive integer string", () => {
  assert.equal(parseCat("5"), 5);
  assert.equal(parseCat("10"), 10);
  for (const bad of ["0", "abc", "5.0", "", "05", "-1", " 5", undefined, null, ["6", "5"], ["6"]]) {
    assert.equal(parseCat(bad), null, JSON.stringify(bad));
  }
});

test("pick returns the language column, null for NULL/blank, never the other language", () => {
  const row = { translation_en: "Hello", translation_bn: null, top_en: "   ", top_bn: "x" };
  assert.equal(pick(row, "translation", "en"), "Hello");
  assert.equal(pick(row, "translation", "bn"), null);
  assert.equal(pick(row, "top", "en"), null);
  assert.equal(pick(row, "top", "bn"), "x");
  assert.equal(pick(row, "missing", "en"), null);
});

const base = { cat_id: 1, subcat_id: 1 };
const row = (o) => ({
  ...base,
  dua_name_en: null,
  top_en: null,
  dua_arabic: null,
  transliteration_en: null,
  translation_en: null,
  bottom_en: null,
  refference_en: null,
  ...o,
});

test("groupDuas: one part for a single-row dua (id 4)", () => {
  const groups = groupDuas(
    [row({ id: 4, dua_id: 4, dua_name_en: "Allah's guidance #1", dua_arabic: "A", refference_en: "1:5" })],
    "en"
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].title, "Allah's guidance #1");
  assert.equal(groups[0].parts.length, 1);
  assert.equal(groups[0].parts[0].reference, "1:5");
  assert.equal(groups[0].parts[0].top, null);
});

test("groupDuas: two parts, reference on the second (id 40)", () => {
  const groups = groupDuas(
    [
      row({ id: 40, dua_id: 39, dua_name_en: "Last part of night", top_en: "t1" }),
      row({ id: 40, dua_id: 39, dua_arabic: "B", refference_en: "Bukhari" }),
    ],
    "en"
  );
  assert.equal(groups.length, 1);
  assert.equal(groups[0].parts.length, 2);
  assert.equal(groups[0].parts[0].reference, null);
  assert.equal(groups[0].parts[1].reference, "Bukhari");
});

test("groupDuas: five parts keep input order, title from the first (id 123)", () => {
  const arabic = ["a", "b", "c", "d", "e"];
  const rows = arabic.map((a, i) =>
    row({ id: 123, dua_id: 94, subcat_id: 12, dua_name_en: i === 0 ? "Tasbeeh" : null, dua_arabic: a })
  );
  const groups = groupDuas([row({ id: 4, dua_id: 4, dua_name_en: "x" }), ...rows], "en");
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups[1].parts.map((p) => p.arabic),
    arabic
  );
  assert.equal(groups[1].title, "Tasbeeh");
});

test("groupDuas: title comes from a later part when the first has no name", () => {
  const groups = groupDuas(
    [row({ id: 9, dua_id: 9 }), row({ id: 9, dua_id: 9, dua_name_en: "Late name" })],
    "en"
  );
  assert.equal(groups[0].title, "Late name");
});

test("groupDuas: Arabic is kept exactly as stored", () => {
  const stored = "  بِسْمِ\nاللَّهِ ";
  const groups = groupDuas([row({ id: 1, dua_id: 1, dua_arabic: stored })], "en");
  assert.equal(groups[0].parts[0].arabic, stored);
});

test("groupBySubcategory orders subcategories and duas, and keeps empty subcategories", () => {
  const subcats = [
    { subcat_id: 15, subcat_name_en: "After" },
    { subcat_id: 14, subcat_name_en: "Before" },
    { subcat_id: 99, subcat_name_en: "Empty" },
  ];
  const duas = [
    { id: 3, subcat_id: 15, dua_id: 3 },
    { id: 2, subcat_id: 14, dua_id: 20 },
    { id: 1, subcat_id: 14, dua_id: 10 },
  ];
  const out = groupBySubcategory(subcats, duas);
  assert.deepEqual(out.map((g) => g.subcat.subcat_id), [14, 15, 99]);
  assert.deepEqual(out[0].duas.map((d) => d.id), [1, 2]);
  assert.deepEqual(out[2].duas, []);
});

test("switchLanguageHref swaps the prefix and keeps query and fragment", () => {
  assert.equal(switchLanguageHref("/duas/sleep", "?cat=6", "#dua-200", "bn"), "/bn/duas/sleep?cat=6#dua-200");
  assert.equal(switchLanguageHref("/bn/duas/sleep", "?cat=6", "#dua-200", "en"), "/duas/sleep?cat=6#dua-200");
  assert.equal(switchLanguageHref("/duas/sleep", "cat=6", "dua-200", "bn"), "/bn/duas/sleep?cat=6#dua-200");
  assert.equal(switchLanguageHref("/duas", "", "", "bn"), "/bn/duas");
  assert.equal(switchLanguageHref("/bn/duas", "", "", "en"), "/duas");
  assert.equal(switchLanguageHref("/duas/sleep", "?cat=6", "", "en"), "/duas/sleep?cat=6");
});

test("switchLanguageHref: the bookmark page has both languages", () => {
  assert.equal(switchLanguageHref("/bookmark", "", "", "bn"), "/bn/bookmark");
  assert.equal(switchLanguageHref("/bn/bookmark", "", "", "en"), "/bookmark");
  assert.equal(switchLanguageHref("/bookmarks", "", "", "bn"), "/bn/duas");
});

test("switchLanguageHref: / and /bn are each other's other-language page", () => {
  assert.equal(switchLanguageHref("/", "", "", "bn"), "/bn");
  assert.equal(switchLanguageHref("/bn", "", "", "en"), "/");
  assert.equal(switchLanguageHref("/bn", "", "", "bn"), "/bn");
  assert.equal(switchLanguageHref("/", "", "", "en"), "/");
  assert.equal(switchLanguageHref("/", "?a=1", "#x", "bn"), "/bn?a=1#x");
  assert.equal(switchLanguageHref("/bnx", "", "", "bn"), "/bn/duas");
  assert.equal(langFromPathname("/bn"), "bn");
});

test("switchLanguageHref: the information pages have a Bangla pair", () => {
  for (const page of ["/about", "/privacy-policy", "/general-feedbacks"]) {
    assert.equal(switchLanguageHref(page, "", "", "bn"), `/bn${page}`);
    assert.equal(switchLanguageHref(`/bn${page}`, "", "", "en"), page);
  }
});

test("switchLanguageHref: pages without a Bangla version", () => {
  assert.equal(switchLanguageHref("/support", "", "", "bn"), "/bn/duas");
  assert.equal(switchLanguageHref("/support", "", "", "en"), "/support");
  assert.equal(switchLanguageHref("/duasomething", "", "", "bn"), "/bn/duas");
});

test("langFromPathname reads the language from the path prefix", () => {
  assert.equal(langFromPathname("/bn"), "bn");
  assert.equal(langFromPathname("/bn/duas"), "bn");
  assert.equal(langFromPathname("/bn/duas/sleep"), "bn");
  assert.equal(langFromPathname("/duas/sleep"), "en");
  assert.equal(langFromPathname("/"), "en");
  assert.equal(langFromPathname("/bnx/duas"), "en");
  assert.equal(langFromPathname("/support"), "en");
  assert.equal(langFromPathname(undefined), "en");
});
