// One sync request, start to finish, in one write transaction (design D1, D3, D8):
// resolve the owner, merge an anonymous owner into the account if this is the first sync after sign-in,
// apply the changes, and read what is new. Any failure rolls the whole request back.
import { mergeAnonIntoAccount, resolveOwner } from "./identity.js";
import { DEFAULT_TYPES } from "./records.js";
import { applyOps, getPurgeMark, readSince, withWriteTx } from "./store.js";

/**
 * @param {import("@libsql/client").Client} client
 * @param {{ anonId: string, cursor: number, ops: object[], types?: string[], since?: number }} body  Already validated.
 * @param {{ session: { accountId: string } | null, cookieOwnerId: string | null, now: number }} context
 * @returns {Promise<{ owner_id: string | null, kind: string | null, cursor: number, rows: object[], set_cookie_owner_id: string | null,
 *                     full?: true, removed_before?: number }>}  `full`: `rows` is everything the owner has (design D3).
 */
export async function syncRequest(client, body, { session, cookieOwnerId, now }) {
  return withWriteTx(client, async (tx) => {
    const identity = await resolveOwner(tx, {
      session,
      cookieOwnerId,
      bodyAnonId: body.anonId,
      canCreateAnon: body.ops.length > 0,
      now,
    });
    if (identity.ownerId === null) {
      return { owner_id: null, kind: null, cursor: body.cursor, rows: [], set_cookie_owner_id: null };
    }
    let cursor = body.cursor;
    if (identity.mergeAnonId) {
      await mergeAnonIntoAccount(tx, identity.ownerId, identity.mergeAnonId);
      // The device's cursor belonged to the anonymous owner. The account's positions are a different set.
      cursor = 0;
    }
    // A device that has not synced past a purged removal is sent everything, so it can drop what is gone (design D3).
    // Only for code that says how far it has got (`since`) and asks for bookmarks. After the merge, so merged records
    // count as stored when old changes are filtered (design D4).
    const wantsBookmarks = (body.types ?? DEFAULT_TYPES).includes("bookmark");
    const mark = body.since !== undefined && wantsBookmarks ? await getPurgeMark(tx, identity.ownerId) : null;
    const stale = mark !== null && body.since < mark.seq;
    await applyOps(tx, identity.ownerId, body.ops, now, {
      removedBefore: stale ? mark.removed_before : null,
      accountDeletedAt: identity.accountDeletedAt ?? null,
    });
    const pulled = await readSince(tx, identity.ownerId, stale ? 0 : cursor, body.types);
    return {
      ...(stale ? { full: true, removed_before: mark.removed_before } : {}),
      owner_id: identity.ownerId,
      kind: identity.kind,
      // At or past the mark, so the device is up to date from its next request on.
      cursor: stale ? Math.max(pulled.cursor, mark.seq) : pulled.cursor,
      rows: pulled.rows,
      set_cookie_owner_id: identity.setCookieOwnerId,
    };
  });
}
