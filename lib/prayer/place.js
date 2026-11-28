// The reader's place, kept on the device only (design D5).
// The saved value is `{ place: { kind: "device", lat, lng, name? } | null }`, where `name` is
// `{ en, bn, lat, lng }`, the last name found and the position it was found for (lib/prayer/places.js). A null place means there
// is no position: the times are those of the capital for the device's time zone.
import table from "../../data/capitals.json" with { type: "json" };
import { HOME_EVENT, HOME_KEY, announceHomeChange } from "./home-key.js";

export { HOME_KEY };
// The file holds each capital as a row of values, in the order of `fields`.
export const CAPITALS = table.capitals.map((row) => Object.fromEntries(table.fields.map((field, i) => [field, row[i]])));
export const ZONE_CAPITALS = table.zones;
/** The capital shown when the time zone names no country with a known capital. */
export const DEFAULT_CAPITAL_ID = "bd";

const capitalById = new Map(CAPITALS.map((capital) => [capital.id, capital]));

export const defaultHome = () => ({ place: null });

/** About 100 m: far finer than prayer times need, and less of a fingerprint on the device. */
export const roundCoordinate = (value) => Math.round(value * 1000) / 1000;

const within = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit;

function validPlace(place) {
  if (place?.kind === "device" && within(place.lat, 90) && within(place.lng, 180)) {
    const value = { kind: "device", lat: roundCoordinate(place.lat), lng: roundCoordinate(place.lng) };
    const { name } = place;
    const text = (v) => typeof v === "string" && v.trim() !== "";
    if (text(name?.en) && (name.bn === null || text(name.bn)) && within(name.lat, 90) && within(name.lng, 180)) {
      value.name = { en: name.en, bn: name.bn, lat: name.lat, lng: name.lng };
    }
    return value;
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
  // A Hijri adjustment saved by an earlier version is ignored.
  return { place: validPlace(value?.place) };
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

/** The capital of the country of a time zone, or Dhaka. */
export function capitalFor(zone) {
  const id = zone && Object.hasOwn(ZONE_CAPITALS, zone) ? ZONE_CAPITALS[zone] : DEFAULT_CAPITAL_ID;
  return capitalById.get(id);
}

/**
 * Where the times are for and which zone they are shown in. The device's position uses the device's zone; a capital
 * uses its own, so that its name, the clock and the times agree.
 *
 * @returns {{ kind: "device" | "capital", city: object | null, name: object | null, lat: number, lng: number,
 *   timeZone: string }}  `name` is the saved name of the device's position, if any.
 */
export function resolvePlace(place, deviceZone) {
  if (place?.kind === "device") {
    return { kind: "device", city: null, name: place.name ?? null, lat: place.lat, lng: place.lng, timeZone: deviceZone };
  }
  const city = capitalFor(deviceZone);
  return { kind: "capital", city, name: null, lat: city.lat, lng: city.lng, timeZone: city.tz };
}
