// Reading the deletion markers (design D1, D6). They are written by delete.js.
import { createHash } from "node:crypto";

/** The one-way hash an account is remembered by. Not keyed, so changing a secret cannot drop the markers (design D1). */
export const accountHash = (accountId) => createHash("sha256").update(accountId).digest("hex");

/** When this account was last deleted (server time), or null. */
export async function accountDeletedAt(tx, accountId) {
  const r = await tx.execute({
    sql: "SELECT deleted_at FROM deleted_accounts WHERE user_hash = ?",
    args: [accountHash(accountId)],
  });
  return r.rows[0] ? Number(r.rows[0].deleted_at) : null;
}

export async function ownerWasDeleted(tx, ownerId) {
  const r = await tx.execute({ sql: "SELECT 1 FROM deleted_owners WHERE owner_id = ?", args: [ownerId] });
  return r.rows.length > 0;
}
