// What GET /api/audio/<dua>/<part> and GET /api/reciters answer (design D5). The recitation service and the list of
// verses are passed in. No answer may be stored by a browser or a cache, and no error says anything about the source.
import { DEFAULT_RECITER, Unavailable } from "./recitations.js";

const ID = /^[1-9][0-9]{0,8}$/;
const RECITER = /^[1-9][0-9]{0,5}$/;

const answer = (status, body) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const invalid = () => answer(400, { error: "invalid" });
const notFound = () => answer(404, { error: "not_found" });

/** The service's answer, or 503 whatever went wrong. */
async function fromSource(ask, log) {
  try {
    return answer(200, await ask());
  } catch (err) {
    // An `Unavailable` was logged where it happened. Anything else: its kind only.
    if (!(err instanceof Unavailable)) log(`Quran.com request failed: ${err?.name ?? "error"}`);
    return answer(503, { error: "unavailable" });
  }
}

/**
 * @param {Request} request
 * @param {{ duaId: string, part: string }} params  From the address.
 * @param {object} deps
 * @param {ReturnType<typeof import("./recitations.js").createRecitations> | null} deps.service  Null: not set up.
 * @param {(duaId: number, part: number) => { verses: string[], coverage: "full"|"partial" } | null} deps.versesOf
 *   The listed verses of a part whose text still matches the list. The caller can choose nothing else.
 */
export function handleRecitation(request, params, { service, versesOf, log = console.error }) {
  const asked = new URL(request.url).searchParams.get("reciter");
  if (!ID.test(params.duaId) || !ID.test(params.part) || (asked !== null && !RECITER.test(asked))) return invalid();
  if (!service) return notFound();
  const listed = versesOf(Number(params.duaId), Number(params.part));
  if (!listed) return notFound();
  return fromSource(async () => {
    const { urls, reciter } = await service.recitation(listed.verses, asked === null ? DEFAULT_RECITER : Number(asked));
    return { urls, coverage: listed.coverage, reciter };
  }, log);
}

/** @param {{ service: object | null, log?: (line: string) => void }} deps */
export function handleReciters({ service, log = console.error }) {
  if (!service) return notFound();
  return fromSource(async () => ({ reciters: await service.reciters(), default: DEFAULT_RECITER }), log);
}
