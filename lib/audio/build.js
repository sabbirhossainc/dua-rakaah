// Builds the shipped list of recordings from the dua parts, the source items, the Quran text and a person's decisions
// (design D1 to D3 of the two audio changes). Pure apart from hashing: reading and writing files is the command's job.
import { normalizeArabic } from "./arabic.js";
import { compare, isAutoAccepted, isReportable, needsReview } from "./match.js";
import { partKey, textSha } from "./parts.js";

export const PROVIDER = "hisnmuslim";
/** How many candidates the report shows for a part with nothing accepted. */
export const CLOSEST = 3;

// A decision is about a recording's item or about a run of Quran verses, never both.
const ITEM_KEYS = ["dua_id", "part", "item", "decision", "text_sha", "item_sha", "note"];
const VERSE_KEYS = ["dua_id", "part", "verses", "decision", "text_sha", "verses_sha", "note"];
const VERSES = /^([1-9]\d{0,2}:[1-9]\d{0,2})-([1-9]\d{0,2}:[1-9]\d{0,2})$/;
const SHA = /^[0-9a-f]{64}$/;
const isId = (n) => Number.isSafeInteger(n) && n > 0;
const pairKey = (duaId, part, item) => `${partKey(duaId, part)}:${item}`;
const runKey = (duaId, part, verses) => `${partKey(duaId, part)}:verses:${verses}`;
const isVerseDecision = (d) => Object.hasOwn(d, "verses");
const round3 = (n) => Math.round(n * 1000) / 1000;

/** Thrown when the decisions cannot be used. `problems` lists every one found. */
export class DecisionError extends Error {
  constructor(problems) {
    super(`The review decisions have ${problems.length} problem(s):\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "DecisionError";
    this.problems = problems;
  }
}

/**
 * Checks the shape of the decisions and that each names a part with Arabic text, and an item or a run of verses that
 * exists.
 */
function checkDecisions(decisions, partsByKey, itemsById, quran) {
  if (!Array.isArray(decisions)) throw new DecisionError(["the file must hold a list"]);
  const problems = [];
  const seen = new Set();
  decisions.forEach((d, i) => {
    const where = `entry ${i + 1}`;
    if (!d || typeof d !== "object" || Array.isArray(d)) return problems.push(`${where}: not an object`);
    const ofVerses = isVerseDecision(d);
    const unknown = Object.keys(d).filter((k) => !(ofVerses ? VERSE_KEYS : ITEM_KEYS).includes(k));
    if (unknown.length) problems.push(`${where}: unknown field(s) ${unknown.join(", ")}`);
    const ids = ofVerses ? ["dua_id", "part"] : ["dua_id", "part", "item"];
    for (const k of ids) if (!isId(d[k])) problems.push(`${where}: "${k}" must be a positive whole number`);
    const range = ofVerses && typeof d.verses === "string" ? VERSES.exec(d.verses) : null;
    if (ofVerses && !range) problems.push(`${where}: "verses" must look like "2:285-2:286"`);
    if (d.decision !== "approve" && d.decision !== "reject") problems.push(`${where}: "decision" must be "approve" or "reject"`);
    for (const k of ["text_sha", ofVerses ? "verses_sha" : "item_sha"]) {
      if (typeof d[k] !== "string" || !SHA.test(d[k])) problems.push(`${where}: "${k}" must be a SHA-256 in hex`);
    }
    if (d.note !== undefined && typeof d.note !== "string") problems.push(`${where}: "note" must be text`);
    if (!ids.every((k) => isId(d[k])) || (ofVerses && !range)) return;
    const part = partsByKey.get(partKey(d.dua_id, d.part));
    if (!part) problems.push(`${where}: dua ${d.dua_id} has no part ${d.part}`);
    else if (!part.arabic) problems.push(`${where}: dua ${d.dua_id} part ${d.part} has no Arabic text`);
    if (ofVerses) {
      if (!quran?.range(range[1], range[2])) problems.push(`${where}: the Quran text has no verses ${d.verses} in one surah`);
    } else if (!itemsById.has(d.item)) problems.push(`${where}: the source has no item ${d.item}`);
    const key = ofVerses ? runKey(d.dua_id, d.part, d.verses) : pairKey(d.dua_id, d.part, d.item);
    const about = ofVerses ? `verses ${d.verses}` : `item ${d.item}`;
    if (seen.has(key)) problems.push(`${where}: a second decision for dua ${d.dua_id} part ${d.part} ${about}`);
    seen.add(key);
  });
  if (problems.length) throw new DecisionError(problems);
}

/**
 * The verses of one part: what to ship, and what to show a person.
 * @returns {{ accepted: object|null, entries: object[], total: number, stale: object[] }}  An entry is
 *   `{ from, to, coverage, likeness, status, verses_sha, arabic, outdated }` with status "approved", "auto",
 *   "review" or "rejected". `total` counts the places the text was found in.
 */
function versesFor(part, sha, quran, decisions) {
  const found = quran.locate(part.arabic);
  const mine = new Map(
    decisions.filter((d) => isVerseDecision(d) && d.dua_id === part.dua_id && d.part === part.part).map((d) => [d.verses, d])
  );
  const places = new Map(found.places.map((p) => [`${p.from}-${p.to}`, p]));
  // A decided run is shown and applied even when the search did not list it.
  for (const verses of mine.keys()) {
    if (places.has(verses)) continue;
    const [from, to] = verses.split("-");
    places.set(verses, { from, to, ...quran.measure(part.arabic, from, to) });
  }

  const stale = [];
  const entries = [...places].map(([verses, at]) => {
    const run = quran.range(at.from, at.to);
    const versesSha = textSha(run.source);
    const decision = mine.get(verses);
    // A decision counts only for the two texts that were reviewed.
    const outdated = !!decision && (decision.text_sha !== sha || decision.verses_sha !== versesSha);
    if (outdated) stale.push(decision);
    let status;
    if (decision && !outdated) status = decision.decision === "approve" ? "approved" : "rejected";
    // An outdated rejection still stops automatic acceptance.
    else if (found.auto && !(outdated && decision.decision === "reject")) status = "auto";
    else status = "review";
    return { ...at, status, verses_sha: versesSha, arabic: run.arabic, outdated };
  });

  const approved = entries.filter((e) => e.status === "approved");
  if (approved.length > 1) {
    const runs = approved.map((e) => `${e.from}-${e.to}`).join(" and ");
    throw new DecisionError([`dua ${part.dua_id} part ${part.part}: only one run of verses can be approved, not ${runs}`]);
  }
  const accepted = approved[0] ?? entries.find((e) => e.status === "auto") ?? null;
  // A person's choice replaces the automatic one.
  const shown = accepted ? [accepted] : entries;
  return { accepted, entries: shown, total: Math.max(found.total, shown.length), stale };
}

const shippedVerses = (e) => ({ from: e.from, to: e.to, coverage: e.coverage, approved: e.status === "approved" });

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
 * @param {ReturnType<typeof import("./quran.js").createLocator>} [input.quran]  Without it no verses are listed.
 * @param {{ dua_id: number, cat_id: number, part: number, arabic: string|null }[]} input.parts  From `listParts`.
 * @param {{ id: number, arabic: string, url: string|null }[]} input.items  `url` is null when the address was refused.
 * @param {unknown} input.decisions  The parsed review file.
 * @returns {{
 *   recordings: object[],
 *   report: { part: object, accepted: boolean, review: boolean, entries: object[], verses: object|null }[],
 *   stale: object[]
 * }}  An entry is `{ item, likeness, contained, status, item_sha, outdated }` with status "approved", "auto",
 *     "review", "weak" or "rejected".
 */
export function buildRecordings({ parts, items, decisions, quran = null }) {
  const partsByKey = new Map(parts.map((p) => [partKey(p.dua_id, p.part), p]));
  const prepared = items.map((item) => ({ ...item, normalized: normalizeArabic(item.arabic), sha: textSha(item.arabic) }));
  const itemsById = new Map(prepared.map((i) => [i.id, i]));
  checkDecisions(decisions, partsByKey, itemsById, quran);
  const byPair = new Map(decisions.filter((d) => !isVerseDecision(d)).map((d) => [pairKey(d.dua_id, d.part, d.item), d]));

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
    const verses = quran ? versesFor(part, sha, quran, decisions) : null;
    if (verses) stale.push(...verses.stale);
    if (accepted.length || verses?.accepted) {
      recordings.push({
        dua_id: part.dua_id,
        part: part.part,
        text_sha: sha,
        quran: verses?.accepted ? shippedVerses(verses.accepted) : null,
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
    const versesNeedReview = !!verses && !verses.accepted && verses.entries.some((e) => e.status === "review");
    report.push({
      part: { ...part, text_sha: sha },
      accepted: accepted.length > 0 || !!verses?.accepted,
      review: versesNeedReview || (!accepted.length && shown.some((e) => e.status === "review")),
      entries: shown,
      verses: verses?.entries.length ? { entries: verses.entries, total: verses.total } : null,
    });
  }
  return { recordings, report, stale };
}

/** The text of the shipped file. No timestamps, so the same inputs give the same bytes. */
export const serializeSources = (recordings) => `${JSON.stringify({ version: 2, recordings }, null, 2)}\n`;

/** Parts that had a recording in `before` and have none in `after`. */
export function lostRecordings(before, after) {
  const kept = new Set(after.map((r) => partKey(r.dua_id, r.part)));
  return before.filter((r) => !kept.has(partKey(r.dua_id, r.part))).map((r) => ({ dua_id: r.dua_id, part: r.part }));
}

/** Parts that had Quran verses in `before` and have none in `after`, but still have another recording. */
export function lostVerses(before, after) {
  const kept = new Map(after.map((r) => [partKey(r.dua_id, r.part), r]));
  return before
    .filter((r) => r.quran && kept.has(partKey(r.dua_id, r.part)) && !kept.get(partKey(r.dua_id, r.part)).quran)
    .map((r) => ({ dua_id: r.dua_id, part: r.part }));
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
