import test from "node:test";
import assert from "node:assert/strict";
import { positionResult } from "./position.js";

const saved = { kind: "device", lat: 51.5, lng: -0.128 };

test("a position that is given replaces the saved one, with nothing to report", () => {
  for (const before of [saved, null]) {
    assert.deepEqual(positionResult({ type: "given", lat: 23.7, lng: 90.4 }, before), {
      place: { kind: "device", lat: 23.7, lng: 90.4 },
      status: null,
    });
  }
});

test("a new position keeps the saved name until a new one is found", () => {
  const named = { ...saved, name: { en: "England", bn: "ইংল্যান্ড", lat: 51.5, lng: -0.128 } };
  assert.deepEqual(positionResult({ type: "given", lat: 53.48, lng: -2.24 }, named).place, {
    kind: "device",
    lat: 53.48,
    lng: -2.24,
    name: named.name,
  });
});

test("a refusal removes the saved position and says it was not allowed", () => {
  for (const before of [saved, null]) {
    assert.deepEqual(positionResult({ type: "denied" }, before), { place: null, status: "locationDenied" });
  }
});

test("another error keeps a saved position, with nothing to report", () => {
  assert.deepEqual(positionResult({ type: "failed" }, saved), { place: saved, status: null });
});

test("another error with no saved position says it could not be found", () => {
  assert.deepEqual(positionResult({ type: "failed" }, null), { place: null, status: "locationFailed" });
});

test("no geolocation removes the saved position and says it is not available", () => {
  for (const before of [saved, null]) {
    assert.deepEqual(positionResult({ type: "unavailable" }, before), { place: null, status: "locationUnavailable" });
  }
});
