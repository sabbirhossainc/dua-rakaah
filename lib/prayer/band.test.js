// The "Prayer band follows the waqt" and "Neutral band before scripts run" requirements of the home-page spec.
import test from "node:test";
import assert from "node:assert/strict";
import { BAND_PERIODS, bandPeriod } from "./band.js";
import { PRAYER_KEYS, waqtAt } from "./waqt.js";

const CLOCK = { fajr: "05:00", sunrise: "06:20", dhuhr: "12:00", asr: "15:30", maghrib: "17:10", isha: "18:30" };
const day = (d) => Object.fromEntries(PRAYER_KEYS.map((key) => [key, new Date(`2026-11-${d}T${CLOCK[key]}:00Z`)]));
const at = (time) => waqtAt({ previous: day(25), today: day(26), next: day(27) }, new Date(`2026-11-26T${time}:00Z`));

test("no waqt known: neutral", () => {
  assert.equal(bandPeriod(null), "neutral");
  assert.equal(bandPeriod(undefined), "neutral");
});

for (const [time, period] of [
  ["05:30", "fajr"],
  ["13:00", "dhuhr"],
  ["16:00", "asr"],
  ["17:30", "maghrib"],
  ["20:00", "isha"],
  ["01:00", "isha"],
]) {
  test(`at ${time} the band is ${period}`, () => {
    assert.equal(bandPeriod(at(time)), period);
  });
}

test("between sunrise and Dhuhr the band is forenoon", () => {
  assert.equal(bandPeriod(at("06:20")), "forenoon");
  assert.equal(bandPeriod(at("09:00")), "forenoon");
});

test("the band changes at the instant a waqt starts", () => {
  assert.equal(bandPeriod(at("17:09")), "asr");
  assert.equal(bandPeriod(at("17:10")), "maghrib");
});

test("every result is one of the listed periods", () => {
  for (let hour = 0; hour < 24; hour++) {
    assert.ok(BAND_PERIODS.includes(bandPeriod(at(`${String(hour).padStart(2, "0")}:15`))), `${hour}`);
  }
});
