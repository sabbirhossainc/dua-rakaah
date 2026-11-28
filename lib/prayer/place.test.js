import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPITALS,
  DEFAULT_CAPITAL_ID,
  HOME_KEY,
  ZONE_CAPITALS,
  capitalFor,
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

test("every capital has valid coordinates, a valid zone and a name in both scripts", () => {
  assert.ok(CAPITALS.length > 200);
  assert.equal(new Set(CAPITALS.map((c) => c.id)).size, CAPITALS.length);
  for (const c of CAPITALS) {
    assert.match(c.id, /^[a-z]{2}$/);
    assert.match(c.name_en, /\p{Script=Latin}/u, c.id);
    assert.match(c.name_bn, /^[\u0980-\u09FF\u200C\u200D .'’(),-]+$/, c.id);
    assert.ok(Number.isFinite(c.lat) && Math.abs(c.lat) <= 90, `${c.id} latitude ${c.lat}`);
    assert.ok(Number.isFinite(c.lng) && Math.abs(c.lng) <= 180, `${c.id} longitude ${c.lng}`);
    assert.doesNotThrow(() => new Intl.DateTimeFormat("en", { timeZone: c.tz }), `${c.id} zone ${c.tz}`);
  }
});

test("every zone name points to a capital", () => {
  const ids = new Set(CAPITALS.map((c) => c.id));
  assert.ok(ids.has(DEFAULT_CAPITAL_ID));
  for (const [zone, id] of Object.entries(ZONE_CAPITALS)) assert.ok(ids.has(id), `${zone} ${id}`);
});

test("a time zone gives its country's capital, also by an older name, and otherwise Dhaka", () => {
  const cases = {
    "Europe/London": "London",
    "Asia/Calcutta": "New Delhi",
    "America/Los_Angeles": "Washington",
    "Asia/Dhaka": "Dhaka",
    UTC: "Dhaka",
    "Etc/GMT+5": "Dhaka",
    EST: "Dhaka",
    "Nowhere/Else": "Dhaka",
    constructor: "Dhaka",
  };
  for (const [zone, name] of Object.entries(cases)) assert.equal(capitalFor(zone).name_en, name, zone);
  assert.equal(capitalFor(undefined).name_en, "Dhaka");
  assert.equal(capitalFor("UTC").name_bn, "ঢাকা");
});

test("nothing saved, or a malformed value, gives the default", () => {
  for (const text of [null, undefined, "", "{", "null", "5", '"x"', "[]", "{}", '{"place":5}', '{"place":{"kind":"moon"}}']) {
    assert.deepEqual(parseHome(text), defaultHome(), String(text));
  }
});

test("a town saved by an earlier version and a Hijri adjustment saved by an earlier version are ignored", () => {
  assert.deepEqual(parseHome('{"place":{"kind":"town","id":"sylhet"},"hijriOffset":1}'), { place: null });
});

test("a position out of range or not a number is refused", () => {
  for (const [lat, lng] of [[91, 0], [0, 181], ["23", 90], [null, 90], [23, undefined]]) {
    assert.equal(parseHome(JSON.stringify({ place: { kind: "device", lat, lng } })).place, null);
  }
});

test("a device position is rounded to 3 decimals before it is saved, and nothing else is kept", () => {
  const storage = memoryStorage();
  assert.equal(writeHome({ place: { kind: "device", lat: 23.7104321, lng: -0.1275862, accuracy: 3 } }, storage), true);
  assert.equal(storage.map.get(HOME_KEY), '{"place":{"kind":"device","lat":23.71,"lng":-0.128}}');
  assert.deepEqual(readHome(storage), { place: { kind: "device", lat: 23.71, lng: -0.128 } });
});

test("a saved name is kept with the position, and a malformed one is dropped", () => {
  const named = { kind: "device", lat: 24.895, lng: 91.869, name: { en: "Bavaria", bn: null, lat: 24.895, lng: 91.869 } };
  assert.deepEqual(parseHome(JSON.stringify({ place: named })).place, named);
  for (const name of [{ en: "" }, { en: "X", bn: 5 }, "X", { bn: "সিলেট" }, { en: "X", bn: null }]) {
    assert.equal(parseHome(JSON.stringify({ place: { ...named, name } })).place.name, undefined, JSON.stringify(name));
  }
  assert.deepEqual(resolvePlace(named, "Europe/Berlin").name, named.name);
});

test("blocked storage gives the default and says the value was not saved", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(readHome(blocked), defaultHome());
  assert.equal(writeHome(defaultHome(), blocked), false);
});

test("a capital is shown in its own zone, the device's position in the device's", () => {
  const capital = resolvePlace(null, "America/Los_Angeles");
  assert.deepEqual([capital.kind, capital.city.name_en, capital.timeZone], ["capital", "Washington", "America/New_York"]);
  assert.deepEqual([capital.lat, capital.lng], [capital.city.lat, capital.city.lng]);
  const mine = resolvePlace({ kind: "device", lat: 51.5, lng: -0.128 }, "Europe/London");
  assert.deepEqual([mine.kind, mine.city, mine.lat, mine.timeZone], ["device", null, 51.5, "Europe/London"]);
});

test("Dhaka keeps the coordinates its times have always been computed for", () => {
  const { lat, lng, timeZone } = resolvePlace(null, "Asia/Dhaka");
  assert.deepEqual([lat, lng, timeZone], [23.7104, 90.4074, "Asia/Dhaka"]);
});
