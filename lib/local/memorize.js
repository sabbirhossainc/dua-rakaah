// Memorize in the local store (design D3, D6). Every change is one transaction that updates the record and queues the
// change together, so there is never a state change without a change to send, or the other way round.
import { memorizeChange, memorizeTarget } from "./apply.js";

/** A reader has started a dua when it has progress or is learned. A 0/0 record is only what "start over" leaves behind. */
export const isStarted = (record) => Boolean(record && (record.learned === 1 || record.progress > 0));

/**
 * Applies what the reader did to one dua: `{ kind: "learned", value }`, `{ kind: "progress", value }` or
 * `{ kind: "startOver" }` (see `memorizeTarget`). Returns the dua's record afterwards, or null when nothing changed
 * and the dua was never touched. Memorize applies to the whole dua (one id), not to a part of it.
 */
export async function setMemorize(db, duaId, action, { now = Date.now(), newId = () => crypto.randomUUID() } = {}) {
  if (!Number.isSafeInteger(duaId) || duaId <= 0) throw new Error("duaId must be a positive integer");
  return db.transaction("rw", db.memorize, db.outbox, async () => {
    const existing = await db.memorize.get(duaId);
    const target = { dua_id: duaId, ...memorizeTarget(existing, action) };
    const change = memorizeChange(existing, target, { op_id: newId(), now });
    if (!change) return existing ?? null;
    await db.memorize.put(change.record);
    await db.outbox.add(change.op);
    return change.record;
  });
}

/** Records of started duas (not the ones that were started over), in no particular order. */
export async function listMemorize(db) {
  return (await db.memorize.toArray()).filter(isStarted);
}
