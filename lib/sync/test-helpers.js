// Helpers for tests that need a real libSQL database in a temporary file.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { ensureSchema } from "./schema.js";

export async function testClient({ schema = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dua-sync-"));
  const url = pathToFileURL(path.join(dir, "test.db")).href;
  const client = createClient({ url });
  if (schema) await ensureSchema(client);
  return {
    client,
    url,
    cleanup() {
      client.close();
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      } catch {
        // Windows can keep the file locked for a moment. A leftover temp folder is harmless.
      }
    },
  };
}

/** A small seeded random generator, so a failing schedule can be replayed from its seed. */
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
