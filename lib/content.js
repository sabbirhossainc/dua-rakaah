// Pure helpers for shaping dua content: language columns, slugs, URL parsing, grouping.
// Deliberately imports neither the database nor "server-only", so `node --test` can load it.

export const LANGS = ["en", "bn"];

/** URL prefix for a language: English has none, Bangla lives under /bn. */
export function langPrefix(lang) {
  return lang === "bn" ? "/bn" : "";
}

/** Returns a non-blank string, or null for NULL, undefined and whitespace-only values. */
function text(value) {
  if (typeof value !== "string") return null;
  return value.trim() === "" ? null : value;
}

/** The `<field>_<lang>` column of a row. Never falls back to the other language. */
export function pick(row, field, lang) {
  return text(row?.[`${field}_${lang}`]);
}

/** Lowercase English name, apostrophes removed, other runs of non-alphanumerics become one hyphen. */
export function categorySlug(nameEn) {
  return String(nameEn)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function categoryHref(cat, lang) {
  return `${langPrefix(lang)}/duas/${categorySlug(cat.cat_name_en)}?cat=${cat.cat_id}`;
}

/** A single positive-integer string becomes a number. Anything else (arrays, "", "5.0", "abc") is null. */
export function parseCat(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * Rows that share a `dua.id` are the parts of one dua. Groups keep first-seen order and
 * each group's parts keep the input order. The title comes from the part that has a name.
 */
export function groupDuas(rows, lang) {
  const byId = new Map();
  for (const row of rows) {
    let group = byId.get(row.id);
    if (!group) {
      group = {
        id: row.id,
        cat_id: row.cat_id,
        subcat_id: row.subcat_id,
        dua_id: row.dua_id,
        title: null,
        parts: [],
      };
      byId.set(row.id, group);
    }
    group.title ??= pick(row, "dua_name", lang);
    group.parts.push({
      top: pick(row, "top", lang),
      arabic: text(row.dua_arabic),
      transliteration: pick(row, "transliteration", lang),
      translation: pick(row, "translation", lang),
      bottom: pick(row, "bottom", lang),
      reference: pick(row, "refference", lang),
    });
  }
  return [...byId.values()];
}

/** `[{ subcat, duas }]` in subcat_id order, with duas in dua_id order (stable for ties). */
export function groupBySubcategory(subcats, duas) {
  return [...subcats]
    .sort((a, b) => a.subcat_id - b.subcat_id)
    .map((subcat) => ({
      subcat,
      duas: duas
        .filter((d) => d.subcat_id === subcat.subcat_id)
        .sort((a, b) => a.dua_id - b.dua_id),
    }));
}

// Pages that exist in both languages: the content pages and the bookmark page.
const EN_DUAS = /^\/(?:duas|bookmark)(\/|$)/;
const BN_DUAS = /^\/bn(\/(?:duas|bookmark)(\/|$))/;

/**
 * Where the language switch should go. `/duas...`, `/bookmark` and their `/bn/...` versions swap prefix and keep the
 * query string and fragment. Other pages have no Bangla version, so Bangla goes to `/bn/duas`
 * and English stays where it is.
 */
export function switchLanguageHref(pathname, search, hash, target) {
  const q = search ? (search.startsWith("?") ? search : `?${search}`) : "";
  const h = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";

  let enPath = null;
  if (BN_DUAS.test(pathname)) enPath = pathname.slice(3);
  else if (EN_DUAS.test(pathname)) enPath = pathname;

  if (target === "bn") return enPath === null ? "/bn/duas" : `/bn${enPath}${q}${h}`;
  return `${enPath ?? pathname}${q}${h}`;
}

/** "bn" for /bn and anything under /bn/, otherwise "en". `/bnx` is not Bangla. */
export function langFromPathname(pathname) {
  return /^\/bn(\/|$)/.test(pathname ?? "") ? "bn" : "en";
}
