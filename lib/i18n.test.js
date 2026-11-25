import test from "node:test";
import assert from "node:assert/strict";
import { LABELS, fmt, t } from "./i18n.js";

test("every label key has a non-empty value in both languages", () => {
  assert.deepEqual(Object.keys(LABELS.en).sort(), Object.keys(LABELS.bn).sort());
  for (const lang of ["en", "bn"]) {
    for (const [key, value] of Object.entries(LABELS[lang])) {
      assert.ok(value.trim().length > 0, `${lang}.${key}`);
    }
  }
});

test("Bangla labels are Bangla, not copies of the English ones", () => {
  for (const key of Object.keys(LABELS.en)) assert.notEqual(t("bn", key), t("en", key), key);
});

test("t throws for an unknown key or language", () => {
  assert.throws(() => t("en", "nope"));
  assert.throws(() => t("fr", "categories"));
});

test("the offline and update labels exist in both languages", () => {
  for (const key of ["updateAvailable", "reload", "dismiss", "offlineTitle", "offlineBody", "offlineLink"]) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
  }
});

test("the bookmark and account labels exist in both languages", () => {
  const keys = ["bookmark", "unbookmark", "bookmarksTitle", "bookmarksEmpty", "bookmarksEmptyLink", "duaFallback", "signIn", "signOut", "unsyncedOne", "unsyncedMany", "signOutConfirm", "cancel"];
  for (const key of keys) for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
});

test("fmt fills placeholders and both languages use the same ones", () => {
  assert.equal(fmt("en", "duaFallback", { n: 121 }), "Dua 121");
  assert.ok(fmt("bn", "duaFallback", { n: 121 }).includes("121"));
  assert.ok(fmt("en", "unsyncedMany", { count: 3 }).startsWith("3 changes"));
  assert.ok(fmt("bn", "unsyncedMany", { count: 3 }).includes("3"));
  assert.equal(fmt("en", "duaFallback"), "Dua {n}");
  for (const key of Object.keys(LABELS.en)) {
    const names = (lang) => [...LABELS[lang][key].matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
    assert.equal(names("bn"), names("en"), key);
  }
});
