"use client";
// Asks the browser for the position once, when the home page is opened (design 1 of apply-ux-audit).
import { useEffect, useEffectEvent, useRef, useState } from "react";

// Prayer times need no precision, so the quickest and least precise position will do.
const POSITION = { enableHighAccuracy: false, maximumAge: 60 * 60 * 1000, timeout: 10_000 };

/** @returns {Promise<import("@/lib/prayer/position").PositionOutcome>} */
function askPosition() {
  return new Promise((resolve) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      resolve({ type: "unavailable" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ type: "given", lat: coords.latitude, lng: coords.longitude }),
      (error) => resolve({ type: error.code === error.PERMISSION_DENIED ? "denied" : "failed" }),
      POSITION,
    );
  });
}

/**
 * Calls `apply` with the browser's answer; it returns the status label to show, or null.
 *
 * @returns {string | null}  That label, or "locationFinding" while waiting.
 */
export function usePosition(apply) {
  const [status, setStatus] = useState("locationFinding");
  const asked = useRef(false);
  const answered = useEffectEvent((outcome) => setStatus(apply(outcome)));
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    askPosition().then((outcome) => answered(outcome));
  }, []);
  return status;
}
