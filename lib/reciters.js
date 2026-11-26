// The reciter list as the Settings panel uses it (design D8). Used by the browser: no Node APIs.
import { DEFAULT_RECITER_ID } from "./preferences.js";

const isReciter = (r) => Number.isSafeInteger(r?.id) && r.id > 0 && typeof r.name === "string" && r.name !== "";

/**
 * Asks this app's server for the reciters.
 * @returns {Promise<{ status: "ok", reciters: { id: number, name: string, style: string|null }[] } |
 *   { status: "hidden" } | { status: "failed" }>}  "hidden": the Quran.com source is not set up. Never rejects.
 */
export async function loadReciters(request = (...args) => fetch(...args)) {
  try {
    const response = await request("/api/reciters", { cache: "no-store" });
    if (response.status === 404) return { status: "hidden" };
    if (!response.ok) return { status: "failed" };
    const body = await response.json();
    const reciters = Array.isArray(body?.reciters) ? body.reciters.filter(isReciter) : [];
    return reciters.length ? { status: "ok", reciters } : { status: "failed" };
  } catch {
    return { status: "failed" };
  }
}

/**
 * The value to show as chosen: the saved reciter while it is on the list, otherwise the default. It saves nothing.
 * @param {string|null} saved  The `reciter_id` setting.
 */
export function selectedReciter(saved, reciters) {
  return reciters.some((r) => String(r.id) === saved) ? saved : String(DEFAULT_RECITER_ID);
}
