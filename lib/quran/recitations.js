// The Quran.com recitation of a run of verses, and the list of reciters (design D5). The client is passed in, so tests
// use a stand-in. Answers are kept in memory for one day at most and never written anywhere: the Quran Foundation's
// terms allow no copy older than a week.
import { DEFAULT_RECITER_ID } from "../preferences.js";

export const DEFAULT_RECITER = DEFAULT_RECITER_ID;
export const KEEP_MS = 24 * 60 * 60 * 1000;
export const TIMEOUT_MS = 10_000;
const AT_ONCE = 4;

// The Quran Foundation's audio hosts, as named in its Developer Terms.
const HOSTS = new Set(["verses.quran.com", "verses.quran.foundation", "audio.qurancdn.com", "quranicaudio.com"]);
const HOST_SUFFIX = ".quranicaudio.com";

/** The source did not give what was asked for. It carries no detail from the source. */
export class Unavailable extends Error {
  constructor(reason) {
    super(`Quran.com recitation unavailable: ${reason}`);
    this.name = "Unavailable";
    this.reason = reason;
  }
}

/** The address to play, always `https`, or null if it is not on one of the source's audio hosts. */
export function audioAddress(value) {
  if (typeof value !== "string") return null;
  let url;
  try {
    url = new URL(value.replace(/^\/\//, "https://").replace(/^http:\/\//i, "https://"));
  } catch {
    return null;
  }
  const allowed = HOSTS.has(url.hostname) || url.hostname.endsWith(HOST_SUFFIX);
  return url.protocol === "https:" && allowed && !url.port && !url.username && !url.password ? url.href : null;
}

/** Runs `task` over `values`, a few at a time, keeping their order. Starts nothing new after a failure. */
async function mapFew(values, task) {
  const results = new Array(values.length);
  let next = 0;
  let failed = false;
  const worker = async () => {
    while (!failed && next < values.length) {
      const i = next++;
      try {
        results[i] = await task(values[i]);
      } catch (err) {
        failed = true;
        throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(AT_ONCE, values.length) }, worker));
  return results;
}

/**
 * @param {object} deps
 * @param {ReturnType<typeof import("./client.js").createQuranClient>} deps.client
 * @param {() => number} [deps.now]
 * @param {(line: string) => void} [deps.log]  Receives a short line with no header, token or address in it.
 * @param {number} [deps.timeoutMs]
 */
export function createRecitations({ client, now = Date.now, log = console.error, timeoutMs = TIMEOUT_MS }) {
  const kept = new Map(); // key -> { value, until }
  const pending = new Map(); // key -> promise shared by everyone asking at the same time

  /** The kept answer for `key`, or the one `ask` gives. `ask` returns null for "the source has none". */
  async function remember(key, ask) {
    const held = kept.get(key);
    if (held && now() < held.until) return held.value;
    kept.delete(key);
    if (!pending.has(key)) {
      pending.set(
        key,
        ask()
          .then((value) => {
            if (value !== null) kept.set(key, { value, until: now() + KEEP_MS });
            return value;
          })
          .finally(() => pending.delete(key))
      );
    }
    return pending.get(key);
  }

  /** One call to the source, with a time limit. Null for "not found"; any other failure is `Unavailable`. */
  async function call(what, request) {
    let timer;
    const late = new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { name: "TimeoutError" })), timeoutMs);
    });
    try {
      return await Promise.race([request(), late]);
    } catch (err) {
      if (err?.status === 404) return null;
      // Only the status or the kind of error: the error itself may hold headers or the response body.
      const why = Number.isInteger(err?.status) ? `HTTP ${err.status}` : err?.name === "TimeoutError" ? "timeout" : "request failed";
      log(`Quran.com ${what} failed: ${why}`);
      throw new Unavailable(why);
    } finally {
      clearTimeout(timer);
    }
  }

  /** The reciters that have a recitation verse by verse: `[{ id, name, style }]`. */
  async function reciters() {
    const list = await remember("reciters", async () => {
      // Without a language the source translates the names into Arabic (seen on pre-live, 2026-11-26).
      const answer = await call("reciter list", () => client.content.v4.resources.recitations.list({ language: "en" }));
      const usable = (Array.isArray(answer) ? answer : []).flatMap((r) => {
        const name = r?.translatedName?.name || r?.reciterName;
        if (!Number.isSafeInteger(r?.id) || r.id <= 0 || typeof name !== "string" || !name) return [];
        return [{ id: r.id, name, style: typeof r.style === "string" && r.style ? r.style : null }];
      });
      return usable.length ? usable : null;
    });
    if (!list) throw new Unavailable("no reciter list");
    return list;
  }

  /** The address of one verse by one reciter, or null if the source has no file for it. */
  function verseAddress(reciter, verse) {
    return remember(`${reciter}/${verse}`, async () => {
      const answer = await call(`verse ${verse}, reciter ${reciter}`, () =>
        client.content.v4.audio.verseRecitation.byKey(verse, String(reciter))
      );
      const file = answer?.audioFiles?.find((f) => f?.verseKey === verse && f.url);
      if (!file) return null;
      // The SDK puts its own host in front of anything not starting with "http", which breaks a "//host/..." address.
      const address = audioAddress(file.url.startsWith("//") ? file.url : file.audioUrl);
      if (!address) {
        log(`Quran.com verse ${verse}, reciter ${reciter}: refused an address outside the audio hosts`);
        throw new Unavailable("unexpected address");
      }
      return address;
    });
  }

  /** The addresses of all of `verses` by one reciter, or null if any verse has no file. */
  async function run(reciter, verses) {
    const missing = Symbol("missing");
    try {
      return await mapFew(verses, async (verse) => {
        const address = await verseAddress(reciter, verse);
        if (address === null) throw missing;
        return address;
      });
    } catch (err) {
      if (err === missing) return null;
      throw err;
    }
  }

  return {
    reciters,

    /**
     * All the verses in order, by the requested reciter or, when that one is unknown or lacks a verse, by the default
     * reciter. Never a mix of voices, never a part of the run. Throws `Unavailable`.
     * @param {string[]} verses  Keys such as "2:285".
     * @param {number} [requested]
     * @returns {Promise<{ urls: string[], reciter: { id: number, name: string } }>}
     */
    async recitation(verses, requested = DEFAULT_RECITER) {
      const list = await reciters();
      for (const id of new Set([requested, DEFAULT_RECITER])) {
        const reciter = list.find((r) => r.id === id);
        if (!reciter) continue;
        const urls = await run(id, verses);
        if (urls) return { urls, reciter: { id, name: reciter.name } };
      }
      throw new Unavailable("no reciter has every verse");
    },
  };
}
