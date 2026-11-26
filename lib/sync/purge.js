// Deleting old removal records (design D2). Age is the time the server accepted the change (`applied_ops.applied_at`),
// never `updated_at`: an offline removal can arrive long after it was made. Run by scripts/purge-user-db.mjs.
import { withWriteTx } from "./store.js";

export const PURGE_AFTER_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

// A removed bookmark with no change identifier accepted at or after the cutoff. Matched on `op_id` only: a row merged
// into an account was applied under the anonymous owner.
const OLD_REMOVALS = `deleted = 1 AND NOT EXISTS (
  SELECT 1 FROM applied_ops a WHERE a.op_id = bookmarks.op_id AND a.applied_at >= ?)`;

/**
 * One write transaction. For each owner it raises the purge mark, so a device that has not synced past the purged
 * removals is refreshed (design D3). With `dryRun` nothing is changed.
 *
 * @returns {Promise<{ bookmarks: number, appliedOps: number }>}  How many rows were (or would be) deleted.
 */
export async function purgeOldRecords(client, { now = Date.now(), dryRun = false } = {}) {
  const cutoff = now - PURGE_AFTER_DAYS * DAY_MS;
  return withWriteTx(client, async (tx) => {
    const count = async (sql) => Number((await tx.execute({ sql, args: [cutoff] })).rows[0].n);
    const bookmarks = await count(`SELECT COUNT(*) AS n FROM bookmarks WHERE ${OLD_REMOVALS}`);
    const appliedOps = await count("SELECT COUNT(*) AS n FROM applied_ops WHERE applied_at < ?");
    if (!dryRun) {
      // The marks are written first, from the rows about to be deleted. Both values only ever go up.
      await tx.execute({
        sql: `INSERT INTO purge_marks (owner_id, seq, removed_before)
              SELECT owner_id, MAX(server_seq), MAX(updated_at) FROM bookmarks WHERE ${OLD_REMOVALS} GROUP BY owner_id
              ON CONFLICT (owner_id) DO UPDATE SET
                seq = MAX(seq, excluded.seq), removed_before = MAX(removed_before, excluded.removed_before)`,
        args: [cutoff],
      });
      // The removals go before the identifiers: their age is read from the identifiers.
      await tx.execute({ sql: `DELETE FROM bookmarks WHERE ${OLD_REMOVALS}`, args: [cutoff] });
      await tx.execute({ sql: "DELETE FROM applied_ops WHERE applied_at < ?", args: [cutoff] });
    }
    return { bookmarks, appliedOps };
  });
}
