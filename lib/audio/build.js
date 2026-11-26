// Builds the shipped list of recordings from the dua parts, the source items and a person's decisions (design D1, D2).
// Pure apart from hashing: reading and writing files is the command's job.
import { normalizeArabic } from "./arabic.js";
import { compare, isAutoAccepted, isReportable, needsReview } from "./match.js";
import { partKey, textSha } from "./parts.js";

export const PROVIDER = "hisnmuslim";
/** How many candidates the report shows for a part with nothing accepted. */
export const CLOSEST = 3;

const DECISION_KEYS = ["dua_id", "part", "item", "decision", "text_sha", "item_sha", "note"];
const SHA = /^[0-9a-f]{64}$/;
const isId = (n) => Number.isSafeInteger(n) && n > 0;
const pairKey = (duaId, part, item) => `${partKey(duaId, part)}:${item}`;
const round3 = (n) => Math.round(n * 1000) / 1000;

/** Thrown when the decisions cannot be used. `problems` lists every one found. */
export class DecisionError extends Error {
  constructor(problems) {
    super(`The review decisions have ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "DecisionError";
    this.problems = problems;
  }
}

/** Checks the shape of the decisions and that each names a part with Arabic text and an item that exist. */
function checkDecisions(decisions, partsByKey, itemsById) {
  if (!Array.isArray(decisions)) throw new DecisionError(["the file must hold a list"]);
  const problems = [];
  const seen = new Set();
  decisions.forEach((d, i) => {
    const where = `entry ${i + 1}`;
    if (!d || typeof d !== "object" || Array.isArray(d)) return problems.push(`${where}: not an object`);
    const unknown = Object.keys(d).filter((k) => !DECISION_KEYS.includes(k));
    if (unknown.length) problems.push(`${where}: unknown field(s) ${unknown.join(", ")}`);
    for (const k of ["dua_id", "part", "item"]) if (!isId(d[k])) problems.push(`${where}: "${k}" must be a positive whole number`);
    if (d.decision !== "approve" && d.decision !== "reject") problems.push(`${where}: "decision" must be "approve" or "reject"`);
    for (const k of ["text_sha", "item_sha"]) if (typeof d[k] !== "string" || !SHA.test(d[k])) problems.push(`${where}: "${k}" must be a SHA-256 in hex`);
    if (d.note !== undefined && typeof d.note !== "string") problems.push(`${where}: "note" must be text`);
    if (!isId(d.dua_id) || !isId(d.part) || !isId(d.item)) return;
    const part = partsByKey.get(partKey(d.dua_id, d.part));
    if (!part) problems.push(`${where}: dua ${d.dua_id} has no part ${d.part}`);
    else if (!part.arabic) problems.push(`${where}: dua ${d.dua_id} part ${d.part} has no Arabic text`);
    if (!itemsById.has(d.item)) problems.push(`${where}: the source has no item ${d.item}`);
    const key = pairKey(d.dua_id, d.part, d.item);
    if (seen.has(key)) problems.push(`${where}: a second decision for dua ${d.dua_id} part ${d.part} item ${d.item}`);
    seen.add(key);
  });
  if (problems.length) throw new DecisionError(problems);
}

// Report order: pairs a person should look at first, then by likeness, with rejected ones last.
const closestFirst = (a, b) =>
  (a.status === "rejected") - (b.status === "rejected") ||
  (b.status === "review") - (a.status === "review") ||
  b.likeness - a.likeness ||
  b.contained - a.contained ||
  a.item.id - b.item.id;

const playOrder = (a, b) =>
  (b.status === "approved") - (a.status === "approved") || b.likeness - a.likeness || a.item.id - b.item.id;

/**
 * @param {object} input
 * @param {{ dua_id: number, cat_id: number, part: number, arabic: string|null }[]} input.parts  From `listParts`.
 * @param {{ id: number, arabic: string, url: string|null }[]} input.items  `url` is null when the address was refused.
 * @param {unknown} input.decisions  The parsed review file.
 * @returns {{
 *   recordings: object[],
 *   report: { part: object, accepted: boolean, review: boolean, entries: object[] }[],
 *   stale: object[]
 * }}  An entry is `{ item, likeness, contained, status, item_sha, outdated }` with status "approved", "auto",
 *     "review", "weak" or "rejected".
 */
export function buildRecordings({ parts, items, decisions }) {
  const partsByKey = new Map(parts.map((p) => [partKey(p.dua_id, p.part), p]));
  const prepared = items.map((item) => ({ ...item, normalized: normalizeArabic(item.arabic), sha: textSha(item.arabic) }));
  const itemsById = new Map(prepared.map((i) => [i.id, i]));
  checkDecisions(decisions, partsByKey, itemsById);
  const byPair = new Map(decisions.map((d) => [pairKey(d.dua_id, d.part, d.item), d]));

  const recordings = [];
  const report = [];
  const stale = [];
  const ordered = [...parts].sort((a, b) => a.dua_id - b.dua_id || a.part - b.part);

  for (const part of ordered) {
    if (!part.arabic) continue;
    const normalized = normalizeArabic(part.arabic);
    const sha = textSha(part.arabic);
    const entries = [];
    for (const item of prepared) {
      const figures = compare(normalized, item.normalized);
      const decision = byPair.get(pairKey(part.dua_id, part.part, item.id));
      // A decision counts only for the two texts that were reviewed.
      const outdated = !!decision && (decision.text_sha !== sha || decision.item_sha !== item.sha);
      if (outdated) stale.push(decision);
      let status;
      if (decision && !outdated) status = decision.decision === "approve" ? "approved" : "rejected";
      // An outdated rejection still stops automatic acceptance: a person has to look again.
      else if (outdated && decision.decision === "reject") status = "review";
      else if (isAutoAccepted(figures)) status = "auto";
      else if (needsReview(figures)) status = "review";
      else if (isReportable(figures) || outdated) status = "weak";
      else continue;
      entries.push({ item, ...figures, status, item_sha: item.sha, outdated });
    }

    const accepted = entries.filter((e) => (e.status === "approved" || e.status === "auto") && e.item.url).sort(playOrder);
    if (accepted.length) {
      recordings.push({
        dua_id: part.dua_id,
        part: part.part,
        text_sha: sha,
        candidates: accepted.map((e) => ({
          provider: PROVIDER,
          item: e.item.id,
          url: e.item.url,
          score: round3(e.likeness),
          approved: e.status === "approved",
        })),
      });
    }
    const shown = accepted.length ? accepted : entries.sort(closestFirst).slice(0, CLOSEST);
    report.push({
      part: { ...part, text_sha: sha },
      accepted: accepted.length > 0,
      review: !accepted.length && shown.some((e) => e.status === "review"),
      entries: shown,
    });
  }
  return { recordings, report, stale };
}

/** The text of the shipped file. No timestamps, so the same inputs give the same bytes. */
export const serializeSources = (recordings) => `${JSON.stringify({ version: 1, recordings }, null, 2)}\n`;

/** Parts that had a recording in `before` and have none in `after`. */
export function lostRecordings(before, after) {
  const kept = new Set(after.map((r) => partKey(r.dua_id, r.part)));
  return before.filter((r) => !kept.has(partKey(r.dua_id, r.part))).map((r) => ({ dua_id: r.dua_id, part: r.part }));
}

/**
 * Parts and duas with a recording, in total and per category. Only parts with Arabic text are counted.
 * @returns {{ total: object, categories: object[] }} each `{ cat_id?, parts, partsWith, duas, duasWith }`
 */
export function coverage(parts, recordings) {
  const have = new Set(recordings.map((r) => partKey(r.dua_id, r.part)));
  const count = (list) => {
    const arabic = list.filter((p) => p.arabic);
    const covered = arabic.filter((p) => have.has(partKey(p.dua_id, p.part)));
    return {
      parts: arabic.length,
      partsWith: covered.length,
      duas: new Set(arabic.map((p) => p.dua_id)).size,
      duasWith: new Set(covered.map((p) => p.dua_id)).size,
    };
  };
  const ids = [...new Set(parts.map((p) => p.cat_id))].sort((a, b) => a - b);
  return {
    total: count(parts),
    categories: ids.map((cat_id) => ({ cat_id, ...count(parts.filter((p) => p.cat_id === cat_id)) })),
  };
}
