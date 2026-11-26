// Calendar dates and the strings the home page shows, per language (design D4, D7). Pure: only Intl.
// A "calendar date" is `{ year, month, day }` with no time and no zone.

const LOCALES = { en: "en-GB", bn: "bn-BD-u-nu-beng" };
const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar date it is at the instant `now` in `timeZone`. */
export function dateInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory-nu-latn", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Whole days since 1970-01-01. */
export function epochDay({ year, month, day }) {
  return Math.round(Date.UTC(year, month - 1, day) / DAY_MS);
}

export function addDays({ year, month, day }, days) {
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// A calendar date is formatted as its noon in UTC, so no zone can move it to another day.
const noon = ({ year, month, day }) => new Date(Date.UTC(year, month - 1, day, 12));
const inUtc = (date, lang, options) =>
  new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", ...options }).format(noon(date));

export const formatWeekday = (date, lang) => inUtc(date, lang, { weekday: "long" });

export const formatGregorian = (date, lang) =>
  inUtc(date, lang, { calendar: "gregory", day: "numeric", month: "long", year: "numeric" });

/** The Umm al-Qura date of `date` moved by `offset` days, for example "16 Jumada II 1448 AH". */
export function formatHijri(date, offset, lang) {
  const parts = new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: "UTC",
    calendar: "islamic-umalqura",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(noon(addDays(date, offset)));
  const get = (type) => parts.find((p) => p.type === type).value;
  // Written out here because the era Intl gives in Bangla is the word for "era", not "Hijri".
  return lang === "bn"
    ? `${get("day")} ${get("month")}, ${get("year")} হিজরি`
    : `${get("day")} ${get("month")} ${get("year")} AH`;
}

const clock = (instant, timeZone, lang, options) =>
  new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...options,
  }).format(instant);

/** Hours and minutes of an instant in `timeZone`. */
export const formatTime = (instant, timeZone, lang) => clock(instant, timeZone, lang);

/** Hours, minutes and seconds of an instant in `timeZone`. */
export const formatClock = (instant, timeZone, lang) => clock(instant, timeZone, lang, { second: "2-digit" });

/** A whole number in the page's digits, padded to `width`. */
export const formatNumber = (value, lang, width = 1) =>
  new Intl.NumberFormat(LOCALES[lang], { minimumIntegerDigits: width, useGrouping: false }).format(value);

/** A length of time as whole hours and minutes, rounded up to the minute. */
export function durationParts(ms) {
  const minutes = Math.ceil(Math.max(0, ms) / 60000);
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

/** "HH:MM:SS" for a length of time. Rounded up, so it reads zero only when the time has come. */
export function formatDuration(ms, lang) {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((n) => formatNumber(n, lang, 2))
    .join(":");
}
