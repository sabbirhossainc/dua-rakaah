import test from "node:test";
import assert from "node:assert/strict";
import { categoryHref } from "../lib/content.js";
import { FIXED_PAGE_URLS } from "../lib/precache.js";
import { checkPrecache, parseWorker } from "./check-precache.mjs";

const categories = [
  { cat_id: 1, cat_name_en: "Dua's Importance" },
  { cat_id: 6, cat_name_en: "Sleep" },
];
const staticFiles = ["chunks/a.js", "chunks/b.css", "media/f.woff2", "chunks/a.js.map"];
const publicFiles = ["icons/home.svg", "images/sleep.svg", "images/home-pattern.svg", "notes.txt"];

function goodUrls() {
  return [
    ...categories.flatMap((c) => [categoryHref(c, "en"), categoryHref(c, "bn")]),
    ...FIXED_PAGE_URLS,
    "/_next/static/chunks/a.js",
    "/_next/static/chunks/b.css",
    "/_next/static/media/f.woff2",
    "/icons/home.svg",
    "/images/sleep.svg",
    "/images/home-pattern.svg",
  ];
}
const run = (urls) => checkPrecache({ urls, categories, staticFiles, publicFiles });

test("a correct list has no problems", () => {
  assert.deepEqual(run(goodUrls()), []);
});

test("a missing category page is reported", () => {
  const problems = run(goodUrls().filter((u) => u !== "/bn/duas/sleep?cat=6"));
  assert.deepEqual(problems, ["missing category page /bn/duas/sleep?cat=6"]);
});

test("a category page that is not in the database is reported", () => {
  const problems = run([...goodUrls(), "/duas/old-name?cat=6"]);
  assert.deepEqual(problems, ["unexpected category page /duas/old-name?cat=6"]);
});

test("an audio file in the list fails the check", () => {
  const problems = run([...goodUrls(), "/audio/12.mp3"]);
  assert.deepEqual(problems, ["audio or video file in the list: /audio/12.mp3"]);
  assert.ok(run([...goodUrls(), "/x.OGG?v=1"]).length > 0);
});

test("an API route in the list fails the check", () => {
  assert.deepEqual(run([...goodUrls(), "/api/audio/4"]), ["API route in the list: /api/audio/4"]);
});

test("missing pages, fonts, scripts and images are reported, and source maps and other files are not required", () => {
  const urls = goodUrls().filter((u) => !["/offline", "/_next/static/media/f.woff2", "/icons/home.svg"].includes(u));
  assert.deepEqual(run(urls).sort(), [
    "missing build file /_next/static/media/f.woff2",
    "missing page /offline",
    "missing public file /icons/home.svg",
  ]);
});

test("a list without the home page pattern fails, also when the file itself is gone", () => {
  const urls = goodUrls().filter((u) => u !== "/images/home-pattern.svg");
  const without = publicFiles.filter((f) => f !== "images/home-pattern.svg");
  assert.deepEqual(checkPrecache({ urls, categories, staticFiles, publicFiles: without }), [
    "missing the home page pattern /images/home-pattern.svg",
  ]);
});

test("duplicate URLs are reported", () => {
  assert.deepEqual(run([...goodUrls(), "/duas"]), ["the list has duplicate URLs"]);
});

test("parseWorker reads entries written in either key order", () => {
  const text = 'var y=[{url:"/a",revision:null},{revision:"abc",url:"/b?cat=1"},{url:"/c",revision:"x"}];f({url:"/not-an-entry"})';
  assert.deepEqual(parseWorker(text), ["/a", "/b?cat=1", "/c"]);
});
