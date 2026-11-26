// The HTTP side of sync (design D1, D3) and of data deletion (data deletion, design D5). Plain Request in, Response
// out, with its dependencies passed in, so tests can call it without Next.js. The route files wire in the real ones.
import { ANON_COOKIE, signOwnerId, verifyOwnerCookie } from "./cookie.js";
import { deleteData } from "./delete.js";
import { SyncError } from "./identity.js";
import { isUuid, validateSyncBody } from "./records.js";
import { syncRequest } from "./service.js";

export const MAX_BODY_BYTES = 64 * 1024;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

function readCookie(request, name) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** A browser sends Origin on a cross-site POST. If it is there and is not ours, refuse. */
function crossSite(request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}

function cookieHeader(value, { secure, maxAge }) {
  return `${ANON_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

/** The checks every route that takes a JSON body makes first. Returns `{ parsed }` or `{ refused: Response }`. */
async function readJsonBody(request) {
  if (crossSite(request)) return { refused: json(403, { error: "forbidden" }) };

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { refused: json(413, { error: "too_large" }) };
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return { refused: json(413, { error: "too_large" }) };

  try {
    return { parsed: JSON.parse(text) };
  } catch {
    return { refused: json(400, { error: "bad_request", message: "body is not JSON" }) };
  }
}

/** The answer for a failure while working on the database. */
function failure(error, what) {
  if (error instanceof SyncError) return json(error.status, { error: error.code });
  console.error(`${what} failed:`, error.message);
  return json(503, { error: "unavailable" });
}

/**
 * @param {Request} request
 * @param {{ getClient: () => Promise<object>, getSession: () => Promise<{accountId: string} | null>,
 *           secret: string | undefined, secure?: boolean, now?: () => number }} deps
 */
export async function handleSync(request, { getClient, getSession, secret, secure = false, now = Date.now }) {
  const { parsed, refused } = await readJsonBody(request);
  if (refused) return refused;
  const checked = validateSyncBody(parsed);
  if (!checked.ok) return json(checked.status, { error: checked.status === 413 ? "too_many_changes" : "bad_request", message: checked.error });

  if (!secret) {
    console.error("ANON_COOKIE_SECRET is not set");
    return json(503, { error: "unavailable" });
  }

  let session = null;
  try {
    session = await getSession();
  } catch (error) {
    // A broken sign-in setup must not stop anonymous sync.
    console.error("Could not read the session:", error.message);
  }
  const cookieOwnerId = verifyOwnerCookie(readCookie(request, ANON_COOKIE), secret);

  try {
    const client = await getClient();
    const result = await syncRequest(client, checked.value, { session, cookieOwnerId, now: now() });
    const headers = {};
    if (result.set_cookie_owner_id) {
      headers["Set-Cookie"] = cookieHeader(signOwnerId(result.set_cookie_owner_id, secret), { secure, maxAge: ONE_YEAR_SECONDS });
    }
    const answer = { owner_id: result.owner_id, kind: result.kind, cursor: result.cursor, rows: result.rows };
    if (result.full) Object.assign(answer, { full: true, removed_before: result.removed_before });
    return json(200, answer, headers);
  } catch (error) {
    return failure(error, "Sync");
  }
}

/**
 * `POST /api/account/delete` with `{ scope: "account" | "anon", anon_id }`. A 200 means the data is gone (or there was
 * none), and clears the anonymous-device cookie.
 *
 * @param {Request} request
 * @param {Parameters<typeof handleSync>[1]} deps
 */
export async function handleDelete(request, { getClient, getSession, secret, secure = false, now = Date.now }) {
  const { parsed, refused } = await readJsonBody(request);
  if (refused) return refused;
  const { scope, anon_id: anonId } = parsed ?? {};
  if ((scope !== "account" && scope !== "anon") || !isUuid(anonId)) {
    return json(400, { error: "bad_request", message: "scope must be account or anon, and anon_id a UUID" });
  }
  if (!secret) {
    console.error("ANON_COOKIE_SECRET is not set");
    return json(503, { error: "unavailable" });
  }
  try {
    // Unlike sync, a session that cannot be read is a failure: it must not look like "signed out".
    const session = scope === "account" ? await getSession() : null;
    const cookieOwnerId = verifyOwnerCookie(readCookie(request, ANON_COOKIE), secret);
    const client = await getClient();
    await deleteData(client, { scope, anonId }, { session, cookieOwnerId, now: now() });
    return json(200, { ok: true }, { "Set-Cookie": cookieHeader("", { secure, maxAge: 0 }) });
  } catch (error) {
    return failure(error, "Deleting data");
  }
}

/** Clears the anonymous-device cookie. Called when the reader signs out. */
export function handleClear(request, { secure = false } = {}) {
  if (crossSite(request)) return json(403, { error: "forbidden" });
  return json(200, { ok: true }, { "Set-Cookie": cookieHeader("", { secure, maxAge: 0 }) });
}
