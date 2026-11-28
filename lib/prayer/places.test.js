import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nameIn, nearestName, needsName } from "./places.js";

const table = JSON.parse(fs.readFileSync(new URL("../../public/places.json", import.meta.url), "utf8"));
const at = (lat, lng) => nearestName(table, lat, lng);

test("a position in Bangladesh is named by its district, in both scripts", () => {
  assert.deepEqual(at(24.8949, 91.8687), { en: "Sylhet", bn: "সিলেট" });
  assert.deepEqual(at(23.7104, 90.4074), { en: "Dhaka", bn: "ঢাকা" });
});

test("elsewhere a position is named by its state, or by its country where there is none", () => {
  assert.equal(at(48.137, 11.575).en, "Bavaria");
  assert.equal(at(51.507, -0.128).en, "England");
  assert.equal(at(34.05, -118.24).en, "California");
  assert.equal(at(1.29, 103.85).en, "Singapore");
});

test("the table is well formed", () => {
  assert.equal(table.points.length % 3, 0);
  for (let i = 0; i < table.points.length; i += 3) {
    assert.ok(Math.abs(table.points[i]) <= 9000 && Math.abs(table.points[i + 1]) <= 18000, String(i));
    assert.ok(table.names[table.points[i + 2]], String(i));
  }
  for (const [en, bn] of table.names) {
    assert.ok(en.trim(), en);
    assert.ok(bn === null || /^[ঀ-৿‌‍ .'’(),-]+$/.test(bn), bn);
  }
});

test("the nearest point across the date line is found", () => {
  const small = { names: [["West", null], ["East", null]], points: [0, -17990, 0, 0, 17000, 1] };
  assert.equal(nearestName(small, 0, 179.95).en, "West");
  assert.equal(nearestName({ names: [], points: [] }, 0, 0), null);
});

test("a name is looked up only for a new or unnamed position", () => {
  const name = { en: "Sylhet", bn: "সিলেট", lat: 24.895, lng: 91.869 };
  assert.equal(needsName({ kind: "device", lat: 24.895, lng: 91.869, name }), false);
  // Moved while offline: the old name is kept, and looked up again once online.
  assert.equal(needsName({ kind: "device", lat: 48.137, lng: 11.575, name }), true);
  assert.equal(needsName({ kind: "device", lat: 24.895, lng: 91.869 }), true);
  assert.equal(needsName(null), true);
});

test("a name without Bangla is shown in English on Bangla pages", () => {
  assert.equal(nameIn({ en: "Bavaria", bn: null }, "bn"), "Bavaria");
  assert.equal(nameIn({ en: "Sylhet", bn: "সিলেট" }, "bn"), "সিলেট");
  assert.equal(nameIn({ en: "Sylhet", bn: "সিলেট" }, "en"), "Sylhet");
});
