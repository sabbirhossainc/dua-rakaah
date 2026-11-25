import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { computeBuildRevision } from "./build-revision.js";
import { categoryHref } from "./content.js";
import { FIXED_PAGE_URLS, buildPrecacheEntries } from "./precache.js";

const NAMES = [
  "Dua's Importance",
  "Dua's Excellence",
  "Time of Dua",
  "Dua Acceptance",
  "Morning & Evening",
  "Sleep",
  "Cloths",
  "Home",
  "Toilet",
  "Adhaan & Iqamah",
];
const categories = NAMES.map((cat_name_en, i) => ({ cat_id: i + 1, cat_name_en }));
const urlsOf = (entries) => entries.map((e) => e.url);

test("10 categories give 20 category URLs that are exactly what the sidebar links to", () => {
  const entries = buildPrecacheEntries({ categories, revision: "r1" });
  const categoryUrls = urlsOf(entries).filter((u) => u.includes("?cat="));
  assert.equal(categoryUrls.length, 20);
  const expected = categories.flatMap((c) => [categoryHref(c, "en"), categoryHref(c, "bn")]);
  assert.deepEqual(categoryUrls.sort(), expected.sort());
  assert.ok(categoryUrls.includes("/duas/morning-evening?cat=5"));
  assert.ok(categoryUrls.includes("/bn/duas/sleep?cat=6"));
});

test("the nine fixed pages are included and every entry carries the build revision", () => {
  const entries = buildPrecacheEntries({ categories, revision: "r1" });
  assert.deepEqual(FIXED_PAGE_URLS.sort(), ["/", "/bn/bookmark", "/bn/duas", "/bn/memorize", "/bookmark", "/duas", "/memorize", "/offline", "/support"]);
  for (const url of FIXED_PAGE_URLS) assert.ok(urlsOf(entries).includes(url), url);
  assert.equal(entries.length, 29);
  assert.ok(entries.every((e) => e.revision === "r1"));
});

test("there are no duplicates, no audio and no /api/ URLs", () => {
  const urls = urlsOf(buildPrecacheEntries({ categories, revision: "r1" }));
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.doesNotMatch(url, /\.(?:mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)(?:\?|$)/i, url);
    assert.doesNotMatch(url, /^\/api(?:\/|$)/, url);
  }
});

test("an 11th category adds two URLs", () => {
  const more = [...categories, { cat_id: 11, cat_name_en: "Travel" }];
  const urls = urlsOf(buildPrecacheEntries({ categories: more, revision: "r1" }));
  assert.equal(urls.filter((u) => u.includes("?cat=")).length, 22);
  assert.ok(urls.includes("/duas/travel?cat=11"));
  assert.ok(urls.includes("/bn/duas/travel?cat=11"));
});

test("two categories that would give the same URL are refused", () => {
  const same = [
    { cat_id: 1, cat_name_en: "Sleep" },
    { cat_id: 1, cat_name_en: "Sleep" },
  ];
  assert.throws(() => buildPrecacheEntries({ categories: same, revision: "r1" }), /Duplicate/);
});

function scratch(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "revision-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, "app", "sub"), { recursive: true });
  fs.mkdirSync(path.join(dir, "data"));
  fs.writeFileSync(path.join(dir, "app", "page.js"), "export default 1;");
  fs.writeFileSync(path.join(dir, "app", "sub", "a.js"), "a");
  fs.writeFileSync(path.join(dir, "data", "db.sqlite"), "rows");
  return dir;
}
const INPUTS = ["data/db.sqlite", "app", "missing.txt"];

test("the revision is stable for the same files, and ignores missing inputs", (t) => {
  const dir = scratch(t);
  const a = computeBuildRevision(dir, INPUTS);
  assert.match(a, /^[0-9a-f]{16}$/);
  assert.equal(computeBuildRevision(dir, INPUTS), a);
});

test("the revision changes when a file, the database or a file name changes", (t) => {
  const dir = scratch(t);
  const base = computeBuildRevision(dir, INPUTS);

  fs.writeFileSync(path.join(dir, "app", "sub", "a.js"), "b");
  const edited = computeBuildRevision(dir, INPUTS);
  assert.notEqual(edited, base);

  fs.writeFileSync(path.join(dir, "data", "db.sqlite"), "more rows");
  const db = computeBuildRevision(dir, INPUTS);
  assert.notEqual(db, edited);

  fs.renameSync(path.join(dir, "app", "sub", "a.js"), path.join(dir, "app", "sub", "c.js"));
  assert.notEqual(computeBuildRevision(dir, INPUTS), db);
});

test("test files do not change the revision", (t) => {
  const dir = scratch(t);
  const base = computeBuildRevision(dir, INPUTS);
  fs.writeFileSync(path.join(dir, "app", "page.test.js"), "test('x')");
  assert.equal(computeBuildRevision(dir, INPUTS), base);
});

test("the real project gives one revision, twice", () => {
  const root = path.resolve(import.meta.dirname, "..");
  assert.equal(computeBuildRevision(root), computeBuildRevision(root));
});
