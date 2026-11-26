// The app's one recitation service (design D5, D6). Server only: it holds the credentials and the day-long cache.
import "server-only";
import { createQuranClient } from "./client.js";
import { quranConfig } from "./config.js";
import { createRecitations } from "./recitations.js";

let service = null;

/** The service, or null when the source is not set up. */
export function getRecitations() {
  const config = quranConfig();
  if (!config) return null;
  service ??= createRecitations({ client: createQuranClient(config) });
  return service;
}
