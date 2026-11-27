import test from "node:test";
import assert from "node:assert/strict";
import {
  ARABIC_LINE_RATIO,
  ARABIC_PX,
  SETTINGS,
  SETTING_NAMES,
  defaultOf,
  defaultPreferences,
  isSettingName,
  isValidSetting,
  preferencesFromRecords,
} from "./preferences.js";

test("the three settings exist, and the language is not one of them", () => {
  assert.deepEqual([...SETTING_NAMES].sort(), ["arabic_font", "reciter_id", "theme"]);
  assert.equal(isSettingName("language"), false);
  assert.equal(isSettingName("lang"), false);
});

test("every valid value of every closed setting is accepted", () => {
  for (const v of ["light", "dark"]) assert.equal(isValidSetting("theme", v), true, v);
  for (const v of ["small", "medium", "large", "xlarge"]) assert.equal(isValidSetting("arabic_font", v), true, v);
});

test("values outside the lists are rejected", () => {
  for (const v of ["", "Dark", "blue", "system", " dark", "dark ", "light\n", null, undefined, 0, 1, true, {}, ["dark"]]) {
    assert.equal(isValidSetting("theme", v), false, JSON.stringify(v));
  }
  for (const v of ["huge", "Medium", "xxlarge", "28", "", null, undefined, 28]) {
    assert.equal(isValidSetting("arabic_font", v), false, JSON.stringify(v));
  }
});

test("reciter_id takes a positive whole number written as text", () => {
  for (const v of ["7", "10", "123456", "999999"]) assert.equal(isValidSetting("reciter_id", v), true, v);
  for (const v of ["0", "07", "1234567", "abc", "", "-1", "1.5", " 7", "7 ", "7\n", "١٢", 7, null, undefined]) {
    assert.equal(isValidSetting("reciter_id", v), false, JSON.stringify(v));
  }
});

test("a name that is not a setting is never valid, including names on the object prototype", () => {
  for (const name of ["", "unknown", "__proto__", "constructor", "toString", "hasOwnProperty", null, undefined, 3, ["theme"]]) {
    assert.equal(isValidSetting(name, "dark"), false, String(name));
    assert.equal(isSettingName(name), false, String(name));
  }
});

test("defaults: light, medium, and no reciter", () => {
  assert.equal(defaultOf("theme"), "light");
  assert.equal(defaultOf("arabic_font"), "medium");
  assert.equal(defaultOf("reciter_id"), null);
  assert.deepEqual(defaultPreferences(), { theme: "light", arabic_font: "medium", reciter_id: null });
  assert.throws(() => defaultOf("unknown"));
});

test("every default of a closed setting is one of its own values", () => {
  for (const [name, s] of Object.entries(SETTINGS)) {
    if (s.values) assert.ok(s.values.includes(s.default), name);
  }
});

test("the pixel map has medium at 28 and covers every size, growing with the size", () => {
  assert.equal(ARABIC_PX.medium, 28);
  assert.deepEqual(Object.keys(ARABIC_PX).sort(), [...SETTINGS.arabic_font.values].sort());
  const order = SETTINGS.arabic_font.values.map((v) => ARABIC_PX[v]);
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal(new Set(order).size, order.length);
  assert.equal(Math.round(28 * ARABIC_LINE_RATIO), 56);
});

test("the tables cannot be changed by accident", () => {
  assert.throws(() => {
    "use strict";
    SETTINGS.theme.values.push("blue");
  });
  assert.throws(() => {
    "use strict";
    ARABIC_PX.medium = 30;
  });
});

test("preferencesFromRecords fills defaults and ignores records that are not valid", () => {
  assert.deepEqual(preferencesFromRecords([]), defaultPreferences());
  assert.deepEqual(preferencesFromRecords(undefined), defaultPreferences());
  assert.deepEqual(
    preferencesFromRecords([
      { pref_key: "theme", value: "dark" },
      { pref_key: "arabic_font", value: "xlarge" },
      { pref_key: "reciter_id", value: "7" },
    ]),
    { theme: "dark", arabic_font: "xlarge", reciter_id: "7" }
  );
  assert.deepEqual(
    preferencesFromRecords([
      { pref_key: "theme", value: "blue" },
      { pref_key: "arabic_font", value: 3 },
      { pref_key: "nope", value: "x" },
      null,
    ]),
    defaultPreferences()
  );
});

// ---- applying to the page (add-preferences 6.2) ----

import { PREFS_COPY_KEY, applyPreferences, inlineScriptText, prefsCopyText } from "./preferences.js";

const fakeRoot = () => {
  const style = {};
  return { dataset: {}, style: { setProperty: (k, v) => (style[k] = v) }, seen: style };
};

test("applyPreferences sets the attribute and the size variable for each value", () => {
  for (const theme of ["light", "dark"]) {
    const root = fakeRoot();
    applyPreferences({ theme, arabic_font: "medium" }, root);
    assert.equal(root.dataset.theme, theme);
  }
  for (const [name, px] of Object.entries(ARABIC_PX)) {
    const root = fakeRoot();
    applyPreferences({ theme: "dark", arabic_font: name }, root);
    assert.equal(root.seen["--arabic-size"], `${px}px`);
  }
});

test("applyPreferences changes nothing for a bad or missing value", () => {
  for (const values of [undefined, null, {}, { theme: "blue", arabic_font: "huge" }, { theme: 1, arabic_font: null }, { theme: "__proto__" }]) {
    const root = fakeRoot();
    applyPreferences(values, root);
    assert.deepEqual(root.dataset, {});
    assert.deepEqual(root.seen, {});
  }
  applyPreferences({ theme: "dark" }, undefined); // no root: no error
  const half = fakeRoot();
  applyPreferences({ theme: "dark", arabic_font: "huge" }, half);
  assert.deepEqual([half.dataset.theme, half.seen["--arabic-size"]], ["dark", undefined]);
});

function runInline(stored) {
  const root = fakeRoot();
  const document = { documentElement: root };
  const localStorage = {
    getItem: (k) => {
      if (stored instanceof Error) throw stored;
      return k === PREFS_COPY_KEY ? stored : null;
    },
  };
  new Function("document", "localStorage", inlineScriptText())(document, localStorage);
  return { theme: root.dataset.theme, size: root.seen["--arabic-size"] };
}

test("the inline script sets the attribute and variable for a valid copy", () => {
  assert.deepEqual(runInline(prefsCopyText({ theme: "dark", arabic_font: "xlarge" })), { theme: "dark", size: "40px" });
  assert.deepEqual(runInline(prefsCopyText({ theme: "light", arabic_font: "small" })), { theme: "light", size: "22px" });
});

test("the inline script sets nothing for a missing, corrupt or out-of-list copy, or blocked storage", () => {
  const none = { theme: undefined, size: undefined };
  for (const stored of [null, "", "not json", "[]", "null", "5", '"dark"', '{"theme":"blue","arabic_font":"huge"}', '{"theme":1,"arabic_font":{}}', '{"arabic_font":"__proto__"}', '{"arabic_font":"toString"}']) {
    assert.deepEqual(runInline(stored), none, String(stored));
  }
  assert.deepEqual(runInline(new Error("blocked")), none);
  assert.deepEqual(runInline('{"theme":"dark","arabic_font":"huge"}'), { theme: "dark", size: undefined });
});

test("the inline script text is built from the module's lists and the copy round-trips", () => {
  const text = inlineScriptText();
  for (const v of SETTINGS.theme.values) assert.ok(text.includes(`"${v}"`));
  assert.ok(text.includes(PREFS_COPY_KEY));
  assert.deepEqual(JSON.parse(prefsCopyText({ theme: "dark", arabic_font: "large", reciter_id: "7" })), { theme: "dark", arabic_font: "large" });
});
