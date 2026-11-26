// The "Current waqt" and "Time left" requirements of the prayer-times spec, with fixed times.
import test from "node:test";
import assert from "node:assert/strict";
import { PRAYER_KEYS, waqtAt } from "./waqt.js";

const at = (day, time) => new Date(`2026-11-${day}T${time}:00Z`);
// The same clock times every day, so the expected values are easy to read.
const CLOCK = { fajr: "05:00", sunrise: "06:20", dhuhr: "12:00", asr: "15:30", maghrib: "17:10", isha: "18:30" };
const day = (d) => Object.fromEntries(PRAYER_KEYS.map((key) => [key, at(d, CLOCK[key])]));
const days = (d) => ({ previous: day(d - 1), today: day(d), next: day(d + 1) });
const MINUTE = 60_000;

const see = (now, d = 26) => {
  const w = waqtAt(days(d), now);
  return [w.current, w.next, w.startedAt.toISOString(), w.endsAt.toISOString()];
};
const span = (from, to) => [at(...from).toISOString(), at(...to).toISOString()];

test("during Asr, Asr is current and Maghrib next", () => {
  assert.deepEqual(see(at(26, "16:00")), ["asr", "maghrib", ...span([26, "15:30"], [26, "17:10"])]);
});

test("each prayer is current from its time to the next", () => {
  assert.deepEqual(see(at(26, "13:00")).slice(0, 2), ["dhuhr", "asr"]);
  assert.deepEqual(see(at(26, "18:00")).slice(0, 2), ["maghrib", "isha"]);
});

test("during Fajr, the period ends at sunrise", () => {
  assert.deepEqual(see(at(26, "05:30")), ["fajr", "sunrise", ...span([26, "05:00"], [26, "06:20"])]);
});

test("Isha lasts past midnight, from the previous day's Isha to today's Fajr", () => {
  assert.deepEqual(see(at(26, "01:00")), ["isha", "fajr", ...span([25, "18:30"], [26, "05:00"])]);
  assert.deepEqual(see(at(26, "20:00")), ["isha", "fajr", ...span([26, "18:30"], [27, "05:00"])]);
});

test("between sunrise and Dhuhr no waqt is current, and Dhuhr is next", () => {
  assert.deepEqual(see(at(26, "09:00")), [null, "dhuhr", ...span([26, "06:20"], [26, "12:00"])]);
});

test("a waqt is current from the instant it starts", () => {
  const w = waqtAt(days(26), at(26, "15:30"));
  assert.equal(w.current, "asr");
  assert.equal(w.progress, 0);
  assert.equal(w.remainingMs, 100 * MINUTE);
  assert.equal(waqtAt(days(26), at(26, "15:30").getTime() - 1).current, "dhuhr");
  assert.equal(waqtAt(days(26), at(26, "06:20")).current, null);
});

test("the time left and the share passed follow the clock", () => {
  const half = waqtAt(days(26), at(26, "16:20"));
  assert.equal(half.progress, 0.5);
  assert.equal(half.remainingMs, 50 * MINUTE);
  assert.equal(waqtAt(days(26), at(26, "16:20").getTime() + 1000).remainingMs, 50 * MINUTE - 1000);
});

test("when the time left reaches zero the next waqt is current and a new countdown starts", () => {
  const before = waqtAt(days(26), at(26, "17:10").getTime() - 1);
  assert.deepEqual([before.current, before.remainingMs], ["asr", 1]);
  const after = waqtAt(days(26), before.endsAt);
  assert.deepEqual([after.current, after.next, after.remainingMs], ["maghrib", "isha", 80 * MINUTE]);
});

test("the day change keeps the same Isha period when the new day's times are used", () => {
  const before = waqtAt(days(26), at(26, "23:59"));
  const after = waqtAt(days(27), at(27, "00:01"));
  assert.equal(before.current, "isha");
  assert.equal(after.current, "isha");
  assert.deepEqual(after.startedAt, before.startedAt);
  assert.deepEqual(after.endsAt, before.endsAt);
  assert.equal(before.remainingMs - after.remainingMs, 2 * MINUTE);
});

test("an instant outside the three days gives nothing", () => {
  assert.equal(waqtAt(days(26), at(24, "10:00")), null);
  assert.equal(waqtAt(days(26), at(28, "10:00")), null);
});
