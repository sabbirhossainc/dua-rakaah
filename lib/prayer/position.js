// What the home page does with the browser's answer about the position (design 1 of apply-ux-audit). Pure.

/**
 * @typedef {{ type: "given", lat: number, lng: number } | { type: "denied" } | { type: "failed" }
 *   | { type: "unavailable" }} PositionOutcome  "unavailable": no geolocation, or the page is not secure.
 *
 * @param {PositionOutcome} outcome
 * @param {null | { kind: "device", lat: number, lng: number, name?: object }} saved  The position kept from an
 *   earlier visit. Its name stays with a new position until a new one is found.
 * @returns {{ place: null | { kind: "device", lat: number, lng: number }, status: string | null }}  The position to
 *   keep (null: show the capital), and the label of the status line, if there is anything to report.
 */
export function positionResult(outcome, saved) {
  switch (outcome.type) {
    case "given":
      return {
        place: { kind: "device", lat: outcome.lat, lng: outcome.lng, ...(saved?.name && { name: saved.name }) },
        status: null,
      };
    case "denied":
      return { place: null, status: "locationDenied" };
    case "unavailable":
      return { place: null, status: "locationUnavailable" };
    default:
      return { place: saved, status: saved ? null : "locationFailed" };
  }
}
