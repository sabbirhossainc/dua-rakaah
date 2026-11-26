// What a part's recitation control offers: its sources for the player, and the credit for the one on offer (design D7).
// Used by the browser: no Node APIs.

/** Asks this app's server for a part's Quran.com recitation. Rejects for any answer that cannot be played. */
async function askRecitation(duaId, part, reciterId, request) {
  const response = await request(`/api/audio/${duaId}/${part}?reciter=${encodeURIComponent(reciterId)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  const urls = body?.urls;
  const playable = Array.isArray(urls) && urls.length > 0 && urls.every((u) => typeof u === "string" && u.startsWith("https://"));
  if (!playable || typeof body.reciter?.name !== "string") throw new Error("unexpected answer");
  return { urls, reciter: body.reciter };
}

/**
 * The sources of a part in the order they are tried: Quran.com first, then each other recording.
 * @param {{ key: string, duaId: number, part: number, urls: string[], quran: object|null }} audio  From the page.
 * @param {string|number} reciterId  The reader's reciter.
 * @param {typeof fetch} [request]
 */
export function partSources({ key, duaId, part, urls, quran }, reciterId, request = (...args) => fetch(...args)) {
  const recordings = urls.map((url) => ({ id: url, provider: "hisnmuslim", urls: [url] }));
  if (!quran) return recordings;
  // The reciter is part of the id: a failure with one says nothing about another.
  const recitation = { id: `quran:${key}:${reciterId}`, provider: "quran", resolve: () => askRecitation(duaId, part, reciterId, request) };
  return [recitation, ...recordings];
}

/**
 * The credit under a control.
 * @param {{ state: string, provider: string|null, reciterName: string|null }} view  From the player.
 * @param {{ coverage: "full"|"partial" }|null} quran
 * @returns {{ label: string, vars: object, fullVerse: boolean }}  `label` is a key of lib/i18n.js. `fullVerse`: show
 *   "Full verse recitation", because the verses on offer hold more than the card.
 */
export function creditOf(view, quran) {
  if (view.provider !== "quran") return { label: "audioCredit", vars: {}, fullVerse: false };
  return {
    label: view.reciterName ? "audioCreditReciter" : "audioCreditQuran",
    vars: view.reciterName ? { name: view.reciterName } : {},
    fullVerse: quran?.coverage === "partial" && view.state !== "unavailable",
  };
}
