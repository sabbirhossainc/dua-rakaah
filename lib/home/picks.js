// The duas and hadith quotes of the home page (design D8). Pure: the caller passes the content rows in, so the
// browser can use the day functions without the database.
import { categoryHref, groupDuas, pick } from "../content.js";
import { fmt } from "../i18n.js";
import { epochDay } from "../prayer/dates.js";

export const DUAS_SHOWN = 3;

/** Which entry of a list of `length` belongs to a calendar date. The same for every reader on that date. */
export function dayIndex(date, length) {
  return ((epochDay(date) % length) + length) % length;
}

/** `count` entries of `list` starting at `start`, going round to the front, none twice. */
export function takeFrom(list, start, count) {
  return Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
}

/**
 * Every listed dua and quote, shaped for one language. A quote with no text or reference in that language is left
 * out. A listed dua or part that does not exist stops the build.
 *
 * @param {{ picks: { duas: number[], hadith: Array<{ dua_id: number, part: number, field: "top" | "bottom" }> },
 *           getDua: (id: number) => object[], categories: object[] }} input
 * @param {"en" | "bn"} lang
 * @returns {{ duas: Array<{ id: number, title: string, arabic: string[], href: string }>,
 *             quotes: Array<{ key: string, text: string, reference: string }> }}
 */
export function buildHomePicks({ picks, getDua, categories }, lang) {
  const duas = picks.duas.map((id) => {
    const [dua] = groupDuas(getDua(id), lang);
    const category = categories.find((c) => c.cat_id === dua?.cat_id);
    if (!category) throw new Error(`home-picks.json: no dua ${id}`);
    return {
      id,
      title: dua.title ?? fmt(lang, "duaFallback", { n: id }),
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
  return { duas, quotes };
}
