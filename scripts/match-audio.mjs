// Matches the Arabic of every dua part with the Hisn al-Muslim recordings (design D1 to D3).
//   npm run audio:match              downloads the source again
//   npm run audio:match -- --cached  reuses the download in .audio-cache/
// Reads data/dua_main.sqlite (never changes it) and data/audio-review.json, and writes data/audio-sources.json and
// .audio-cache/report.html. If anything fails, the shipped list is left as it was.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildRecordings, coverage, lostRecordings, serializeSources } from "../lib/audio/build.js";
import { listParts } from "../lib/audio/parts.js";
import { renderReport } from "../lib/audio/report.js";
import { loadSource } from "../lib/audio/source.js";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const DEFAULT_PATHS = {
  dbPath: path.join(ROOT, "data", "dua_main.sqlite"),
  sourcesPath: path.join(ROOT, "data", "audio-sources.json"),
  reviewPath: path.join(ROOT, "data", "audio-review.json"),
  cacheDir: path.join(ROOT, ".audio-cache"),
};
const TIMEOUT_MS = 30_000;

/** Downloads `url`. A redirect is refused: the addresses are built here and must be answered where they are. */
async function download(url) {
  const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** A fetcher that keeps every body in `dir`, and with `cached` answers from there when it can. */
export function cachingFetch(dir, { cached = false, get = download } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  return async (url, name) => {
    const file = path.join(dir, name);
    if (cached && fs.existsSync(file)) return fs.readFileSync(file, "utf8");
    let body;
    try {
      body = await get(url);
    } catch (err) {
      throw new Error(`Could not download ${url}: ${err.cause?.message ?? err.message}`);
    }
    fs.writeFileSync(file, body);
    return body;
  };
}

function readContent(dbPath) {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    // The same order the category pages read, so parts get the same numbers.
    const rows = db.prepare("SELECT * FROM dua ORDER BY cat_id, subcat_id, dua_id, rowid").all();
    const names = new Map(db.prepare("SELECT cat_id, cat_name_en FROM category").all().map((c) => [c.cat_id, c.cat_name_en]));
    return { parts: listParts(rows), names };
  } finally {
    db.close();
  }
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Could not read ${file}: ${err.message}`);
  }
}

/** Writes through a temporary file, so a failure cannot leave half a list. Line endings alone are not a change. */
function writeIfChanged(file, text) {
  if (fs.existsSync(file) && fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") === text) return false;
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
  return true;
}

/**
 * @param {typeof DEFAULT_PATHS & { fetchText: (url: string, name: string) => Promise<string>, log?: (line: string) => void }} options
 */
export async function matchAudio({ dbPath, sourcesPath, reviewPath, cacheDir, fetchText, log = console.log }) {
  const { parts, names } = readContent(dbPath);
  const decisions = readJson(reviewPath);
  const before = fs.existsSync(sourcesPath) ? readJson(sourcesPath).recordings : [];
  const source = await loadSource(fetchText);
  const { recordings, report, stale } = buildRecordings({ parts, items: source.items, decisions });

  const counts = coverage(parts, recordings);
  const share = (c) => `${c.partsWith} of ${c.parts} parts, ${c.duasWith} of ${c.duas} duas`;
  const summary = [
    `Source: ${source.items.length} items from ${source.chapters} chapters`,
    `With a recording: ${share(counts.total)}`,
    ...counts.categories.map((c) => `  ${c.cat_id} ${names.get(c.cat_id) ?? ""}: ${share(c)}`),
    `Parts needing review: ${report.filter((r) => r.review).length}`,
    `Recordings accepted automatically below 100%: ${report.flatMap((r) => r.entries).filter((e) => e.status === "auto" && e.likeness < 1).length}`,
  ];
  const warnings = [
    ...source.unreadable.map((id) => `Chapter ${id} could not be read and was skipped`),
    ...source.badItems.map((where) => `Skipped an item with no usable ID or text: ${where}`),
    ...source.badUrls.map((b) => `Item ${b.item} has an unexpected audio address, so it is not listed: ${b.address}`),
    ...stale.map((d) => `Out-of-date decision ignored: dua ${d.dua_id} part ${d.part}, item ${d.item} (${d.decision})`),
    ...lostRecordings(before, recordings).map((l) => `Lost its recording: dua ${l.dua_id} part ${l.part}`),
  ];

  fs.mkdirSync(cacheDir, { recursive: true });
  const reportPath = path.join(cacheDir, "report.html");
  fs.writeFileSync(reportPath, renderReport({ report, stale, summary: [...summary, ...warnings] }));
  const changed = writeIfChanged(sourcesPath, serializeSources(recordings));

  for (const line of summary) log(line);
  for (const warning of warnings) log(`WARNING  ${warning}`);
  log(`${changed ? "Wrote" : "No change to"} ${sourcesPath}`);
  log(`Review report: ${reportPath}`);
  return { recordings, report, stale, warnings, changed, reportPath, coverage: counts };
}

async function main(argv) {
  const unknown = argv.filter((a) => a !== "--cached");
  if (unknown.length) {
    console.error(`Unknown option: ${unknown.join(" ")}. The only option is --cached.`);
    return 1;
  }
  const fetchText = cachingFetch(DEFAULT_PATHS.cacheDir, { cached: argv.includes("--cached") });
  try {
    await matchAudio({ ...DEFAULT_PATHS, fetchText });
    return 0;
  } catch (err) {
    console.error(err.message);
    console.error("The list of recordings was not changed.");
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
