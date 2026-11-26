// The review report: one static page with each part beside the recordings and Quran verses that may belong to it
// (design D3). Everything that comes from a source or the database is escaped.
import { CLOSEST } from "./build.js";
import { ACCEPT_AT, REPORT_AT, REVIEW_AT } from "./match.js";

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (c) => ENTITIES[c]);

// Rounded down, so that a pair just under a threshold never reads as having reached it.
const percent = (n) => `${Math.floor(n * 1000) / 10}%`;

const STATUS = {
  approved: "Approved by a person",
  auto: "Accepted automatically",
  review: "Needs review",
  weak: "Not accepted",
  rejected: "Rejected by a person",
};

/** The groups of the report, in the order a reviewer needs them. Each part is in the first group it fits. */
const GROUPS = [
  ["Needs review", (row) => row.review],
  ["Accepted automatically below 100%: listen to each", (row) => row.entries.some((e) => e.status === "auto" && e.likeness < 1)],
  ["Nothing accepted", (row) => !row.accepted && (row.entries.length > 0 || !!row.verses)],
  ["Accepted: check a sample", (row) => row.accepted],
  ["No candidate at all", () => true],
];

function decisionLine(part, entry, decision) {
  return JSON.stringify({ dua_id: part.dua_id, part: part.part, item: entry.item.id, decision, text_sha: part.text_sha, item_sha: entry.item_sha });
}

const arabic = (text) => `<p class="arabic" lang="ar" dir="rtl">${escapeHtml(text)}</p>`;

function entryHtml(part, entry) {
  const player = entry.item.url
    ? `<audio controls preload="none" src="${escapeHtml(entry.item.url)}"></audio>`
    : "<p>No playable address: this item can never be listed.</p>";
  return `<div class="pair">
<p><strong>Item ${escapeHtml(entry.item.id)}</strong> &middot; whole text ${percent(entry.likeness)} &middot; contained ${percent(entry.contained)} &middot; <span class="${escapeHtml(entry.status)}">${STATUS[entry.status]}</span>${entry.outdated ? " &middot; <em>an earlier decision is out of date</em>" : ""}</p>
<div class="texts"><div><h4>Card</h4>${arabic(part.arabic)}</div><div><h4>Recording's text</h4>${arabic(entry.item.arabic)}</div></div>
${player}
<p class="decide"><code>${escapeHtml(decisionLine(part, entry, "approve"))}</code><code>${escapeHtml(decisionLine(part, entry, "reject"))}</code></p>
</div>`;
}

function verseDecisionLine(part, entry, decision) {
  const verses = `${entry.from}-${entry.to}`;
  return JSON.stringify({ dua_id: part.dua_id, part: part.part, verses, decision, text_sha: part.text_sha, verses_sha: entry.verses_sha });
}

const COVERAGE = { full: "the verses hold exactly the card's words or less", partial: "the verses hold more than the card" };

function verseHtml(part, entry) {
  const verses = entry.from === entry.to ? entry.from : `${entry.from} to ${entry.to}`;
  return `<div class="pair">
<p><strong>Quran ${escapeHtml(verses)}</strong> &middot; ${percent(entry.likeness)} alike &middot; ${COVERAGE[entry.coverage]} &middot; <span class="${escapeHtml(entry.status)}">${STATUS[entry.status]}</span>${entry.outdated ? " &middot; <em>an earlier decision is out of date</em>" : ""}</p>
<div class="texts"><div><h4>Card</h4>${arabic(part.arabic)}</div><div><h4>Verses (Tanzil)</h4>${arabic(entry.arabic)}</div></div>
<p class="decide"><code>${escapeHtml(verseDecisionLine(part, entry, "approve"))}</code><code>${escapeHtml(verseDecisionLine(part, entry, "reject"))}</code></p>
</div>`;
}

function versesHtml(part, verses) {
  if (!verses) return "";
  const shown = verses.entries.length;
  const more = verses.total > shown ? `<p>Found in ${escapeHtml(verses.total)} places; showing ${shown}.</p>` : "";
  return `${more}${verses.entries.map((e) => verseHtml(part, e)).join("\n")}`;
}

function partHtml(row) {
  const { part } = row;
  const found = [versesHtml(part, row.verses), ...row.entries.map((e) => entryHtml(part, e))].filter(Boolean);
  return `<section><h3>Dua ${escapeHtml(part.dua_id)}, part ${escapeHtml(part.part)}${part.title ? `: ${escapeHtml(part.title)}` : ""}</h3>
${found.length ? found.join("\n") : arabic(part.arabic)}
</section>`;
}

/**
 * @param {object} input
 * @param {object[]} input.report  From `buildRecordings`.
 * @param {object[]} input.stale   Out-of-date decisions, from `buildRecordings`.
 * @param {string[]} input.summary  Lines shown at the top.
 */
export function renderReport({ report, stale, summary }) {
  let rest = report;
  const sections = GROUPS.map(([title, fits]) => {
    const rows = rest.filter(fits);
    rest = rest.filter((row) => !fits(row));
    return rows.length ? `<h2>${escapeHtml(title)} (${rows.length})</h2>\n${rows.map(partHtml).join("\n")}` : "";
  });
  const outdated = stale.length
    ? `<h2>Out-of-date decisions (${stale.length})</h2><p>The texts changed since these were made. Decide again and replace the old line.</p><ul>${stale
        .map((d) => `<li>dua ${escapeHtml(d.dua_id)} part ${escapeHtml(d.part)}, ${escapeHtml(d.verses ? `verses ${d.verses}` : `item ${d.item}`)} (${escapeHtml(d.decision)})</li>`)
        .join("")}</ul>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Audio match review</title>
<style>
body { font: 15px/1.5 system-ui, sans-serif; max-width: 70rem; margin: 0 auto; padding: 1rem; }
section { border-top: 1px solid #ccc; padding: .5rem 0 1rem; }
.pair { margin: .75rem 0 1.5rem; }
.texts { display: grid; grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr)); gap: 1rem; }
.arabic { font-size: 24px; line-height: 2; white-space: pre-line; background: #f6f6f4; padding: .5rem 1rem; margin: 0; }
h4 { margin: 0 0 .25rem; font-weight: 600; }
audio { width: 100%; margin-top: .5rem; }
code { display: block; user-select: all; font-size: 12px; background: #eef; padding: .25rem; margin: .25rem 0; overflow-wrap: anywhere; }
.review { color: #a15c00; } .rejected { color: #a30000; } .auto, .approved { color: #116611; }
</style>
</head>
<body>
<h1>Audio match review</h1>
<ul>${summary.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>
<p>A recording is accepted automatically only when the two whole texts are at least ${percent(ACCEPT_AT)} alike. A pair
reaching ${percent(REVIEW_AT)} on either figure needs review. A part with nothing accepted shows up to ${CLOSEST} items reaching ${percent(REPORT_AT)}.</p>
<p>Quran verses are accepted automatically only when the card is exactly one run of whole verses that appears nowhere
else. Anything else needs a person, and only one run can be approved for a part. This page cannot play verses: listen
to them in the running app. Quran text: <a href="https://tanzil.net">Tanzil Project</a>.</p>
<p><strong>Approve a recording only if it says what the card says: nothing missing and nothing extra.</strong> (A verse
that holds more than the card may be approved: the app then labels it "Full verse recitation".) To
decide, click one of the two lines under a pair, copy it into <code style="display:inline">data/audio-review.json</code>
(a list: put commas between the lines, inside the square brackets), then run <code style="display:inline">npm run audio:match</code> again.</p>
${outdated}
${sections.join("\n")}
</body>
</html>
`;
}
