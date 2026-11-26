import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dateInZone } from "../prayer/dates.js";
import { DUAS_SHOWN, buildHomePicks, dayIndex, takeFrom } from "./picks.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const picks = JSON.parse(fs.readFileSync(new URL("../../data/home-picks.json", import.meta.url), "utf8"));
const db = new Database(fileURLToPath(new URL("../../data/dua_main.sqlite", import.meta.url)), { readonly: true });
const categories = db.prepare("SELECT * FROM category ORDER BY cat_id").all();
const getDua = (id) => db.prepare("SELECT * FROM dua WHERE id = ? ORDER BY rowid").all(id);
const filled = (v) => typeof v === "string" && v.trim() !== "";

test.after(() => db.close());

test("every listed dua exists, with an English title and Arabic text", () => {
  assert.ok(picks.duas.length >= DUAS_SHOWN);
  assert.equal(new Set(picks.duas).size, picks.duas.length);
  for (const id of picks.duas) {
    const rows = getDua(id);
    assert.ok(rows.length > 0, `dua ${id}`);
    assert.ok(rows.some((r) => filled(r.dua_name_en)), `dua ${id} title`);
    assert.ok(rows.some((r) => filled(r.dua_arabic)), `dua ${id} Arabic`);
  }
});

test("every listed quote exists, with English text in its field and an English reference", () => {
  assert.ok(picks.hadith.length > 0);
  for (const { dua_id, part, field } of picks.hadith) {
    assert.ok(["top", "bottom"].includes(field), `${dua_id} ${field}`);
    const row = getDua(dua_id)[part - 1];
    assert.ok(row, `dua ${dua_id} part ${part}`);
    assert.ok(filled(row[`${field}_en`]), `dua ${dua_id} ${field}_en`);
    assert.ok(filled(row.refference_en), `dua ${dua_id} reference`);
  }
});

test("the lists are shaped for each language, with links to the card on its category page", () => {
  const en = buildHomePicks({ picks, getDua, categories }, "en");
  const bn = buildHomePicks({ picks, getDua, categories }, "bn");
  assert.equal(en.duas.length, picks.duas.length);
  assert.equal(en.quotes.length, picks.hadith.length);
  assert.equal(en.duas[0].href, "/duas/duas-importance?cat=1#dua-4");
  assert.equal(bn.duas[0].href, "/bn/duas/duas-importance?cat=1#dua-4");
  assert.match(bn.duas[0].title, /[ঀ-৿]/);
  for (const quote of bn.quotes) assert.match(quote.text, /[ঀ-৿]/, quote.key);
});

test("a quote with no Bangla text is left out of the Bangla list, and the next one takes its day", () => {
  const rows = {
    1: [{ top_en: "A", top_bn: "ক", refference_en: "R1", refference_bn: "র১" }],
    2: [{ top_en: "B", top_bn: "  ", refference_en: "R2", refference_bn: "র২" }],
    3: [{ top_en: "C", top_bn: "গ", refference_en: "R3", refference_bn: "র৩" }],
  };
  const input = {
    picks: { duas: [], hadith: [1, 2, 3].map((dua_id) => ({ dua_id, part: 1, field: "top" })) },
    getDua: (id) => rows[id],
    categories: [],
  };
  assert.deepEqual(buildHomePicks(input, "en").quotes.map((q) => q.text), ["A", "B", "C"]);
  const bn = buildHomePicks(input, "bn").quotes.map((q) => q.text);
  assert.deepEqual(bn, ["ক", "গ"]);
  assert.equal(bn[dayIndex({ year: 1970, month: 1, day: 2 }, bn.length)], "গ"); // the day B has in English
});

test("a listed dua or part that does not exist is an error", () => {
  const input = (picks) => ({ picks, getDua, categories });
  assert.throws(() => buildHomePicks(input({ duas: [999999], hadith: [] }), "en"), /no dua 999999/);
  assert.throws(() => buildHomePicks(input({ duas: [], hadith: [{ dua_id: 4, part: 9, field: "top" }] }), "en"), /no part 9/);
});

test("the day index moves by one each day and wraps to the start", () => {
  const days = Array.from({ length: 7 }, (_, i) => dayIndex({ year: 2026, month: 11, day: 24 + i }, 3));
  for (let i = 1; i < days.length; i++) assert.equal(days[i], (days[i - 1] + 1) % 3);
  assert.equal(dayIndex({ year: 1969, month: 12, day: 31 }, 3), 2);
  assert.deepEqual(takeFrom(["a", "b", "c", "d"], 3, 3), ["d", "a", "b"]);
  assert.deepEqual(takeFrom(["a", "b"], 1, 3), ["b", "a"]);
});

test("readers on the same date get the same entry, whatever their zone or hour", () => {
  const a = dateInZone(new Date("2026-11-26T01:00:00Z"), "Asia/Dhaka");
  const b = dateInZone(new Date("2026-11-26T23:00:00Z"), "America/New_York");
  assert.equal(dayIndex(a, 9), dayIndex(b, 9));
});
