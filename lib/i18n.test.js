import test from "node:test";
import assert from "node:assert/strict";
import { LABELS, fmt, t } from "./i18n.js";
import { SETTINGS } from "./preferences.js";

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
  const keys = ["bookmark", "unbookmark", "bookmarksTitle", "bookmarksEmpty", "duaFallback", "signIn", "signOut", "unsyncedOne", "unsyncedMany", "signOutConfirm", "cancel"];
  for (const key of keys) for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
});

test("the memorize labels exist in both languages and the numbered ones take the number", () => {
  const keys = [
    "memorizeTitle", "memorizeEmpty", "memorizeInProgress", "memorizeLearnedHeading",
    "memorizeControl", "memorizeStateNone", "memorizeStateProgress", "memorizeStateLearned",
    "memorizeLearnedCheckbox", "memorizeProgressLabel", "memorizeStep", "memorizeStartOver", "memorizeClose",
  ];
  for (const key of keys) for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
  for (const key of ["memorizeStateProgress", "memorizeStep"]) {
    for (const lang of ["en", "bn"]) assert.ok(fmt(lang, key, { n: 75 }).includes("75"), `${lang}.${key}`);
  }
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

test("the settings labels exist in both languages and differ between them", () => {
  const keys = [
    "arabicSizeLegend", "arabicSizeSmall", "arabicSizeMedium", "arabicSizeLarge", "arabicSizeXlarge",
    "appearanceLegend", "appearanceLight", "appearanceDark",
  ];
  for (const key of keys) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
    assert.notEqual(t("bn", key), t("en", key), key);
  }
  assert.equal(new Set(keys.map((k) => t("en", k))).size, keys.length, "no two English labels are the same");
  assert.equal(new Set(keys.map((k) => t("bn", k))).size, keys.length, "no two Bangla labels are the same");
});

test("there is a label for every value of the appearance and the Arabic size settings", () => {
  const cap = (v) => v[0].toUpperCase() + v.slice(1);
  for (const v of SETTINGS.theme.values) assert.ok(LABELS.en[`appearance${cap(v)}`], `appearance ${v}`);
  for (const v of SETTINGS.arabic_font.values) assert.ok(LABELS.en[`arabicSize${cap(v)}`], `arabic size ${v}`);
});

test("the data deletion labels exist in both languages and differ between them", () => {
  const keys = [
    "accountLink", "accountTitle", "accountIntro", "deleteData", "deleteDataWarning", "deleteDataConfirm",
    "deleteDataOffline", "deleteDataWorking", "deleteDataDone", "deleteDataFailed", "deleteDataSignIn", "dataDeletedNotice",
  ];
  for (const key of keys) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
    assert.notEqual(t("bn", key), t("en", key), key);
  }
});

test("the audio labels exist in both languages and differ between them", () => {
  const keys = [
    "audioPlay", "audioPause", "audioLoading", "audioUnavailable", "audioCredit", "audioCreditQuran",
    "audioCreditReciter", "audioFullVerse", "reciterLegend", "recitersUnavailable",
  ];
  for (const key of keys) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
    assert.notEqual(t("bn", key), t("en", key), key);
  }
  assert.equal(t("en", "audioUnavailable"), "Audio unavailable");
  assert.equal(t("en", "audioCredit"), "Recitation: Hisn al-Muslim");
  assert.equal(t("en", "audioFullVerse"), "Full verse recitation");
  for (const lang of ["en", "bn"]) assert.ok(fmt(lang, "audioCreditReciter", { name: "X" }).includes("X"), lang);
});

test("the home page labels exist in both languages and differ between them", () => {
  const keys = [
    "homeTitle", "homePlaceTitle", "homeTodayTitle", "homeTimesTitle", "homeCountdownTitle", "homeDuasTitle",
    "homeAllDuas", "homeHadithTitle", "homeLoading",
    "prayerFajr", "prayerSunrise", "prayerDhuhr", "prayerAsr", "prayerMaghrib", "prayerIsha",
    "prayerNow", "prayerNone", "prayerGuide", "prayerUnavailable", "countdownUntil",
    "countdownSentenceUntil", "hourOne", "hourMany", "minuteOne", "minuteMany", "prayerPassed", "prayerStarted",
    "locationMine", "locationFinding", "locationDenied", "locationFailed",
    "locationUnavailable",
  ];
  for (const key of keys) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
    assert.notEqual(t("bn", key), t("en", key), key);
  }
  for (const lang of ["en", "bn"]) {
    assert.ok(fmt(lang, "countdownSentenceUntil", { name: "N", time: "T" }).includes("T"), lang);
    for (const key of ["locationDenied", "locationFailed", "locationUnavailable", "prayerStarted"]) {
      assert.ok(fmt(lang, key, { name: "N" }).includes("N"), `${lang}.${key}`);
    }
    assert.ok(fmt(lang, "countdownUntil", { name: "N" }).includes("N"), lang);
  }
  for (const word of ["Karachi", "Hanafi", "mosque"]) assert.ok(t("en", "prayerGuide").includes(word), word);
  assert.match(t("en", "locationDenied"), /browser's settings/);
  assert.equal(t("en", "locationMine"), "My location");
});

test("the navigation, shell, settings and page intro labels exist in both languages and differ between them", () => {
  const keys = [
    "navHome", "navDuas", "navSaved", "navMemorize", "navSettings", "navLabel", "skipToContent", "sheetClose",
    "languageLegend", "supportPaused", "footerArabicMeaning", "duasLead", "duaCount", "categoryLead", "categoryLeadOne",
    "bookmarksLead", "memorizeLead", "browseDuas", "goHome", "accountStatusTitle", "accountSignedIn",
    "accountSignedOut", "readDua", "notFoundTitle", "notFoundText", "errorTitle", "errorText", "tryAgain",
  ];
  for (const key of keys) {
    for (const lang of ["en", "bn"]) assert.ok(t(lang, key).trim().length > 0, `${lang}.${key}`);
    assert.notEqual(t("bn", key), t("en", key), key);
  }
  for (const lang of ["en", "bn"]) {
    const lead = fmt(lang, "categoryLead", { duas: 31, sections: 2 });
    assert.ok(lead.includes("31") && lead.includes("2"), lang);
    assert.ok(fmt(lang, "duaCount", { n: 45 }).includes("45"), lang);
  }
});
