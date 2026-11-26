// Deletes removed bookmarks and applied change identifiers the server accepted more than 180 days ago, from the
// database named by TURSO_DATABASE_URL. Safe to run again.
// Usage: npm run db:user:purge [-- --dry-run]   (reads .env.local if it exists)
import { createClient } from "@libsql/client";
import { PURGE_AFTER_DAYS, purgeOldRecords } from "../lib/sync/purge.js";

const args = process.argv.slice(2);
// A mistyped option must not turn a dry run into a real purge.
const unknown = args.filter((a) => a !== "--dry-run");
if (unknown.length > 0) {
  console.error(`Unknown option: ${unknown.join(" ")}. The only option is --dry-run.`);
  process.exit(1);
}
const dryRun = args.includes("--dry-run");

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Put it in .env.local (see .env.example).");
  process.exit(1);
}

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
try {
  const { bookmarks, appliedOps } = await purgeOldRecords(client, { dryRun });
  console.log(
    `${dryRun ? "Dry run: would delete" : "Deleted"} ${bookmarks} removed bookmark(s) and ${appliedOps} change identifier(s) older than ${PURGE_AFTER_DAYS} days.`
  );
} catch (error) {
  console.error(`Could not purge the database: ${error.message}`);
  process.exitCode = 1;
} finally {
  client.close();
}
