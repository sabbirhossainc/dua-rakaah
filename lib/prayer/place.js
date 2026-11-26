// The reader's place and Hijri adjustment, kept on the device only (design D5).
// The saved value is `{ place: { kind: "town", id } | { kind: "device", lat, lng } | null, hijriOffset: -1|0|1 }`.
// A null place means the reader has not chosen: Dhaka's times, shown in the device's zone.
import districts from "../../data/bd-districts.json" with { type: "json" };
import { HOME_EVENT, HOME_KEY, announceHomeChange } from "./home-key.js";

export { HOME_KEY };
export const TOWNS = districts.towns;
export const DEFAULT_TOWN_ID = districts.default;
export const HIJRI_OFFSETS = Object.freeze([-1, 0, 1]);

const townById = new Map(TOWNS.map((town) => [town.id, town]));

export const defaultHome = () => ({ place: null, hijriOffset: 0 });

/** About 100 m: far finer than prayer times need, and less of a fingerprint on the device. */
export const roundCoordinate = (value) => Math.round(value * 1000) / 1000;

const within = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit;

function validPlace(place) {
  if (place?.kind === "town" && townById.has(place.id)) return { kind: "town", id: place.id };
  if (place?.kind === "device" && within(place.lat, 90) && within(place.lng, 180)) {
    return { kind: "device", lat: roundCoordinate(place.lat), lng: roundCoordinate(place.lng) };
  }
  return null;
}

/** The saved text as a valid value. Anything missing or malformed gets its default. */
export function parseHome(text) {
  let value = null;
  try {
    value = JSON.parse(text);
  } catch {
    // Not JSON: the defaults.
  }
  return {
    place: validPlace(value?.place),
    hijriOffset: HIJRI_OFFSETS.includes(value?.hijriOffset) ? value.hijriOffset : 0,
  };
}

/** The saved text, or null when there is none or storage is blocked. */
export function readHomeText(storage) {
  try {
    return (storage ?? globalThis.localStorage)?.getItem(HOME_KEY) ?? null;
  } catch {
    return null;
  }
}

export const readHome = (storage) => parseHome(readHomeText(storage));

/** Saves a value, validated and rounded. Returns false when storage refuses it. */
export function writeHome(home, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(HOME_KEY, JSON.stringify(parseHome(JSON.stringify(home))));
  } catch {
    return false;
  }
  announceHomeChange();
  return true;
}

/** Calls `notify` when the saved choices change, in this tab or another. Returns the unsubscribe function. */
export function subscribeHome(notify) {
  window.addEventListener("storage", notify);
  window.addEventListener(HOME_EVENT, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(HOME_EVENT, notify);
  };
}

/**
 * Where the times are for and which zone they are shown in. A town picked from the list has its own zone; the
 * device's position and the default use the device's.
 *
 * @returns {{ kind: "default" | "town" | "device", town: object | null, lat: number, lng: number, timeZone: string }}
 */
export function resolvePlace(place, deviceZone) {
  if (place?.kind === "device") {
    return { kind: "device", town: null, lat: place.lat, lng: place.lng, timeZone: deviceZone };
  }
  const town = townById.get(place?.kind === "town" ? place.id : DEFAULT_TOWN_ID);
  return {
    kind: place ? "town" : "default",
    town,
    lat: town.lat,
    lng: town.lng,
    timeZone: place ? town.tz : deviceZone,
  };
}
