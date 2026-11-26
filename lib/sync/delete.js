// "Delete my data" on the server (design D5), and the markers that stop deleted data coming back (design D1, D6).
// A marker holds a time and either a one-way hash of the account id or a deleted owner's random id: nothing personal.
import { SyncError, getOwner } from "./identity.js";
import { accountDeletedAt, accountHash, ownerWasDeleted } from "./markers.js";
import { RECORD_TYPES } from "./records.js";
import { withWriteTx } from "./store.js";

/** Removes everything stored for one owner and leaves its marker. */
async function removeOwner(tx, ownerId, now) {
  const tables = [...Object.values(RECORD_TYPES).map((type) => type.table), "applied_ops", "purge_marks"];
  for (const table of tables) await tx.execute({ sql: `DELETE FROM ${table} WHERE owner_id = ?`, args: [ownerId] });
  await tx.execute({ sql: "DELETE FROM owners WHERE id = ?", args: [ownerId] });
  await tx.execute({
    sql: `INSERT INTO deleted_owners (owner_id, deleted_at) VALUES (?, ?)
          ON CONFLICT (owner_id) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)`,
    args: [ownerId, now],
  });
}

async function deleteAccount(tx, { session, cookieOwnerId, anonId, now }) {
  if (!session?.accountId) throw new SyncError(401, "signed_out", "signed out");
  const deletedAt = await accountDeletedAt(tx, session.accountId);
  // The session began before an earlier deletion: this is a retry, or an old device. Anything stored since belongs
  // to a newer account and is left alone.
  if (deletedAt !== null && deletedAt >= (session.signedInAt ?? 0)) return;

  // The account's owner and every owner merged into it, however long the chain.
  const merged = await tx.execute({
    sql: `WITH RECURSIVE chain (id) AS (
            SELECT id FROM owners WHERE user_id = ?
            UNION
            SELECT o.id FROM owners o JOIN chain c ON o.merged_into = c.id
          )
          SELECT id FROM chain`,
    args: [session.accountId],
  });
  const ids = new Set(merged.rows.map((r) => String(r.id)));
  // This device's anonymous owner too, when the browser proves it holds it and it was never merged.
  if (cookieOwnerId && cookieOwnerId === anonId) {
    const anon = await getOwner(tx, cookieOwnerId);
    if (anon && anon.kind === "anon" && !anon.merged_into) ids.add(anon.id);
  }
  for (const id of ids) await removeOwner(tx, id, now);

  await tx.execute({
    sql: `INSERT INTO deleted_accounts (user_hash, deleted_at) VALUES (?, ?)
          ON CONFLICT (user_hash) DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)`,
    args: [accountHash(session.accountId), now],
  });
}

async function deleteAnon(tx, { cookieOwnerId, anonId, now }) {
  // Already deleted (a retry after a lost answer), or never stored: there is nothing to do.
  if (await ownerWasDeleted(tx, anonId)) return;
  const owner = await getOwner(tx, anonId);
  if (!owner) return;
  // The identifier alone proves nothing: only the signed cookie does.
  if (cookieOwnerId !== anonId) throw new SyncError(403, "forbidden", "identifier is not available");
  // Merged into an account: its data is the account's now, and deleting that needs the session.
  if (owner.kind !== "anon" || owner.merged_into) throw new SyncError(401, "signed_out", "signed out");
  await removeOwner(tx, owner.id, now);
}

/**
 * Deletes the reader's data in one write transaction: all of it, or nothing if anything fails.
 *
 * @param {import("@libsql/client").Client} client
 * @param {{ scope: "account" | "anon", anonId: string }} body  Already validated.
 * @param {{ session: { accountId: string, signedInAt?: number } | null, cookieOwnerId: string | null, now: number }} context
 */
export async function deleteData(client, { scope, anonId }, { session, cookieOwnerId, now }) {
  const run = scope === "account" ? deleteAccount : deleteAnon;
  return withWriteTx(client, (tx) => run(tx, { session, cookieOwnerId, anonId, now }));
}
