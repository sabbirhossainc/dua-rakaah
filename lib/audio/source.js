// Reading the Hisn al-Muslim data (design D3). The data is untrusted: an ID is used in an address or a file name only
// once it is known to be a positive whole number, and an audio address is listed only if it is on the source's own
// audio path. Downloading and caching are passed in, so this has no network or file access of its own.

const ORIGIN = "https://www.hisnmuslim.com";
export const INDEX_URL = `${ORIGIN}/api/en/husn_en.json`;
export const chapterUrl = (id) => `${ORIGIN}/api/ar/${id}.json`;
const AUDIO_URL = /^https:\/\/www\.hisnmuslim\.com\/audio\/ar\/[0-9]+\.mp3$/;

const isId = (n) => Number.isSafeInteger(n) && n > 0;

/** JSON that may start with a byte order mark. */
export const parseJson = (text) => JSON.parse(text.replace(/^﻿/, ""));

/** The address to play, always `https`, or null if it is not on the source's audio path. */
export function audioUrl(value) {
  if (typeof value !== "string") return null;
  const secure = value.replace(/^http:\/\//, "https://");
  return AUDIO_URL.test(secure) ? secure : null;
}

/** The list inside `{ "<title>": [ ... ] }`, which is the shape of both the index and a chapter. */
function listIn(body) {
  const data = parseJson(body);
  const list = data && typeof data === "object" ? Object.values(data).find(Array.isArray) : undefined;
  if (!list) throw new Error("no list in the data");
  return list;
}

/**
 * @param {(url: string, name: string) => Promise<string>} fetchText  The body of `url`. Throws on any network or HTTP
 *   failure, which stops the whole read. `name` is a safe file name for a cache.
 * @returns {Promise<{
 *   items: { id: number, arabic: string, url: string|null }[],
 *   chapters: number,
 *   unreadable: (number|string)[],
 *   badItems: string[],
 *   badUrls: { item: number, address: string }[]
 * }>}
 */
export async function loadSource(fetchText) {
  const index = listIn(await fetchText(INDEX_URL, "index.json"));
  const items = new Map();
  const unreadable = [];
  const badItems = [];
  const badUrls = [];
  let chapters = 0;

  for (const entry of index) {
    const id = entry?.ID;
    if (!isId(id)) {
      unreadable.push(JSON.stringify(id) ?? "(no ID)");
      continue;
    }
    const body = await fetchText(chapterUrl(id), `chapter-${id}.json`);
    let list;
    try {
      list = listIn(body);
    } catch {
      unreadable.push(id);
      continue;
    }
    chapters++;
    for (const raw of list) {
      if (!isId(raw?.ID) || typeof raw.ARABIC_TEXT !== "string" || raw.ARABIC_TEXT.trim() === "") {
        badItems.push(`chapter ${id}, item ${JSON.stringify(raw?.ID) ?? "(no ID)"}`);
        continue;
      }
      if (items.has(raw.ID)) continue;
      const url = audioUrl(raw.AUDIO);
      if (!url) badUrls.push({ item: raw.ID, address: String(raw.AUDIO) });
      items.set(raw.ID, { id: raw.ID, arabic: raw.ARABIC_TEXT, url });
    }
  }
  if (items.size === 0) throw new Error("the source gave no items at all");
  return { items: [...items.values()], chapters, unreadable, badItems, badUrls };
}
