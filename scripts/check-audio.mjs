// Checks that every listed recording still answers with audio (design D6, D9). Nothing schedules it: see the README.
//   npm run audio:check [path-to-list]
// Asks for the first byte of each distinct address, one at a time, and tries a failed one once more. With Quran
// Foundation credentials it also asks for the default reciter's address of every listed verse and checks that too;
// without them it says how many verses were not checked. It changes nothing. The exit code is 1 if anything fails or
// the list cannot be read.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { versesBetween } from "../lib/audio/lookup.js";
import { createQuranClient } from "../lib/quran/client.js";
import { quranConfig } from "../lib/quran/config.js";
import { DEFAULT_RECITER, createRecitations } from "../lib/quran/recitations.js";

const DEFAULT_LIST = fileURLToPath(new URL("../data/audio-sources.json", import.meta.url));
const TIMEOUT_MS = 20_000;
const ATTEMPTS = 2;

/** Null when `url` answers with audio, otherwise why it did not. */
async function problemWith(url) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    // A server may ignore the range and send the whole file: do not download it.
    await res.body?.cancel();
    if (res.status !== 200 && res.status !== 206) return `HTTP ${res.status}`;
    const type = res.headers.get("content-type") ?? "";
    return type.toLowerCase().startsWith("audio/") ? null : `content type "${type || "(none)"}"`;
  } catch (err) {
    return err.cause?.message ?? err.message;
  }
}

/** Why `url` failed every attempt, or null once one succeeds. */
async function problemAfterRetry(url) {
  let problem;
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    problem = await problemWith(url);
    if (!problem) return null;
  }
  return problem;
}

/** The listed verses, each once, with the parts that use it. */
function listedVerseUsers(recordings) {
  const users = new Map();
  for (const r of recordings) {
    if (!r.quran) continue;
    for (const verse of versesBetween(r.quran.from, r.quran.to)) {
      if (!users.has(verse)) users.set(verse, []);
      users.get(verse).push(`dua ${r.dua_id} part ${r.part}`);
    }
  }
  return users;
}

/**
 * Checks that the default reciter has a working recording of every listed verse.
 * @param {ReturnType<typeof createRecitations>} service
 * @returns {Promise<{ checked: number, failures: { verse: string, problem: string, parts: string[] }[] }>}
 */
export async function checkVerses(recordings, service) {
  const users = listedVerseUsers(recordings);
  const failures = [];
  for (const [verse, parts] of users) {
    let problem;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      try {
        const { urls, reciter } = await service.recitation([verse], DEFAULT_RECITER);
        problem = reciter.id === DEFAULT_RECITER ? await problemWith(urls[0]) : "the default reciter has no recording";
      } catch (err) {
        problem = err.message;
      }
      if (!problem) break;
    }
    if (problem) failures.push({ verse, problem, parts });
  }
  return { checked: users.size, failures };
}

/**
 * @param {{ dua_id: number, part: number, candidates: { url: string }[] }[]} recordings
 * @returns {Promise<{ checked: number, failures: { url: string, problem: string, parts: string[] }[] }>}
 */
export async function checkRecordings(recordings) {
  const users = new Map();
  for (const r of recordings) {
    for (const c of r.candidates) {
      if (!users.has(c.url)) users.set(c.url, []);
      users.get(c.url).push(`dua ${r.dua_id} part ${r.part}`);
    }
  }
  const failures = [];
  for (const [url, parts] of users) {
    const problem = await problemAfterRetry(url);
    if (problem) failures.push({ url, problem, parts });
  }
  return { checked: users.size, failures };
}

async function main([file = DEFAULT_LIST]) {
  let recordings;
  try {
    recordings = JSON.parse(fs.readFileSync(path.resolve(file), "utf8")).recordings;
    if (!Array.isArray(recordings)) throw new Error("it holds no list of recordings");
  } catch (err) {
    console.error(`Could not read ${file}: ${err.message}`);
    return 1;
  }
  const { checked, failures } = await checkRecordings(recordings);
  for (const f of failures) console.error(`FAIL  ${f.url}: ${f.problem}\n        used by ${f.parts.join(", ")}`);
  console.log(`${checked} recording address(es) checked, ${failures.length} failed.`);
  return Math.max(failures.length ? 1 : 0, await reportVerses(recordings));
}

/** Checks the verses when the source is set up, and says what happened. Returns the exit code. */
async function reportVerses(recordings) {
  const config = quranConfig();
  if (!config) {
    const count = listedVerseUsers(recordings).size;
    console.log(`${count} listed Quran verse(s) not checked: no Quran Foundation credentials.`);
    return 0;
  }
  const service = createRecitations({ client: createQuranClient(config) });
  const { checked, failures } = await checkVerses(recordings, service);
  for (const f of failures) console.error(`FAIL  verse ${f.verse}: ${f.problem}\n        used by ${f.parts.join(", ")}`);
  console.log(`${checked} listed Quran verse(s) checked, ${failures.length} failed.`);
  return failures.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
