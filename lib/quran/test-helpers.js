// A stand-in for the Quran Foundation's token server and Content API, for tests and local trials. Everything it
// answers is invented.
import http from "node:http";

export const RECITERS = [
  { id: 1, reciter_name: "Invented Reciter One", style: "Mujawwad", translated_name: { name: "Reciter One", language_name: "english" } },
  { id: 7, reciter_name: "Invented Reciter Seven", style: "Murattal", translated_name: { name: "Reciter Seven", language_name: "english" } },
];

/** The relative address the stand-in gives for a verse, in the shape the real API uses. */
export const fakePath = (reciter, verse) => {
  const [sura, aya] = verse.split(":").map((n) => n.padStart(3, "0"));
  return `Invented${reciter}/mp3/${sura}${aya}.mp3`;
};

/**
 * @param {object} [options]
 * @param {(reciter: number, verse: string) => string|null|number} [options.audio]  The address for a verse, null for
 *   "no file", or a number to answer with that HTTP status.
 * @returns {Promise<{ base: string, requests: { method: string, path: string, query: string, headers: object }[], close: () => void }>}
 */
export async function fakeSource({ audio = fakePath } = {}) {
  const requests = [];
  const server = http.createServer((req, res) => {
    const { pathname, search } = new URL(req.url, "http://localhost");
    requests.push({ method: req.method, path: pathname, query: search, headers: req.headers });
    const json = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    req.resume();
    if (pathname === "/oauth2/token") {
      return json(200, { access_token: "invented-token", token_type: "bearer", expires_in: 3600, scope: "content.audio.read" });
    }
    if (pathname === "/content/api/v4/resources/recitations") return json(200, { recitations: RECITERS });
    const found = /^\/content\/api\/v4\/recitations\/(\d+)\/by_ayah\/(\d+:\d+)$/.exec(pathname);
    if (!found) return json(404, { message: "not found" });
    const answer = audio(Number(found[1]), found[2]);
    if (typeof answer === "number") return json(answer, { message: "refused" });
    json(200, {
      audio_files: answer === null ? [] : [{ verse_key: found[2], url: answer }],
      pagination: { per_page: 10, current_page: 1, next_page: null, total_pages: 1, total_records: answer === null ? 0 : 1 },
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    requests,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
}
