import test from "node:test";
import assert from "node:assert/strict";
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { dateInZone, formatTime } from "./dates.js";
import { resolvePlace } from "./place.js";
import { dayTimes, timesAround } from "./times.js";
import { PRAYER_KEYS } from "./waqt.js";

const dhaka = resolvePlace(null, "Asia/Dhaka");
const date = { year: 2026, month: 11, day: 26 };

function adhanTimes(madhab) {
  const params = CalculationMethod.Karachi();
  params.madhab = madhab;
  return new PrayerTimes(new Coordinates(dhaka.lat, dhaka.lng), new Date(2026, 10, 26), params);
}

test("Dhaka on 2026-11-26 is adhan's Karachi result with the Hanafi Asr", () => {
  const times = dayTimes(dhaka, date);
  const expected = adhanTimes(Madhab.Hanafi);
  assert.deepEqual(Object.keys(times), [...PRAYER_KEYS]);
  for (const key of PRAYER_KEYS) assert.equal(times[key].getTime(), expected[key].getTime(), key);
  assert.ok(times.asr > adhanTimes(Madhab.Shafi).asr, "Hanafi Asr is later than Shafi");
});

test("the Dhaka times are plausible for late November, in order, on that date", () => {
  const times = dayTimes(dhaka, date);
  const hour = (key) =>
    Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", hourCycle: "h23" }).format(times[key]));
  assert.deepEqual(PRAYER_KEYS.map(hour), [5, 6, 11, 15, 17, 18]);
  assert.match(formatTime(times.asr, "Asia/Dhaka", "en"), /^3:\d{2} PM$/);
  for (const key of PRAYER_KEYS) assert.deepEqual(dateInZone(times[key], "Asia/Dhaka"), date, key);
});

test("the neighbouring days come with the day's times", () => {
  const { previous, today, next } = timesAround(dhaka, date);
  assert.deepEqual(dateInZone(previous.isha, "Asia/Dhaka"), { year: 2026, month: 11, day: 25 });
  assert.deepEqual(dateInZone(today.fajr, "Asia/Dhaka"), date);
  assert.deepEqual(dateInZone(next.fajr, "Asia/Dhaka"), { year: 2026, month: 11, day: 27 });
});

test("the date is the place's, also when UTC is on another day", () => {
  const now = new Date("2026-11-25T20:00:00Z"); // 02:00 on the 26th in Dhaka
  const inDhaka = dateInZone(now, "Asia/Dhaka");
  assert.deepEqual(inDhaka, date);
  assert.deepEqual(dateInZone(now, "UTC"), { year: 2026, month: 11, day: 25 });
  const { today } = timesAround(dhaka, inDhaka);
  assert.deepEqual(dateInZone(today.fajr, "Asia/Dhaka"), date);
  assert.ok(today.fajr > now);
});

test("a position where the times cannot be computed gives no times", () => {
  const svalbard = { lat: 78.22, lng: 15.65 }; // midnight sun in June
  assert.equal(dayTimes(svalbard, { year: 2026, month: 6, day: 21 }), null);
  assert.equal(timesAround(svalbard, { year: 2026, month: 6, day: 21 }), null);
});
