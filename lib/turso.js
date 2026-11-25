// The shared user-data database (Turso, or a local libSQL file in development and tests).
// Server-only: the URL and token must never reach the browser.
import "server-only";
import { createClient } from "@libsql/client";
import { ensureSchema } from "./sync/schema.js";

function connect() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is not set");
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
}

/**
 * One client per server process, with the tables created on first use for a local `file:` database
 * and in development. A Turso database in production is set up once with `npm run db:user:init`.
 * In development, hot reload keeps the promise on globalThis.
 */
export function getClient() {
  if (globalThis.__duaUserDb) return globalThis.__duaUserDb;
  const promise = (async () => {
    const client = connect();
    const url = process.env.TURSO_DATABASE_URL;
    if (process.env.NODE_ENV !== "production" || url.startsWith("file:")) await ensureSchema(client);
    return client;
  })();
  // A failed attempt must not be remembered, or the route would stay broken until a restart.
  promise.catch(() => {
    if (globalThis.__duaUserDb === promise) globalThis.__duaUserDb = undefined;
  });
  globalThis.__duaUserDb = promise;
  return promise;
}
