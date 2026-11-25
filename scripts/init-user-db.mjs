// Creates the user-data tables in the database named by TURSO_DATABASE_URL. Safe to run again.
// Usage: npm run db:user:init   (reads .env.local if it exists)
import { createClient } from "@libsql/client";
import { ensureSchema } from "../lib/sync/schema.js";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
try {
  await ensureSchema(client);
  const r = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
  console.log(`User-data tables are ready: ${r.rows.map((row) => row.name).join(", ")}`);
} catch (error) {
  console.error(`Could not set up the database: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.close();
}
