// The shared user-data schema (design D4). Idempotent: running it again changes nothing.
// New changes are added as new statements at the end, never by editing an existing one.

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS owners (
     id          TEXT PRIMARY KEY,
     kind        TEXT NOT NULL CHECK (kind IN ('anon', 'account')),
     user_id     TEXT UNIQUE,
     merged_into TEXT,
     created_at  INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sync_counter (
     id    INTEGER PRIMARY KEY CHECK (id = 1),
     value INTEGER NOT NULL
   )`,
  `INSERT OR IGNORE INTO sync_counter (id, value) VALUES (1, 0)`,
  `CREATE TABLE IF NOT EXISTS bookmarks (
     owner_id   TEXT NOT NULL,
     dua_id     INTEGER NOT NULL,
     deleted    INTEGER NOT NULL CHECK (deleted IN (0, 1)),
     updated_at INTEGER NOT NULL,
     op_id      TEXT NOT NULL,
     server_seq INTEGER NOT NULL,
     PRIMARY KEY (owner_id, dua_id)
   )`,
  `CREATE INDEX IF NOT EXISTS bookmarks_by_seq ON bookmarks (owner_id, server_seq)`,
  `CREATE TABLE IF NOT EXISTS applied_ops (
     op_id      TEXT NOT NULL,
     owner_id   TEXT NOT NULL,
     applied_at INTEGER NOT NULL,
     PRIMARY KEY (owner_id, op_id)
   )`,
  // Added with memorize (design D4). Never edit the statements above.
  `CREATE TABLE IF NOT EXISTS memorize (
     owner_id   TEXT NOT NULL,
     dua_id     INTEGER NOT NULL,
     learned    INTEGER NOT NULL CHECK (learned IN (0, 1)),
     progress   INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
     reset_gen  INTEGER NOT NULL CHECK (reset_gen >= 0),
     server_seq INTEGER NOT NULL,
     PRIMARY KEY (owner_id, dua_id)
   )`,
  `CREATE INDEX IF NOT EXISTS memorize_by_seq ON memorize (owner_id, server_seq)`,
  // Added with settings (design D2). The CHECKs bound the lengths only, not the list of names, so a new setting
  // needs no table change.
  `CREATE TABLE IF NOT EXISTS preferences (
     owner_id   TEXT NOT NULL,
     pref_key   TEXT NOT NULL CHECK (length(pref_key) BETWEEN 1 AND 32),
     value      TEXT NOT NULL CHECK (length(value) BETWEEN 1 AND 64),
     updated_at INTEGER NOT NULL,
     op_id      TEXT NOT NULL,
     server_seq INTEGER NOT NULL,
     PRIMARY KEY (owner_id, pref_key)
   )`,
  `CREATE INDEX IF NOT EXISTS preferences_by_seq ON preferences (owner_id, server_seq)`,
  // Added with data deletion (design D1). `purge_marks`: how far an owner's removals have been purged.
  // The two `deleted_*` tables are deletion markers and hold no personal data.
  `CREATE TABLE IF NOT EXISTS purge_marks (
     owner_id       TEXT PRIMARY KEY,
     seq            INTEGER NOT NULL,
     removed_before INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS deleted_accounts (
     user_hash  TEXT PRIMARY KEY,
     deleted_at INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS deleted_owners (
     owner_id   TEXT PRIMARY KEY,
     deleted_at INTEGER NOT NULL
   )`,
];

/** @param {import("@libsql/client").Client} client */
export async function ensureSchema(client) {
  await client.batch(SCHEMA_STATEMENTS, "write");
}
