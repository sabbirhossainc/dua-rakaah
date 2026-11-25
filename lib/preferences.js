// The reader's settings: which exist, their valid values and defaults (design D2).
// Pure: no browser or server APIs. The server's validation, the browser's store, the applier and the inline script
// that runs before the first paint all read this one table, so the list of valid values is written once.

/**
 * One entry per setting. `values` is the closed list a value must be in; `pattern` is for a value that is an open set
 * (a reciter number, kept as text). `default` is what the reader has until they choose, and no record is stored for it.
 */
export const SETTINGS = Object.freeze({
  theme: Object.freeze({ values: Object.freeze(["light", "dark"]), default: "light" }),
  arabic_font: Object.freeze({ values: Object.freeze(["small", "medium", "large", "xlarge"]), default: "medium" }),
  // Stored and synced only: nothing reads it until the audio feature (design D2).
  reciter_id: Object.freeze({ pattern: /^[1-9][0-9]{0,5}$/, default: null }),
});

/** The setting names, in a stable order. */
export const SETTING_NAMES = Object.freeze(Object.keys(SETTINGS));

/** The size of the Arabic text on a dua card for each `arabic_font` value. `medium` is the size the cards had before. */
export const ARABIC_PX = Object.freeze({ small: 22, medium: 28, large: 34, xlarge: 40 });

/** Line height as a multiple of the size (exactly 48px at 28px, as before; the card uses the same ratio in CSS). */
export const ARABIC_LINE_RATIO = 48 / 28;

export const isSettingName = (name) => typeof name === "string" && Object.hasOwn(SETTINGS, name);

/** True when `value` is a valid value for the setting `name`. A non-text value is never valid. */
export function isValidSetting(name, value) {
  if (!isSettingName(name) || typeof value !== "string") return false;
  const setting = SETTINGS[name];
  if (setting.values) return setting.values.includes(value);
  return setting.pattern.test(value);
}

/** The default of a setting, or null for one with none (the reciter). */
export function defaultOf(name) {
  if (!isSettingName(name)) throw new Error(`unknown setting: ${name}`);
  return SETTINGS[name].default;
}

/** Every setting with its default filled in. */
export function defaultPreferences() {
  return Object.fromEntries(SETTING_NAMES.map((name) => [name, SETTINGS[name].default]));
}

/**
 * Settings from a list of stored records (`{ pref_key, value }`), with defaults for the ones with no record and for any
 * record whose value is not valid (so a bad stored value can never reach the page).
 */
export function preferencesFromRecords(records) {
  const values = defaultPreferences();
  for (const r of records ?? []) {
    if (r && isValidSetting(r.pref_key, r.value)) values[r.pref_key] = r.value;
  }
  return values;
}

// ---- applying settings to the page (design D5) ----

/** The localStorage key of the copy the inline script reads before the first paint. A cache, never the source of truth. */
export const PREFS_COPY_KEY = "dua-prefs";

/**
 * Sets the theme attribute and the Arabic size variable on `root` (the `<html>` element) from `values`
 * (`{ theme, arabic_font }`). A missing or invalid value changes nothing, so a bad value never reaches the page.
 */
export function applyPreferences(values, root) {
  if (!values || !root) return;
  if (isValidSetting("theme", values.theme)) root.dataset.theme = values.theme;
  if (isValidSetting("arabic_font", values.arabic_font)) {
    root.style.setProperty("--arabic-size", `${ARABIC_PX[values.arabic_font]}px`);
  }
}

/** The text stored as the first-paint copy. Only the two settings the page needs; nothing that identifies the reader. */
export const prefsCopyText = (values) => JSON.stringify({ theme: values.theme, arabic_font: values.arabic_font });

/**
 * The script that runs in `<head>` before the first paint: reads the copy, checks each value against the same lists as
 * `applyPreferences`, and sets the same attribute and variable. Does nothing for a missing, corrupt or out-of-list copy,
 * and ignores blocked storage. Built from this module so the valid values are written once.
 */
export function inlineScriptText() {
  const themes = JSON.stringify(SETTINGS.theme.values);
  const sizes = JSON.stringify(ARABIC_PX);
  return (
    `(function(){try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(PREFS_COPY_KEY)}));if(!p||typeof p!=="object")return;` +
    `var r=document.documentElement,T=${themes},S=${sizes};` +
    `if(typeof p.theme==="string"&&T.indexOf(p.theme)>=0)r.dataset.theme=p.theme;` +
    `if(typeof p.arabic_font==="string"&&Object.prototype.hasOwnProperty.call(S,p.arabic_font))r.style.setProperty("--arabic-size",S[p.arabic_font]+"px")` +
    `}catch(e){}})()`
  );
}
