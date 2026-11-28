// Which waqt it is and how long is left (design D3). Pure: no library, no browser, no clock of its own.

/** The six times of a day, in the order they come. Sunrise ends Fajr; it is not a prayer. */
export const PRAYER_KEYS = Object.freeze(["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"]);

/**
 * @typedef {Record<"fajr"|"sunrise"|"dhuhr"|"asr"|"maghrib"|"isha", Date>} DayTimes
 *
 * @param {{ previous: DayTimes, today: DayTimes, next: DayTimes }} days  The day's times and its neighbours'.
 * @param {Date | number} now
 * @returns {null | {
 *   current: string | null,  the waqt it is now; null from sunrise until Dhuhr
 *   next: string,            what comes when the current period ends: a waqt, or "sunrise" during Fajr
 *   startedAt: Date,
 *   endsAt: Date,
 *   progress: number,        the share of the period that has passed, 0 to 1
 *   remainingMs: number,
 * }}  null when `now` is outside the three days given.
 */
export function waqtAt({ previous, today, next }, now) {
  const at = Number(now);
  const events = [previous, today, next]
    .flatMap((day) => PRAYER_KEYS.map((name) => ({ name, time: day[name].getTime() })))
    .sort((a, b) => a.time - b.time);
  const index = events.findLastIndex((e) => e.time <= at);
  if (index < 0 || index === events.length - 1) return null;
  const start = events[index];
  const end = events[index + 1];
  return {
    current: start.name === "sunrise" ? null : start.name,
    next: end.name,
    startedAt: new Date(start.time),
    endsAt: new Date(end.time),
    progress: (at - start.time) / (end.time - start.time),
    remainingMs: end.time - at,
  };
}

/**
 * How one of today's times stands: the waqt it is now, gone by, or still to come. After midnight Isha is current,
 * although today's own Isha is still ahead.
 *
 * @param {string} key  One of PRAYER_KEYS.
 * @param {Date} time  Today's time for it.
 * @param {Date | number} now
 * @param {string | null} current  The `current` of `waqtAt`.
 * @returns {"current" | "passed" | "upcoming"}
 */
export function timeState(key, time, now, current) {
  if (key === current) return "current";
  return time.getTime() <= Number(now) ? "passed" : "upcoming";
}

/**
 * What a screen reader is to be told when the home page moves from one moment to the next: the period that has begun.
 *
 * @typedef {null | { place: string, current: string | null }} Moment  null while the waqt is not known.
 * @param {Moment} before
 * @param {Moment} after
 * @returns {undefined | string | null}  The waqt that has started, or null at sunrise, when none is due. undefined
 *   when there is nothing to announce: the first value, a change of place, or the same period.
 */
export function periodStarted(before, after) {
  if (!before || !after || before.place !== after.place || before.current === after.current) return undefined;
  return after.current;
}
