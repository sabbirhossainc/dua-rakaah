// The only place that calls adhan (design D1, D3). It computes on the device: no request is made.
import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { addDays } from "./dates.js";
import { PRAYER_KEYS } from "./waqt.js";

/**
 * One day's times for a position, by the Karachi method with the Hanafi Asr, or null when any of them cannot be
 * computed (as happens near the poles).
 *
 * @param {{ lat: number, lng: number }} place
 * @param {{ year: number, month: number, day: number }} date  The calendar date in the place.
 */
export function dayTimes({ lat, lng }, { year, month, day }) {
  const params = CalculationMethod.Karachi();
  params.madhab = Madhab.Hanafi;
  // adhan reads only the year, month and day, through the device's own zone, so the date is built in that zone.
  const result = new PrayerTimes(new Coordinates(lat, lng), new Date(year, month - 1, day, 12), params);
  const times = Object.fromEntries(PRAYER_KEYS.map((key) => [key, result[key]]));
  return Object.values(times).every((t) => Number.isFinite(t.getTime())) ? times : null;
}

/** The times of `date` and of the days before and after it, or null when any of them cannot be computed. */
export function timesAround(place, date) {
  const [previous, today, next] = [-1, 0, 1].map((n) => dayTimes(place, addDays(date, n)));
  return previous && today && next ? { previous, today, next } : null;
}
