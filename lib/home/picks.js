// The duas and hadith quotes of the home page (design D8). Pure: the caller passes the content rows in, so the
// browser can use the day functions without the database.
import { categoryHref, groupDuas, pick } from "../content.js";
import { fmt } from "../i18n.js";
import { addDays, epochDay } from "../prayer/dates.js";

export const DUAS_SHOWN = 3;

const PERIOD_LISTS = { fajr: "morning", dhuhr: "day", asr: "evening", maghrib: "evening", isha: "night" };

/**
 * Which list of duas belongs to a moment.
 *
 * @param {null | undefined | { current: string | null }} waqt  What `waqtAt` returned; none when it is not known.
 * @returns {"morning" | "day" | "evening" | "night"}
 */
export function duaList(waqt) {
  if (!waqt) return "day";
  // From sunrise until Dhuhr no waqt is current: still the morning.
  return waqt.current === null ? "morning" : PERIOD_LISTS[waqt.current];
}

/** Which entry of a list of `length` belongs to a calendar date. The same for every reader on that date. */
export function dayIndex(date, length) {
  return ((epochDay(date) % length) + length) % length;
}

/** The five periods of the hadith card, in the order they come in a day (design D5 of apply-audit-pages-and-feedback). */
export const HADITH_PERIODS = Object.freeze(["fajr", "dhuhr", "asr", "maghrib", "isha"]);

/**
 * Which hadith period a moment is in, and the date that period belongs to. From sunrise until Dhuhr is still Fajr's;
 * after midnight and before Fajr is the Isha of the day before. When the moment is not known it is Dhuhr of `date`.
 *
 * @param {{ year: number, month: number, day: number }} date  The calendar date in the reader's place.
 * @param {null | undefined | { current: string | null }} waqt  What `waqtAt` returned.
 * @param {number} [now]  The time, needed only to tell the Isha before Fajr from the Isha of the evening.
 * @param {Date} [fajr]  Fajr of `date`.
 */
export function hadithSlot(date, waqt, now, fajr) {
  if (!waqt) return { date, period: "dhuhr" };
  const period = waqt.current ?? "fajr";
  const beforeFajr = period === "isha" && fajr !== undefined && Number(now) < Number(fajr);
  return { date: beforeFajr ? addDays(date, -1) : date, period };
}

/**
 * Which of `length` quotes belongs to a date and period. Each date takes the next five in turn, so the five of a day
 * differ and two days in a row share none while `length` is at least 10. The same for every reader.
 */
export function hadithIndex(date, period, length) {
  const slot = epochDay(date) * HADITH_PERIODS.length + HADITH_PERIODS.indexOf(period);
  return ((slot % length) + length) % length;
}

/** `count` entries of `list` starting at `start`, going round to the front, none twice. */
export function takeFrom(list, start, count) {
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
}

/**
 * Every listed dua and quote, shaped for one language. A quote with no text or reference in that language is left
 * out. A listed dua or part that does not exist stops the build.
 *
 * @param {{ picks: { duas: Record<"morning"|"day"|"evening"|"night", number[]>, hadith: Array<{ dua_id: number, part: number, field: "top" | "bottom" }> },
 *           getDua: (id: number) => object[], categories: object[] }} input
 * @param {"en" | "bn"} lang
 * @returns {{ duas: Array<{ id: number, title: string, category: string, arabic: string[], href: string }>,
 *             lists: Record<string, number[]>,
 *             quotes: Array<{ key: string, text: string, reference: string }> }}
 */
export function buildHomePicks({ picks, getDua, categories }, lang) {
  // A dua that is on two lists is in the page once.
  const duas = [...new Set(Object.values(picks.duas).flat())].map((id) => {
    const [dua] = groupDuas(getDua(id), lang);
    const category = categories.find((c) => c.cat_id === dua?.cat_id);
    if (!category) throw new Error(`home-picks.json: no dua ${id}`);
    return {
      id,
      title: dua.title ?? fmt(lang, "duaFallback", { n: id }),
      category: pick(category, "cat_name", lang),
      arabic: dua.parts.map((part) => part.arabic).filter(Boolean),
      href: `${categoryHref(category, lang)}#dua-${id}`,
    };
  });
  const quotes = picks.hadith.flatMap(({ dua_id, part, field }) => {
    const row = getDua(dua_id)[part - 1];
    if (!row) throw new Error(`home-picks.json: dua ${dua_id} has no part ${part}`);
    const text = pick(row, field, lang);
    const reference = pick(row, "refference", lang);
    return text && reference ? [{ key: `${dua_id}-${part}-${field}`, text: text.trim(), reference }] : [];
  });
  return { duas, lists: picks.duas, quotes };
}
