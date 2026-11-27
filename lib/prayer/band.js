// Which period of the day the home page's prayer band is colored for (design D9). Pure.

/**
 * @param {null | { current: string | null }} waqt  What `waqtAt` returned (lib/prayer/waqt.js).
 * @returns {"neutral" | "fajr" | "forenoon" | "dhuhr" | "asr" | "maghrib" | "isha"}
 *   "neutral" when the waqt isn't known: before the scripts run, and when times cannot be computed.
 *   "forenoon" from sunrise until Dhuhr, when no waqt is current.
 */
export function bandPeriod(waqt) {
  if (!waqt) return "neutral";
  return waqt.current ?? "forenoon";
}

/** Every period the band has colors for. */
export const BAND_PERIODS = Object.freeze(["neutral", "fajr", "forenoon", "dhuhr", "asr", "maghrib", "isha"]);
