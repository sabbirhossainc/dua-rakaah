// Reading an open Quran text (Tanzil, "simple-clean") and finding where a dua part's Arabic sits in it (design D2).
// Pure: the command downloads the text. It is used only to choose verse keys and is never shown by the app.
import { normalizeArabic } from "./arabic.js";
import { REVIEW_AT, likenessOf } from "./match.js";

export const TANZIL_URL = "https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true";
export const SURAH_COUNT = 114;
export const VERSE_COUNT = 6236;
/** How many places are listed for a part that needs a person. */
export const PLACES = 3;
/** A run this much shorter or longer than the part cannot be `REVIEW_AT` alike. */
const LENGTH_SLACK = 1 - REVIEW_AT;

/** The length of the letter groups used to skip runs that cannot be alike enough. */
const GRAM = 3;
const BASMALA = normalizeArabic("بسم الله الرحمن الرحيم");
const LINE = /^(\d+)\|(\d+)\|(.+)$/;
const KEY = /^([1-9]\d{0,2}):([1-9]\d{0,2})$/;

/** Surah 1 counts the basmala as its first verse. Everywhere else it only precedes verse 1. */
const mayPrecede = (verse) => verse.aya === 1 && verse.sura !== 1;

const withoutBasmala = (text) => (text.startsWith(BASMALA) && text.length > BASMALA.length ? text.slice(BASMALA.length) : null);

/**
 * The verses of a download, in order. Throws unless it is complete and carries its notice.
 * @returns {{ sura: number, aya: number, key: string, line: string, arabic: string }[]}
 */
export function parseQuran(text) {
  const bad = (why) => new Error(`The Quran text cannot be used: ${why}`);
  if (typeof text !== "string" || !text.includes("Tanzil Project")) throw bad("it does not carry the Tanzil Project notice");
  const verses = [];
  for (const raw of text.replace(/^﻿/, "").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const found = LINE.exec(line);
    if (!found) throw bad(`unexpected line "${line.slice(0, 40)}"`);
    const [sura, aya] = [Number(found[1]), Number(found[2])];
    const last = verses.at(-1);
    const follows = last
      ? (sura === last.sura && aya === last.aya + 1) || (sura === last.sura + 1 && aya === 1)
      : sura === 1 && aya === 1;
    if (!follows) throw bad(`verse ${sura}:${aya} is out of order`);
    verses.push({ sura, aya, key: `${sura}:${aya}`, line, arabic: found[3] });
  }
  if (verses.length !== VERSE_COUNT) throw bad(`it has ${verses.length} verses instead of ${VERSE_COUNT}`);
  if (verses.at(-1).sura !== SURAH_COUNT) throw bad(`it ends at surah ${verses.at(-1).sura}`);
  return verses;
}

/**
 * Looks parts up in `verses` (from `parseQuran`, or a short invented list in tests).
 */
export function createLocator(verses) {
  // All verses joined into one string, with where each begins and ends. The basmala before a surah is left out.
  let all = "";
  const spans = verses.map((v) => {
    let text = normalizeArabic(v.arabic);
    if (mayPrecede(v)) text = withoutBasmala(text) ?? text;
    const start = all.length;
    all += text;
    return { ...v, start, end: all.length };
  });
  const indexOfKey = new Map(spans.map((v, i) => [v.key, i]));

  /** The index of the verse that holds position `at` of the joined text. */
  function verseAt(at) {
    let low = 0;
    let high = spans.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (spans[middle].end <= at) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  /** Every place `text` occurs inside one surah. */
  function occurrences(text) {
    const found = [];
    for (let at = all.indexOf(text); at >= 0; at = all.indexOf(text, at + 1)) {
      const first = spans[verseAt(at)];
      const last = spans[verseAt(at + text.length - 1)];
      if (first.sura !== last.sura) continue;
      found.push({ at, first, last, whole: first.start === at && last.end === at + text.length });
    }
    return found;
  }

  /** "partial" when the verses hold more letters than the part (its optional basmala not counted). */
  function coverageOf(part, first, runLength) {
    const compared = (mayPrecede(first) && withoutBasmala(part)) || part;
    return runLength > compared.length ? "partial" : "full";
  }

  const place = (first, last, coverage, likeness) => ({ from: first.key, to: last.key, coverage, likeness });

  // The letter group starting at each position of the joined text, as a number (an Arabic letter fits in 11 bits).
  const gramAt = (text, at) => text.charCodeAt(at) * 4194304 + text.charCodeAt(at + 1) * 2048 + text.charCodeAt(at + 2);
  const grams = Array.from({ length: Math.max(0, all.length - GRAM + 1) }, (_, at) => gramAt(all, at));

  /**
   * Calls `visit(i, j, length)` for each run of verses i to j, within one surah, that could be `REVIEW_AT` like `text`.
   * Comparing every run letter by letter is far too slow, so runs sharing too few groups of `GRAM` letters with the
   * text are skipped first. Nothing alike enough is lost: two texts that differ in k letters share at least
   * (longer length - GRAM + 1 - GRAM * k) groups.
   */
  function candidates(text, startsAllowed, visit) {
    const wanted = new Set();
    for (let at = 0; at + GRAM <= text.length; at++) wanted.add(gramAt(text, at));
    // hits[p]: how many of the first p positions hold a group the text also has.
    const hits = new Int32Array(grams.length + 1);
    for (let at = 0; at < grams.length; at++) hits[at + 1] = hits[at] + (wanted.has(grams[at]) ? 1 : 0);
    const shortest = text.length * (1 - LENGTH_SLACK);
    const longest = text.length / (1 - LENGTH_SLACK);
    for (let i = 0; i < spans.length; i++) {
      if (!startsAllowed(spans[i])) continue;
      for (let j = i; j < spans.length && spans[j].sura === spans[i].sura; j++) {
        const length = spans[j].end - spans[i].start;
        if (length > longest) break;
        if (length < shortest) continue;
        const longer = Math.max(text.length, length);
        const needed = longer - GRAM + 1 - GRAM * Math.floor(LENGTH_SLACK * longer + 1e-9);
        const shared = length < GRAM ? 0 : hits[spans[j].end - GRAM + 1] - hits[spans[i].start];
        if (shared >= needed) visit(i, j, length);
      }
    }
  }

  /** Runs of verses that are at least `REVIEW_AT` like the part, best first. */
  function alike(part) {
    const found = [];
    for (const text of [part, withoutBasmala(part)].filter(Boolean)) {
      const startsAllowed = text === part ? () => true : mayPrecede;
      candidates(text, startsAllowed, (i, j, length) => {
        const likeness = likenessOf(text, all.slice(spans[i].start, spans[j].end));
        if (likeness >= REVIEW_AT) found.push(place(spans[i], spans[j], coverageOf(part, spans[i], length), likeness));
      });
    }
    return found.sort((a, b) => b.likeness - a.likeness);
  }

  return {
    /**
     * The verses from `from` to `to` ("sura:aya"), or null unless both exist, in one surah and in order.
     * `source` is their lines as downloaded, which is what a decision is tied to.
     */
    range(from, to) {
      if (!KEY.test(from) || !KEY.test(to)) return null;
      const i = indexOfKey.get(from);
      const j = indexOfKey.get(to);
      if (i === undefined || j === undefined || j < i || spans[i].sura !== spans[j].sura) return null;
      const run = spans.slice(i, j + 1);
      return {
        from,
        to,
        source: run.map((v) => v.line).join("\n"),
        arabic: run.map((v) => v.arabic).join("\n"),
        length: spans[j].end - spans[i].start,
        first: spans[i],
      };
    },

    /** Whether `from` to `to` hold exactly the part's Arabic, or more, and how alike the two are. */
    measure(arabic, from, to) {
      const run = this.range(from, to);
      if (!run) return null;
      const part = normalizeArabic(arabic);
      const compared = (mayPrecede(run.first) && withoutBasmala(part)) || part;
      const likeness = compared ? likenessOf(compared, all.slice(run.first.start, run.first.start + run.length)) : 0;
      return { coverage: coverageOf(part, run.first, run.length), likeness };
    },

    /**
     * Where a part's Arabic is.
     * @returns {{ auto: boolean, places: { from: string, to: string, coverage: "full"|"partial", likeness: number }[], total: number }}
     *   `auto` is true only for one run of whole verses that no other run repeats. `places` holds at most `PLACES`
     *   of the `total` found.
     */
    locate(arabic) {
      const part = normalizeArabic(arabic);
      const result = (places, auto = false) => ({ auto, places: places.slice(0, PLACES), total: places.length });
      if (!part) return result([]);

      const asStored = occurrences(part);
      const stripped = withoutBasmala(part);
      // Without its basmala a part may only be found at the start of a surah.
      const atStart = stripped ? occurrences(stripped).filter((o) => mayPrecede(o.first) && o.at === o.first.start) : [];
      const exact = [...asStored, ...atStart];

      const whole = exact.filter((o) => o.whole);
      if (whole.length) return result(whole.map((o) => place(o.first, o.last, "full", 1)), whole.length === 1);
      if (exact.length) return result(exact.map((o) => place(o.first, o.last, "partial", 1)));
      return result(alike(part));
    },
  };
}
