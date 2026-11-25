// The HTTP side of sync (design D1, D3). Plain Request in, Response out, with its dependencies passed in,
// so tests can call it without Next.js. app/api/sync/route.js wires in the real ones.
import { ANON_COOKIE, signOwnerId, verifyOwnerCookie } from "./cookie.js";
import { SyncError } from "./identity.js";
import { validateSyncBody } from "./records.js";
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

/**
 * @param {Request} request
 * @param {{ getClient: () => Promise<object>, getSession: () => Promise<{accountId: string} | null>,
 *           secret: string | undefined, secure?: boolean, now?: () => number }} deps
 */
export async function handleSync(request, { getClient, getSession, secret, secure = false, now = Date.now }) {
  if (crossSite(request)) return json(403, { error: "forbidden" });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json(413, { error: "too_large" });
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return json(413, { error: "too_large" });

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json(400, { error: "bad_request", message: "body is not JSON" });
  }
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
    return json(200, { owner_id: result.owner_id, kind: result.kind, cursor: result.cursor, rows: result.rows }, headers);
  } catch (error) {
    if (error instanceof SyncError) return json(error.status, { error: error.code });
    console.error("Sync failed:", error.message);
    return json(503, { error: "unavailable" });
  }
}

/** Clears the anonymous-device cookie. Called when the reader signs out. */
export function handleClear(request, { secure = false } = {}) {
  if (crossSite(request)) return json(403, { error: "forbidden" });
  return json(200, { ok: true }, { "Set-Cookie": cookieHeader("", { secure, maxAge: 0 }) });
}
