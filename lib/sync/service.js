// One sync request, start to finish, in one write transaction (design D1, D3, D8):
// resolve the owner, merge an anonymous owner into the account if this is the first sync after sign-in,
// apply the changes, and read what is new. Any failure rolls the whole request back.
import { mergeAnonIntoAccount, resolveOwner } from "./identity.js";
import { applyOps, readSince, withWriteTx } from "./store.js";

/**
 * @param {import("@libsql/client").Client} client
 * @param {{ anonId: string, cursor: number, ops: object[], types?: string[] }} body  Already validated.
 * @param {{ session: { accountId: string } | null, cookieOwnerId: string | null, now: number }} context
 * @returns {Promise<{ owner_id: string | null, kind: string | null, cursor: number, rows: object[], set_cookie_owner_id: string | null }>}
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
    await applyOps(tx, identity.ownerId, body.ops, now);
    const pulled = await readSince(tx, identity.ownerId, cursor, body.types);
    return {
      owner_id: identity.ownerId,
      kind: identity.kind,
      cursor: pulled.cursor,
      rows: pulled.rows,
      set_cookie_owner_id: identity.setCookieOwnerId,
    };
  });
}
