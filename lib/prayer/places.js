// Names for the device's position (design 9 of apply-ux-audit). Pure: the table is passed in, so the browser fetches
// it only when it needs it (public/places.json, written by scripts/build-places.mjs).

/**
 * The name of the nearest point of the table: a Bangladesh district, or elsewhere a state or a country.
 *
 * @param {{ names: Array<[string, string | null]>, points: number[] }} table  `points` are flat triples of latitude and
 *   longitude in hundredths of a degree and an index into `names`.
 * @returns {null | { en: string, bn: string | null }}
 */
export function nearestName({ names, points }, lat, lng) {
  const [y, x] = [lat * 100, lng * 100];
  const shrink = Math.cos((lat * Math.PI) / 180);
  let best = -1;
  let bestDistance = Infinity;
  for (let i = 0; i < points.length; i += 3) {
    let dx = Math.abs(points[i + 1] - x);
    if (dx > 18000) dx = 36000 - dx; // across the date line
    const dy = points[i] - y;
    const distance = dy * dy + (dx * shrink) ** 2;
    if (distance < bestDistance) [best, bestDistance] = [points[i + 2], distance];
  }
  if (best < 0) return null;
  const [en, bn] = names[best];
  return { en, bn };
}

/**
 * True when a saved position needs a name looked up: it has none, or its name was found for another position (it
 * moved while the table could not be fetched).
 */
export function needsName(place) {
  return !place?.name || place.name.lat !== place.lat || place.name.lng !== place.lng;
}

/** A name in the page's language, or in English where it has no Bangla. */
export const nameIn = (name, lang) => (lang === "bn" ? (name.bn ?? name.en) : name.en);
