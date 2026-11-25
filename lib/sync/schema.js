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
];

/** @param {import("@libsql/client").Client} client */
export async function ensureSchema(client) {
  await client.batch(SCHEMA_STATEMENTS, "write");
}
