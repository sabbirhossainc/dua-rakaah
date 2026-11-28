import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dateInZone } from "../prayer/dates.js";
import { DUAS_SHOWN, HADITH_PERIODS, buildHomePicks, dayIndex, duaList, hadithIndex, hadithSlot, takeFrom } from "./picks.js";
import { addDays } from "../prayer/dates.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const picks = JSON.parse(fs.readFileSync(new URL("../../data/home-picks.json", import.meta.url), "utf8"));
const db = new Database(fileURLToPath(new URL("../../data/dua_main.sqlite", import.meta.url)), { readonly: true });
const categories = db.prepare("SELECT * FROM category ORDER BY cat_id").all();
const getDua = (id) => db.prepare("SELECT * FROM dua WHERE id = ? ORDER BY rowid").all(id);
const filled = (v) => typeof v === "string" && v.trim() !== "";

test.after(() => db.close());

test("there are four lists, each of at least three existing duas with Arabic and both titles", () => {
  assert.deepEqual(Object.keys(picks.duas), ["morning", "day", "evening", "night"]);
  for (const [name, ids] of Object.entries(picks.duas)) {
    assert.ok(ids.length >= DUAS_SHOWN, name);
    assert.equal(new Set(ids).size, ids.length, name);
    for (const id of ids) {
      const rows = getDua(id);
      assert.ok(rows.length > 0, `dua ${id}`);
      assert.ok(rows.some((r) => filled(r.dua_name_en)), `dua ${id} English title`);
      assert.ok(rows.some((r) => filled(r.dua_name_bn)), `dua ${id} Bangla title`);
      assert.ok(rows.some((r) => filled(r.dua_arabic)), `dua ${id} Arabic`);
    }
  }
});

test("each period has its list, and an unknown one the daytime list", () => {
  const lists = { fajr: "morning", dhuhr: "day", asr: "evening", maghrib: "evening", isha: "night" };
  for (const [current, list] of Object.entries(lists)) assert.equal(duaList({ current }), list, current);
  assert.equal(duaList({ current: null }), "morning");
  assert.equal(duaList(null), "day");
  assert.equal(duaList(undefined), "day");
});

test("the same date and period give the same duas", () => {
  const shown = (instant, zone) => {
    const date = dateInZone(new Date(instant), zone);
    return takeFrom(picks.duas.night, dayIndex(date, picks.duas.night.length), DUAS_SHOWN);
  };
  assert.deepEqual(shown("2026-11-26T14:00:00Z", "Asia/Dhaka"), shown("2026-11-27T02:00:00Z", "America/New_York"));
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
  const listed = [...new Set(Object.values(picks.duas).flat())];
  assert.deepEqual(en.duas.map((d) => d.id), listed);
  assert.deepEqual(en.lists, picks.duas);
  assert.equal(en.quotes.length, picks.hadith.length);
  const four = (shaped) => shaped.duas.find((d) => d.id === 4);
  assert.equal(four(en).href, "/duas/duas-importance?cat=1#dua-4");
  assert.equal(four(bn).href, "/bn/duas/duas-importance?cat=1#dua-4");
  assert.match(four(bn).title, /[ঀ-৿]/);
  assert.equal(four(en).category, "Dua's Importance");
  assert.match(four(bn).category, /[ঀ-৿]/);
  for (const quote of bn.quotes) assert.match(quote.text, /[ঀ-৿]/, quote.key);
});

test("a quote with no Bangla text is left out of the Bangla list, and the next one takes its day", () => {
  const rows = {
    1: [{ top_en: "A", top_bn: "ক", refference_en: "R1", refference_bn: "র১" }],
    2: [{ top_en: "B", top_bn: "  ", refference_en: "R2", refference_bn: "র২" }],
    3: [{ top_en: "C", top_bn: "গ", refference_en: "R3", refference_bn: "র৩" }],
  };
  const input = {
    picks: { duas: {}, hadith: [1, 2, 3].map((dua_id) => ({ dua_id, part: 1, field: "top" })) },
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
  assert.throws(() => buildHomePicks(input({ duas: { day: [999999] }, hadith: [] }), "en"), /no dua 999999/);
  assert.throws(() => buildHomePicks(input({ duas: {}, hadith: [{ dua_id: 4, part: 9, field: "top" }] }), "en"), /no part 9/);
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

test("the hadith list holds at least 30 quotes, each with text and a reference in both languages", () => {
  assert.ok(picks.hadith.length >= 30, String(picks.hadith.length));
  for (const lang of ["en", "bn"]) {
    assert.equal(buildHomePicks({ picks, getDua, categories }, lang).quotes.length, picks.hadith.length, lang);
  }
  const keys = picks.hadith.map(({ dua_id, part, field }) => `${dua_id}-${part}-${field}`);
  assert.equal(new Set(keys).size, keys.length, "no quote listed twice");
});

test("five different hadith a day, and none shared by two days in a row", () => {
  for (const length of [10, 35, 36, 41]) {
    for (let i = 0; i < 60; i++) {
      const date = addDays({ year: 2026, month: 11, day: 1 }, i);
      const day = HADITH_PERIODS.map((p) => hadithIndex(date, p, length));
      const next = HADITH_PERIODS.map((p) => hadithIndex(addDays(date, 1), p, length));
      assert.equal(new Set(day).size, 5, `${length} ${i}`);
      assert.equal(new Set([...day, ...next]).size, 10, `${length} ${i}`);
    }
  }
});

test("the hadith slot follows the waqt", () => {
  const date = { year: 2026, month: 11, day: 28 };
  const fajr = new Date("2026-11-28T00:00:00Z");
  assert.deepEqual(hadithSlot(date, null), { date, period: "dhuhr" });
  assert.deepEqual(hadithSlot(date, { current: null }), { date, period: "fajr" }, "sunrise to Dhuhr is Fajr's");
  assert.deepEqual(hadithSlot(date, { current: "maghrib" }, fajr.getTime() + 1, fajr), { date, period: "maghrib" });
  assert.deepEqual(hadithSlot(date, { current: "isha" }, fajr.getTime() + 60e6, fajr), { date, period: "isha" });
  assert.deepEqual(
    hadithSlot(date, { current: "isha" }, fajr.getTime() - 1, fajr),
    { date: { year: 2026, month: 11, day: 27 }, period: "isha" },
    "before Fajr is the Isha of the day before",
  );
});
