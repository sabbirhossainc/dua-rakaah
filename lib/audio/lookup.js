// Which shipped recordings and verses belong to which part (design D4). Server only: it hashes with node:crypto.
// A recording is offered only while the part's Arabic text is the one it was matched against.
import { groupDuas } from "../content.js";
import { numberParts, partKey, textSha } from "./parts.js";

/** Every verse key from `from` to `to`, which are in one surah: "2:285" to "2:286". */
export function versesBetween(from, to) {
  const [sura, first] = from.split(":").map(Number);
  const last = Number(to.split(":")[1]);
  return Array.from({ length: last - first + 1 }, (_, i) => `${sura}:${first + i}`);
}

const byPart = (sources) => new Map(sources.recordings.map((r) => [partKey(r.dua_id, r.part), r]));
const stillMatches = (entry, content) => !!entry && !!content.arabic && textSha(content.arabic) === entry.text_sha;

/**
 * @param {ReturnType<typeof import("../content.js").groupDuas>} duas
 * @param {{ recordings: { dua_id: number, part: number, text_sha: string, quran?: { coverage: string }|null,
 *   candidates: { url: string }[] }[] }} sources  The contents of data/audio-sources.json.
 * @param {{ quran?: boolean }} [options]  `quran`: whether the Quran.com source is set up.
 * @returns The same duas, each part with `audio` or null. `audio` is
 *   `{ key, duaId, part, urls, quran }`: `urls` in play order, and `quran` as `{ coverage }` when the part has verses
 *   that can be offered. Verse keys and Quran.com addresses never leave the server this way.
 */
export function withRecordings(duas, sources, { quran = false } = {}) {
  const listed = byPart(sources);
  const audio = new Map();
  for (const { dua_id, part, content } of numberParts(duas)) {
    const key = partKey(dua_id, part);
    const entry = listed.get(key);
    if (!stillMatches(entry, content)) continue;
    const urls = entry.candidates.map((c) => c.url);
    const verses = quran && entry.quran ? { coverage: entry.quran.coverage } : null;
    if (urls.length || verses) audio.set(content, { key, duaId: dua_id, part, urls, quran: verses });
  }
  return duas.map((dua) => ({ ...dua, parts: dua.parts.map((p) => ({ ...p, audio: audio.get(p) ?? null })) }));
}

/**
 * The verses listed for one part.
 * @param {object[]} rows  All content rows of the dua, in stored order.
 * @returns {{ verses: string[], coverage: "full"|"partial" } | null} Null when the part has none or its text changed.
 */
export function listedVerses(rows, sources, duaId, part) {
  const found = numberParts(groupDuas(rows, "en")).find((p) => p.dua_id === duaId && p.part === part);
  const entry = byPart(sources).get(partKey(duaId, part));
  if (!found || !stillMatches(entry, found.content) || !entry.quran) return null;
  const { from, to, coverage } = entry.quran;
  return { verses: versesBetween(from, to), coverage };
}
