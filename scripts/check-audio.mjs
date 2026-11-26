// Checks that every listed recording still answers with audio (design D6). Nothing schedules it: see the README.
//   npm run audio:check [path-to-list]
// Asks for the first byte of each distinct address, one at a time, and tries a failed one once more. It changes
// nothing. The exit code is 1 if any address fails or the list cannot be read.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
    let problem;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      problem = await problemWith(url);
      if (!problem) break;
    }
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
  return failures.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
