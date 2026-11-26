// Puts the shipped recordings on the parts of grouped duas (design D4). Server only: it hashes with node:crypto.
// A recording is offered only while the part's Arabic text is the one it was matched against.
import { numberParts, partKey, textSha } from "./parts.js";

/**
 * @param {ReturnType<typeof import("../content.js").groupDuas>} duas
 * @param {{ recordings: { dua_id: number, part: number, text_sha: string, candidates: { url: string }[] }[] }} sources
 *   The contents of data/audio-sources.json.
 * @returns The same duas, each part with `audio`: `{ key, urls }` in play order, or null.
 */
export function withRecordings(duas, sources) {
  const listed = new Map(sources.recordings.map((r) => [partKey(r.dua_id, r.part), r]));
  const audio = new Map();
  for (const { dua_id, part, content } of numberParts(duas)) {
    const key = partKey(dua_id, part);
    const entry = listed.get(key);
    if (entry && content.arabic && textSha(content.arabic) === entry.text_sha && entry.candidates.length) {
      audio.set(content, { key, urls: entry.candidates.map((c) => c.url) });
    }
  }
  return duas.map((dua) => ({ ...dua, parts: dua.parts.map((p) => ({ ...p, audio: audio.get(p) ?? null })) }));
}
