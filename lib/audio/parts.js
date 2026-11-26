// Which part of which dua a recording belongs to, and the fingerprint of the text it was matched against
// (design D1, D4). Server and scripts only: uses node:crypto.
import crypto from "node:crypto";
import { groupDuas } from "../content.js";

/** SHA-256 of a text exactly as stored. Deliberately not normalized: any change to the text counts. */
export const textSha = (text) => crypto.createHash("sha256").update(text, "utf8").digest("hex");

/** The key of one part, used wherever parts are looked up. `part` is 1-based. */
export const partKey = (duaId, part) => `${duaId}:${part}`;

/**
 * The parts of grouped duas (from `groupDuas`), numbered. This is the only place a part gets its number, so the
 * matching command and the pages cannot disagree.
 */
export function numberParts(duas) {
  return duas.flatMap((dua) =>
    dua.parts.map((content, index) => ({ dua_id: dua.id, cat_id: dua.cat_id, title: dua.title, part: index + 1, content }))
  );
}

/**
 * Every part of every dua in content rows that are in stored order within each dua.
 * @returns {{ dua_id: number, cat_id: number, title: string|null, part: number, arabic: string|null }[]}
 */
export function listParts(rows) {
  return numberParts(groupDuas(rows, "en")).map(({ content, ...rest }) => ({ ...rest, arabic: content.arabic }));
}
