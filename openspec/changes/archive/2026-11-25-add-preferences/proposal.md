# Proposal

## Why

The Settings panel in the right bar has three entries (General, Font, Appearance) that do nothing, and phase 4 (audio)
needs somewhere to keep the reader's chosen reciter. `plan.md` (phase 3, next item) decides that such settings are a
record type on the same local-first sync as bookmarks and memorize: saved on the device first, copied to every device
after sign-in. Doing it now gives the Settings panel real controls and gives phase 4 a place to store the reciter
without another sync change.

## What Changes

- **A `preference` record type** keyed by a setting name instead of a dua number. Three settings exist:
  - `theme`: `light` or `dark` (appearance).
  - `arabic_font`: the size of the Arabic text on dua cards (`small`, `medium`, `large`, `xlarge`).
  - `reciter_id`: the reader's chosen reciter. **Stored and synced only**: nothing reads it until phase 4.
  Language is **not** a setting: it stays in the URL (`plan.md` section 2).
- **Merge rules.** Within one account, the newest change to a setting wins (the same rule as bookmarks). At sign-in the
  **account's existing value wins**, and the device's value is used only for settings the account does not have yet
  (`plan.md` 4.5). So signing in on a new phone never replaces the choices already made on the reader's other devices.
- **Settings panel.** Font Settings gets a size picker and Appearance Settings gets a light/dark picker, both working
  offline and applied at once. General Settings stays a placeholder. The panel is still only shown at 1536px and wider
  (a layout limit that exists today and is not changed here).
- **A dark theme** (new: the app has none today) and **Arabic text that follows the size setting**.
- **No flash.** Pages are static, so the server cannot know the reader's theme. A small inline script applies the saved
  theme and size before the first paint, from a copy kept in `localStorage`, so a dark-theme reader does not see a white
  page first.
- **The sync learns string keys.** A change and a pulled row name their record by `dua_id` today. They can now carry a
  `pref_key` instead, chosen per record type, and the code that assumed a number (the runner, the outbox, sign-in and
  sign-out, the tests) is generalized. Bookmark and memorize behavior does not change.
- **Sign-in re-sends no settings.** The "send everything again" safety net at sign-in (used when the server cannot prove
  which anonymous owner a device was) skips settings, because re-sending them would let a device's older choice beat
  the account's. The re-send after a `403` still includes them.
- **Old browser code stays safe** with the existing `types` opt-in. A device that gets this version pulls everything once
  (`pulled_types`), so settings saved earlier on the account arrive.
- **Tests:** unit tests for the merge, validation and the sign-in rule, server and browser store tests, preferences in
  the random-schedule convergence test, new smoke checks, and a manual browser check (including dark theme and no flash).

Not in this change: purging old rows and account deletion (a separate change), the audio player and reciter picker
(phase 4), a "system" appearance that follows the operating system, a language preference, and a dark theme for the
service worker's offline page beyond what the shared styles already give it.

## Capabilities

### New Capabilities
- `preferences`: the reader's settings (appearance, Arabic text size, reciter): what they are, how the Settings panel
  changes them, that they apply before the first paint and work offline, and which values are valid.

### Modified Capabilities
- `data-sync`: a record type keyed by name, newest change wins for settings, validation of setting names and values.
- `user-identity`: at sign-in the account's existing settings win over the device's.
- `dua-display`: the Arabic text size follows the reader's size setting (the text itself is still shown exactly as stored).

## Impact

- **Server:** `lib/sync/records.js` (the `preference` entry, a name-keyed validator, a per-type "merge at sign-in" rule),
  `lib/sync/schema.js` (a `preferences` table, added as new statements), `lib/sync/store.js` and `lib/sync/identity.js`
  (the sign-in merge uses the per-type rule), `lib/sync/handler.js` (no change expected). No new package and no new
  environment variable. Production needs `npm run db:user:init` run once more, **before** the new build is deployed.
- **Browser:** `lib/local/db.js` (Dexie version 3: a `preferences` table), `lib/local/apply.js` (`CLIENT_TYPES` entry, key
  generalization, sign-in re-send rule), `lib/local/sync.js`, `lib/local/account.js` (key generalization), a preferences
  module and live store, `app/components/` (`RightBar.js` panels, a small applier), `app/layout.js` (inline script,
  `suppressHydrationWarning`), `app/globals.css` (dark theme and size variables), `app/components/content/DuaCard.js`,
  `lib/i18n.js`.
- **Specs:** a new `preferences` spec and deltas to `data-sync`, `user-identity` and `dua-display`.
- **Docs:** `README.md` (user data section) and `plan.md` (phase 3 status and the preference decisions).
- **Behavior change to note:** the existing `dark:` classes on the right bar's icons follow the operating system's dark
  mode today. They will follow the app's theme setting instead (design D6), so a reader whose operating system is dark
  but who keeps the default light theme no longer gets inverted icons on a light panel.
