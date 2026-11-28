// The app-navigation spec: which entries there are, where they go and which one is current.
import test from "node:test";
import assert from "node:assert/strict";
import { LABELS } from "./i18n.js";
import { accountEntries, navEntries } from "./nav.js";

const hrefs = (path) => navEntries(path).map((e) => e.href);
const current = (path) => navEntries(path).filter((e) => e.current).map((e) => e.key);

const EN = ["/", "/duas", "/rakaah"];
const BN = ["/bn", "/bn/duas", "/bn/rakaah"];

test("the service entries come in a fixed order, each with a label in both languages", () => {
  const entries = navEntries("/");
  assert.deepEqual(entries.map((e) => e.key), ["home", "duas", "rakaah"]);
  for (const e of [...entries, ...accountEntries("/")]) for (const lang of ["en", "bn"]) assert.ok(LABELS[lang][e.label], `${lang}.${e.label}`);
});

test("the account menu links the profile, saved and memorize pages in the page's language", () => {
  assert.deepEqual(accountEntries("/").map((e) => e.href), ["/account", "/bookmark", "/memorize"]);
  assert.deepEqual(accountEntries("/bn/duas").map((e) => e.href), ["/bn/account", "/bn/bookmark", "/bn/memorize"]);
  assert.deepEqual(accountEntries("/bn/memorize").filter((e) => e.current).map((e) => e.key), ["memorize"]);
});

test("no entry goes to a page that doesn't exist", () => {
  for (const path of ["/", "/bn", "/support"]) {
    for (const href of hrefs(path)) assert.doesNotMatch(String(href), /alldua|dua-info|books/);
  }
});

for (const [path, expected, marked] of [
  ["/", EN, ["home"]],
  ["/bn", BN, ["home"]],
  ["/duas", EN, ["duas"]],
  ["/duas/sleep?cat=6", EN, ["duas"]],
  ["/duas/sleep?cat=6#dua-200", EN, ["duas"]],
  ["/bn/duas/sleep", BN, ["duas"]],
  ["/bn/bookmark", BN, []],
  ["/memorize", EN, []],
  ["/rakaah", EN, ["rakaah"]],
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
