import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TOWN_ID,
  HOME_KEY,
  TOWNS,
  defaultHome,
  parseHome,
  readHome,
  resolvePlace,
  writeHome,
} from "./place.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

test("the town list has 64 districts with unique ids, both names, and Dhaka as the default", () => {
  assert.equal(TOWNS.length, 64);
  assert.equal(new Set(TOWNS.map((t) => t.id)).size, 64);
  assert.equal(DEFAULT_TOWN_ID, "dhaka");
  assert.ok(TOWNS.some((t) => t.id === DEFAULT_TOWN_ID));
  for (const t of TOWNS) {
    assert.match(t.id, /^[a-z-]+$/);
    assert.match(t.name_en, /^[A-Z][A-Za-z' ]+$/, t.id);
    assert.match(t.name_bn, /^[ঀ-৿ ]+$/, t.id);
    assert.equal(t.tz, "Asia/Dhaka");
  }
  assert.equal(new Set(TOWNS.map((t) => t.name_en)).size, 64);
  assert.equal(new Set(TOWNS.map((t) => t.name_bn)).size, 64);
});

test("the towns are sorted by English name and lie inside Bangladesh's bounds", () => {
  const names = TOWNS.map((t) => t.name_en);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  for (const t of TOWNS) {
    assert.ok(t.lat >= 20 && t.lat <= 27, `${t.id} latitude ${t.lat}`);
    assert.ok(t.lng >= 88 && t.lng <= 93, `${t.id} longitude ${t.lng}`);
  }
});

test("nothing saved, or a malformed value, gives the default", () => {
  for (const text of [null, undefined, "", "{", "null", "5", '"x"', "[]", "{}", '{"place":5}', '{"place":{"kind":"moon"}}']) {
    assert.deepEqual(parseHome(text), defaultHome(), String(text));
  }
});

test("an unknown town id falls back to the default place", () => {
  assert.equal(parseHome('{"place":{"kind":"town","id":"atlantis"},"hijriOffset":1}').place, null);
  assert.equal(parseHome('{"place":{"kind":"town","id":"__proto__"}}').place, null);
});

test("an offset out of range falls back to 0", () => {
  for (const bad of [2, -2, 0.5, "1", null]) {
    assert.equal(parseHome(JSON.stringify({ hijriOffset: bad })).hijriOffset, 0, String(bad));
  }
  for (const good of [-1, 0, 1]) assert.equal(parseHome(JSON.stringify({ hijriOffset: good })).hijriOffset, good);
});

test("a position out of range or not a number is refused", () => {
  for (const [lat, lng] of [[91, 0], [0, 181], ["23", 90], [null, 90], [23, undefined]]) {
    assert.equal(parseHome(JSON.stringify({ place: { kind: "device", lat, lng } })).place, null);
  }
});

test("a device position is rounded to 3 decimals before it is saved, and nothing else is kept", () => {
  const storage = memoryStorage();
  assert.equal(writeHome({ place: { kind: "device", lat: 23.7104321, lng: -0.1275862, accuracy: 3 }, hijriOffset: -1 }, storage), true);
  assert.equal(storage.map.get(HOME_KEY), '{"place":{"kind":"device","lat":23.71,"lng":-0.128},"hijriOffset":-1}');
  assert.deepEqual(readHome(storage), { place: { kind: "device", lat: 23.71, lng: -0.128 }, hijriOffset: -1 });
});

test("a picked town is read back", () => {
  const storage = memoryStorage();
  writeHome({ place: { kind: "town", id: "sylhet" }, hijriOffset: 0 }, storage);
  assert.deepEqual(readHome(storage), { place: { kind: "town", id: "sylhet" }, hijriOffset: 0 });
});

test("blocked storage gives the default and says the value was not saved", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(readHome(blocked), defaultHome());
  assert.equal(writeHome(defaultHome(), blocked), false);
});

test("the default is Dhaka in the device's zone, a picked town has its own zone, My location the device's", () => {
  const byDefault = resolvePlace(null, "Europe/London");
  assert.deepEqual([byDefault.kind, byDefault.town.id, byDefault.timeZone], ["default", "dhaka", "Europe/London"]);
  const picked = resolvePlace({ kind: "town", id: "dhaka" }, "Europe/London");
  assert.deepEqual([picked.kind, picked.town.id, picked.timeZone], ["town", "dhaka", "Asia/Dhaka"]);
  const mine = resolvePlace({ kind: "device", lat: 51.5, lng: -0.128 }, "Europe/London");
  assert.deepEqual([mine.kind, mine.town, mine.lat, mine.timeZone], ["device", null, 51.5, "Europe/London"]);
});
