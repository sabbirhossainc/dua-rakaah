import test from "node:test";
import assert from "node:assert/strict";
import { INDEX_URL, audioUrl, chapterUrl, loadSource, parseJson } from "./source.js";

// Invented data in the source's shape. None of the source's own text is used.
const audio = (id) => `http://www.hisnmuslim.com/audio/ar/${id}.mp3`;
const item = (ID, extra = {}) => ({ ID, ARABIC_TEXT: "ابجد", AUDIO: audio(ID), ...extra });
const chapter = (...items) => `﻿${JSON.stringify({ "عنوان": items })}`;
const index = (...ids) => `﻿${JSON.stringify({ English: ids.map((ID) => ({ ID, TEXT: "ignored" })) })}`;

/** A fetcher over a table of bodies, recording what was asked for. An Error in the table is thrown. */
function fakeFetch(table) {
  const asked = [];
  const fetchText = async (url, name) => {
    asked.push([url, name]);
    const body = table[url];
    if (body === undefined) throw new Error(`HTTP 404 for ${url}`);
    if (body instanceof Error) throw body;
    return body;
  };
  return { fetchText, asked };
}

test("a byte order mark is accepted", () => {
  assert.deepEqual(parseJson('﻿{"a":1}'), { a: 1 });
  assert.deepEqual(parseJson('{"a":1}'), { a: 1 });
});

test("only the source's own audio path is accepted, rewritten to https", () => {
  assert.equal(audioUrl(audio(75)), "https://www.hisnmuslim.com/audio/ar/75.mp3");
  assert.equal(audioUrl("https://www.hisnmuslim.com/audio/ar/75.mp3"), "https://www.hisnmuslim.com/audio/ar/75.mp3");
  const refused = [
    "https://evil.example/audio/ar/75.mp3",
    "https://www.hisnmuslim.com.evil.example/audio/ar/75.mp3",
    "https://www.hisnmuslim.com/audio/ar/75.mp3?x=1",
    "https://www.hisnmuslim.com/audio/ar/../75.mp3",
    "https://www.hisnmuslim.com/audio/ar/name.mp3",
    "javascript:alert(1)",
    "",
    null,
    75,
  ];
  for (const value of refused) assert.equal(audioUrl(value), null, String(value));
});

test("chapters are read and each item gets a secure address", async () => {
  const { fetchText, asked } = fakeFetch({
    [INDEX_URL]: index(27, 28),
    [chapterUrl(27)]: chapter(item(1), item(2)),
    [chapterUrl(28)]: chapter(item(3)),
  });
  const r = await loadSource(fetchText);
  assert.deepEqual(r.items.map((i) => [i.id, i.url]), [1, 2, 3].map((n) => [n, `https://www.hisnmuslim.com/audio/ar/${n}.mp3`]));
  assert.equal(r.chapters, 2);
  assert.deepEqual([r.unreadable, r.badItems, r.badUrls], [[], [], []]);
  assert.deepEqual(asked.map((a) => a[1]), ["index.json", "chapter-27.json", "chapter-28.json"]);
});

test("an unreadable chapter is named and the others are still read", async () => {
  for (const broken of ['﻿{"x": [ {"ID": 1,, ]}', "<html>down</html>", '{"x": "not a list"}']) {
    const { fetchText } = fakeFetch({ [INDEX_URL]: index(126, 27), [chapterUrl(126)]: broken, [chapterUrl(27)]: chapter(item(1)) });
    const r = await loadSource(fetchText);
    assert.deepEqual(r.unreadable, [126]);
    assert.equal(r.items.length, 1);
  }
});

test("a failed download stops the whole read", async () => {
  const { fetchText } = fakeFetch({ [INDEX_URL]: index(27, 28), [chapterUrl(27)]: chapter(item(1)) });
  await assert.rejects(loadSource(fetchText), /404/);
  await assert.rejects(loadSource(fakeFetch({ [INDEX_URL]: new Error("network down") }).fetchText), /network down/);
});

test("an unreadable index, or no items at all, stops the read", async () => {
  await assert.rejects(loadSource(fakeFetch({ [INDEX_URL]: "nonsense" }).fetchText));
  await assert.rejects(loadSource(fakeFetch({ [INDEX_URL]: index() }).fetchText), /no items/);
});

test("an item seen in two chapters is kept once", async () => {
  const { fetchText } = fakeFetch({
    [INDEX_URL]: index(1, 2),
    [chapterUrl(1)]: chapter(item(5, { ARABIC_TEXT: "first" })),
    [chapterUrl(2)]: chapter(item(5, { ARABIC_TEXT: "second" })),
  });
  const r = await loadSource(fetchText);
  assert.deepEqual(r.items.map((i) => i.arabic), ["first"]);
});

test("IDs that are not positive whole numbers are never used", async () => {
  const { fetchText, asked } = fakeFetch({
    [INDEX_URL]: index("../../x", -1, 1.5, 0, 7),
    [chapterUrl(7)]: chapter(item("8"), item(-2), item(9, { ARABIC_TEXT: "  " }), item(10)),
  });
  const r = await loadSource(fetchText);
  assert.equal(asked.length, 2, "only the index and the one good chapter");
  assert.equal(r.unreadable.length, 4);
  assert.deepEqual(r.items.map((i) => i.id), [10]);
  assert.equal(r.badItems.length, 3);
});

test("an unexpected audio address is reported and the item gets none", async () => {
  const { fetchText } = fakeFetch({ [INDEX_URL]: index(1), [chapterUrl(1)]: chapter(item(5, { AUDIO: "http://other.example/5.mp3" })) });
  const r = await loadSource(fetchText);
  assert.equal(r.items[0].url, null);
  assert.deepEqual(r.badUrls, [{ item: 5, address: "http://other.example/5.mp3" }]);
});
