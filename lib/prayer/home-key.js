// The localStorage key of the home page's choices, and how to forget them. Kept apart from place.js so that
// "Delete my data" does not pull the town list into every page.

export const HOME_KEY = "dua-home";
/** Sent on `window` when this tab changes the saved choices: `storage` events only reach other tabs. */
export const HOME_EVENT = "dua-home-change";

export function announceHomeChange() {
  globalThis.window?.dispatchEvent(new Event(HOME_EVENT));
}

/** Removes the saved place and Hijri adjustment. Safe where there is no localStorage, or it is blocked. */
export function forgetHome() {
  try {
    globalThis.localStorage?.removeItem(HOME_KEY);
  } catch {
    // Blocked storage holds nothing to remove.
  }
  announceHomeChange();
}
