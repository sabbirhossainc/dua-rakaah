// Settings in the local store (design D4). Every change is one transaction that updates the record and queues the change
// together, so there is never a setting change without a change to send, or the other way round.
import { preferenceChange } from "./apply.js";
import { isValidSetting, preferencesFromRecords } from "../preferences.js";

/**
 * The reader chose `value` for the setting `name`. Writes the record and queues the change in one transaction. Does
 * nothing (and returns what is stored) when the value is already the stored one, or is the default and nothing is
 * stored. A name or value that is not valid is refused with nothing written.
 *
 * `setPreference(db, "reciter_id", "7")` is the whole API the audio feature uses (design D7).
 *
 * @returns {Promise<object | null>} the setting's record afterwards, or null when there is none.
 */
export async function setPreference(db, name, value, { now = Date.now(), newId = () => crypto.randomUUID() } = {}) {
  if (!isValidSetting(name, value)) throw new Error(`"${value}" is not a valid value for the setting "${name}"`);
  return db.transaction("rw", db.preferences, db.outbox, async () => {
    const existing = await db.preferences.get(name);
    const change = preferenceChange(existing, { pref_key: name, value, now, op_id: newId() });
    if (!change) return existing ?? null;
    await db.preferences.put(change.record);
    await db.outbox.add(change.op);
    return change.record;
  });
}

/** Every setting with its value (the default for one the reader never chose, and for a stored value that is not valid). */
export async function getPreferences(db) {
  return preferencesFromRecords(await db.preferences.toArray());
}
