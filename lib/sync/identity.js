// Who a sync request belongs to, and merging an anonymous owner into an account (design D3, D8).
// All functions take a libSQL executor and are meant to run inside the sync's write transaction.
import { randomUUID } from "node:crypto";
import { accountDeletedAt, ownerWasDeleted } from "./markers.js";
import { RECORD_TYPES } from "./records.js";
import { mergeRecordInto } from "./store.js";

/** Thrown for a request the server refuses. `status` is the HTTP status, `code` a short machine-readable reason. */
export class SyncError extends Error {
  constructor(status, code, message) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export async function getOwner(tx, id) {
  const r = await tx.execute({
    sql: "SELECT id, kind, user_id, merged_into FROM owners WHERE id = ?",
    args: [id],
  });
  return r.rows[0]
    ? { id: String(r.rows[0].id), kind: String(r.rows[0].kind), user_id: r.rows[0].user_id, merged_into: r.rows[0].merged_into }
    : null;
}

/** Follows `merged_into` until an owner that has not been merged away. */
export async function followMergedInto(tx, owner) {
  let current = owner;
  const seen = new Set();
  while (current.merged_into) {
    if (seen.has(current.id)) throw new Error("merged_into loop");
    seen.add(current.id);
    const next = await getOwner(tx, String(current.merged_into));
    if (!next) throw new Error(`merged_into points to a missing owner: ${current.merged_into}`);
    current = next;
  }
  return current;
}

async function findOrCreateAccountOwner(tx, accountId, now) {
  await tx.execute({
    sql: "INSERT OR IGNORE INTO owners (id, kind, user_id, created_at) VALUES (?, 'account', ?, ?)",
    args: [randomUUID(), accountId, now],
  });
  const r = await tx.execute({ sql: "SELECT id FROM owners WHERE user_id = ?", args: [accountId] });
  return getOwner(tx, String(r.rows[0].id));
}

/**
 * Decides who the request belongs to.
 *
 * @param {object} input
 * @param {{ accountId: string, signedInAt?: number } | null} input.session  The signed-in account, if any.
 * @param {string | null} input.cookieOwnerId           The owner id from a cookie with a valid signature, if any.
 * @param {string} input.bodyAnonId                     The device's own anonymous id (not trusted by itself).
 * @param {boolean} input.canCreateAnon                 False for a request with no changes, so a reader who never
 *                                                      changes anything leaves no record.
 * @param {number} input.now
 * @returns {Promise<{ ownerId: string | null, kind: string | null, mergeAnonId: string | null, setCookieOwnerId: string | null,
 *                     accountDeletedAt?: number | null }>}  `accountDeletedAt`: an earlier deletion of this account.
 * @throws {SyncError} 410 "deleted" for an identity whose data was deleted (data deletion, design D6).
 */
export async function resolveOwner(tx, { session, cookieOwnerId, bodyAnonId, canCreateAnon, now }) {
  if (session?.accountId) {
    // Before the account owner is looked up: it would be created again, and the deleted data uploaded into it.
    const deletedAt = await accountDeletedAt(tx, session.accountId);
    if (deletedAt !== null && deletedAt >= (session.signedInAt ?? 0)) throw new SyncError(410, "deleted", "data was deleted");
    const account = await findOrCreateAccountOwner(tx, session.accountId, now);
    // The device's anonymous owner is merged only when the browser proves it holds it (the signed cookie).
    let mergeAnonId = null;
    if (cookieOwnerId && cookieOwnerId === bodyAnonId) {
      const anon = await getOwner(tx, cookieOwnerId);
      if (anon && anon.kind === "anon" && !anon.merged_into) mergeAnonId = anon.id;
    }
    return { ownerId: account.id, kind: "account", mergeAnonId, setCookieOwnerId: null, accountDeletedAt: deletedAt };
  }

  for (const id of new Set([cookieOwnerId, bodyAnonId])) {
    if (id && (await ownerWasDeleted(tx, id))) throw new SyncError(410, "deleted", "data was deleted");
  }

  const cookieOwner = cookieOwnerId ? await getOwner(tx, cookieOwnerId) : null;
  if (cookieOwner) {
    const owner = await followMergedInto(tx, cookieOwner);
    // An anonymous device whose owner was merged into an account is signed out: it must sign in again.
    if (owner.kind === "account") throw new SyncError(401, "signed_out", "signed out");
    return { ownerId: owner.id, kind: owner.kind, mergeAnonId: null, setCookieOwnerId: null };
  }

  const existing = await getOwner(tx, bodyAnonId);
  if (existing) throw new SyncError(403, "forbidden", "identifier is not available");
  if (!canCreateAnon) return { ownerId: null, kind: null, mergeAnonId: null, setCookieOwnerId: null };
  await tx.execute({
    sql: "INSERT INTO owners (id, kind, created_at) VALUES (?, 'anon', ?)",
    args: [bodyAnonId, now],
  });
  return { ownerId: bodyAnonId, kind: "anon", mergeAnonId: null, setCookieOwnerId: bodyAnonId };
}

/**
 * Merges every record of an anonymous owner, of every record type, into the account, then marks the anonymous owner as
 * merged. A type with its own sign-in rule (settings: the account's value stays) uses it; the others use the same rule
 * as sync. Running it again changes nothing.
 */
export async function mergeAnonIntoAccount(tx, accountOwnerId, anonOwnerId) {
  for (const [name, type] of Object.entries(RECORD_TYPES)) {
    const r = await tx.execute({
      sql: `SELECT ${[type.keyField, ...type.columns].join(", ")} FROM ${type.table} WHERE owner_id = ? ORDER BY server_seq`,
      args: [anonOwnerId],
    });
    for (const row of r.rows) await mergeRecordInto(tx, name, accountOwnerId, type.fromRow(row), "anon");
  }
  await tx.execute({
    sql: "UPDATE owners SET merged_into = ? WHERE id = ? AND kind = 'anon'",
    args: [accountOwnerId, anonOwnerId],
  });
}
