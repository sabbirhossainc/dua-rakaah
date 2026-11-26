import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  dateInZone,
  durationParts,
  epochDay,
  formatClock,
  formatDuration,
  formatGregorian,
  formatHijri,
  formatTime,
  formatWeekday,
} from "./dates.js";

const date = { year: 2026, month: 11, day: 26 };

test("2026-11-26 in English", () => {
  assert.equal(formatWeekday(date, "en"), "Thursday");
  assert.equal(formatHijri(date, 0, "en"), "16 Jumada II 1448 AH");
  assert.equal(formatGregorian(date, "en"), "26 November 2026");
});

test("2026-11-26 in Bangla, with Bangla words and digits", () => {
  assert.equal(formatWeekday(date, "bn"), "বৃহস্পতিবার");
  const hijri = formatHijri(date, 0, "bn");
  assert.ok(hijri.includes("১৬") && hijri.includes("১৪৪৮") && hijri.endsWith("হিজরি"), hijri);
  const gregorian = formatGregorian(date, "bn");
  assert.ok(gregorian.includes("২৬") && gregorian.includes("২০২৬") && gregorian.includes("নভেম্বর"), gregorian);
  assert.doesNotMatch(hijri + gregorian, /[0-9A-Za-z]/);
});

test("the offset moves the Hijri date only", () => {
  assert.equal(formatHijri(date, -1, "en"), "15 Jumada II 1448 AH");
  assert.equal(formatHijri(date, 1, "en"), "17 Jumada II 1448 AH");
  assert.ok(formatHijri(date, -1, "bn").includes("১৫"));
  assert.equal(formatWeekday(date, "en"), "Thursday");
  assert.equal(formatGregorian(date, "en"), "26 November 2026");
});

test("days are added across months and years", () => {
  assert.deepEqual(addDays({ year: 2026, month: 12, day: 31 }, 1), { year: 2027, month: 1, day: 1 });
  assert.deepEqual(addDays({ year: 2026, month: 3, day: 1 }, -1), { year: 2026, month: 2, day: 28 });
  assert.equal(epochDay({ year: 1970, month: 1, day: 2 }), 1);
  assert.equal(epochDay(addDays(date, 1)), epochDay(date) + 1);
});

test("times and durations are written in the page's digits", () => {
  const instant = new Date("2026-11-26T11:11:05Z");
  assert.equal(formatTime(instant, "Asia/Dhaka", "en"), "17:11");
  assert.equal(formatClock(instant, "Asia/Dhaka", "en"), "17:11:05");
  assert.equal(formatTime(instant, "Asia/Dhaka", "bn"), "১৭:১১");
  assert.equal(formatClock(instant, "Europe/London", "bn"), "১১:১১:০৫");
  assert.equal(formatClock(new Date("2026-11-25T18:00:00Z"), "Asia/Dhaka", "en"), "00:00:00");
  assert.deepEqual(dateInZone(new Date("2026-11-25T18:00:00Z"), "Asia/Dhaka"), date);
  assert.equal(formatDuration(3_723_000, "en"), "01:02:03");
  assert.equal(formatDuration(3_723_000, "bn"), "০১:০২:০৩");
  assert.equal(formatDuration(1, "en"), "00:00:01");
  assert.equal(formatDuration(0, "en"), "00:00:00");
  assert.equal(formatDuration(-5000, "en"), "00:00:00");
  assert.deepEqual(durationParts(72 * 60_000), { hours: 1, minutes: 12 });
  assert.deepEqual(durationParts(60 * 60_000 - 1), { hours: 1, minutes: 0 });
  assert.deepEqual(durationParts(0), { hours: 0, minutes: 0 });
});
