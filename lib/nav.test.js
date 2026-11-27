// The app-navigation spec: which entries there are, where they go and which one is current.
import test from "node:test";
import assert from "node:assert/strict";
import { LABELS } from "./i18n.js";
import { navEntries } from "./nav.js";

const hrefs = (path) => navEntries(path).map((e) => e.href);
const current = (path) => navEntries(path).filter((e) => e.current).map((e) => e.key);

const EN = ["/", "/duas", "/bookmark", "/memorize", null];
const BN = ["/bn", "/bn/duas", "/bn/bookmark", "/bn/memorize", null];

test("the five entries come in a fixed order, each with a label in both languages", () => {
  const entries = navEntries("/");
  assert.deepEqual(entries.map((e) => e.key), ["home", "duas", "saved", "memorize", "settings"]);
  for (const e of entries) for (const lang of ["en", "bn"]) assert.ok(LABELS[lang][e.label], `${lang}.${e.label}`);
});

test("no entry goes to a page that doesn't exist", () => {
  for (const path of ["/", "/bn", "/support"]) {
    for (const href of hrefs(path)) assert.doesNotMatch(String(href), /rakaah|alldua|dua-info|books/);
  }
});

for (const [path, expected, marked] of [
  ["/", EN, ["home"]],
  ["/bn", BN, ["home"]],
  ["/duas", EN, ["duas"]],
  ["/duas/sleep?cat=6", EN, ["duas"]],
  ["/duas/sleep?cat=6#dua-200", EN, ["duas"]],
  ["/bn/duas/sleep", BN, ["duas"]],
  ["/bn/bookmark", BN, ["saved"]],
  ["/memorize", EN, ["memorize"]],
  ["/account", EN, []],
  ["/bn/account", BN, []],
  ["/support", EN, []],
  ["/offline", EN, []],
  ["/duasx", EN, []],
  ["/bnx", EN, []],
]) {
  test(`${path}: localized links, current ${marked[0] ?? "none"}`, () => {
    assert.deepEqual(hrefs(path), expected);
    assert.deepEqual(current(path), marked);
  });
}
