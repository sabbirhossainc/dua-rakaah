# Design

## Context

See `proposal.md` for why, and `plan.md` sections 4.4 and 4.5 for the merge rules. The sync, the record-type table and
the local store were built for bookmarks (`add-user-data-sync`) and generalized for memorize (`add-memorize`); both are
archived under `openspec/changes/archive/` and their designs are not repeated here. Facts checked in the code on
2026-11-25:

- **The record-type table is not yet key-agnostic.** `RECORD_TYPES` entries have a `keyField`, and the server's
  `mergeRecordInto`, `readSince` and `mergeAnonIntoAccount` already read it. But these still name `dua_id`:
  `validateOp` (it checks and copies `op.dua_id`), `wireOp` in `lib/local/sync.js` and `lib/local/account.js` (they copy
  `dua_id` onto the wire), the runner's `pending` set and `db[table].get(row.dua_id)`, and the tests. A name-keyed type
  needs those generalized first (D1).
- **Sign-in merges every anonymous row with `type.merge`** (`mergeAnonIntoAccount`), and **re-sends every local record
  as a change** (`allResendOps`) on sign-in and after a `403`. Both assume "newest or furthest wins". The account-wins rule
  for settings (`plan.md` 4.5) needs its own path (D3).
- **Pages are static.** `app/layout.js` is a Server Component with `<html lang="en">`; the saved pages are the same HTML
  for every reader, so the server cannot know a reader's theme. `node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`
  describes the supported fix: an inline script that sets the DOM before first paint, plus `suppressHydrationWarning`.
- **`RightBar` is a Server Component** that shows only at 1536px and wider (`2xl:block`). Its Font Settings and Appearance
  Settings entries are static boxes. `LanguageToggle` is the one client component in it.
- **There is no dark theme.** The app uses `bg-white` (about 20 places), `bg-[#ebeef2]` on the body, `border-[#cccdcf]`,
  `text-[#868686]` and the default text color. Seven `dark:` classes exist (icon inversion in `RightBar`) and follow the
  operating system's `prefers-color-scheme`.
- **The Arabic text size is fixed in `DuaCard`:** `text-[28px]` with `leading-[3rem]` (48px, a ratio of about 1.71).
- **Dexie database `dua-user` is at version 2** (`bookmarks`, `outbox`, `meta`, `kept_ops`, `memorize`).
- **AGENTS.md:** this is not the Next.js of the training data. The task list reads the matching bundled guide before
  each Next-facing task.

## Goals / Non-Goals

**Goals:**
- Choosing a theme or a text size works offline, applies at once, and is on every device after sign-in.
- A reader who chose dark never sees a light page first, on a full load or from the offline cache.
- Bookmark and memorize behavior is unchanged by the key generalization: their existing tests pass with only call-shape changes.
- A new record type with a string key is a descriptor plus its tests.

**Non-Goals:**
- Purging and account deletion (a separate change), the player and reciter picker (phase 4).
- Making the Settings panel reachable below 1536px (open question 1).
- A "system" appearance, per-page themes, custom fonts, a language setting.

## Decisions

### D1: The record key is named by the record type, and the code stops assuming `dua_id`

A change and a pulled row carry their key under the name the type's descriptor gives (`keyField`): `dua_id` for
bookmarks and memorize (as today), `pref_key` for settings.

```
 change  { op_id, type: "preference", pref_key: "theme", fields: { value: "dark", if_absent: 0|1 }, client_ts }
 row     { type: "preference", pref_key: "theme", value: "dark", updated_at, op_id, server_seq }
 record  { pref_key, value, updated_at, op_id }
```

- `keyOf(typeName, thing)` (reads `thing[RECORD_TYPES[typeName].keyField]`) is added and used wherever `dua_id` was
  assumed: `validateOp` checks and copies `op[type.keyField]`, the runner's `pending` set is `type:key`, `wireOp` copies
  the type's key field, and the pulled-row lookup uses it. Bookmark and memorize ops are byte-for-byte as before.
- The column and field are `pref_key`, not `key`: `KEY` is an SQL keyword.
- **Alternative:** one generic `key` field for every type. Rejected: it would change the wire format of the two existing
  types and every change already stored in readers' outboxes and `kept_ops` (they carry `dua_id`).
- **Validation of the key** is the type's: a setting name must be one of the three known names (D2).

### D2: The setting record, its table and its values

`lib/preferences.js` is a small pure module shared by the server, the browser, the applier and the inline script:

```
 SETTINGS = {
   theme:       { values: ["light", "dark"],                       default: "light"  },
   arabic_font: { values: ["small", "medium", "large", "xlarge"],  default: "medium" },
   reciter_id:  { pattern: /^[1-9][0-9]{0,5}$/,                    default: null     },   // a reciter number, as text
 }
 ARABIC_PX = { small: 22, medium: 28, large: 34, xlarge: 40 }       // medium is today's 28px
```

- Record `{ pref_key, value, updated_at, op_id }`, stored in `preferences(owner_id, pref_key, value, updated_at, op_id,
  server_seq, PRIMARY KEY (owner_id, pref_key))` with an index on `(owner_id, server_seq)`, appended to `SCHEMA_STATEMENTS`.
  CHECKs bound the lengths (`pref_key` 1 to 32, `value` 1 to 64) but **not** the list of names, so a new setting needs no
  table change.
- **Merge:** the newest change wins (greater `updated_at`, then greater `op_id`). It is the bookmark rule, so
  `mergeBookmark`'s body becomes a shared `newestWins(a, b)` and `mergePreference` is that function. `same` compares `op_id`;
  `normalize` clamps `updated_at` with `clampTimestamp` (a wrong device clock cannot win every conflict), exactly as for bookmarks.
- **No `deleted` column.** A reader never "removes" a setting: choosing the default writes the default as an explicit
  record, so it beats a non-default value saved on another device (spec: "Back to the default is kept"). The reciter has no
  default, so once set it stays set until another reciter is chosen. If phase 4 needs "use the app's default reciter",
  that is a new value (or a `deleted` column) then.
- **Validation:** the name must be a key of `SETTINGS`, `value` must be text, and `fields.if_absent` is 0 or 1 (default 0).
  An unknown name is a 400. This makes a deploy where a newer browser sends a name an older server does not know fail
  (see Risks), which is accepted for the same reason as `memorize` ops: fix forward.
- **Alternatives:** (a) a key/value table with free names and JSON values: loses the checks and lets a client grow one
  owner's rows without limit. (b) store the three settings in one JSON blob record: any two devices changing different
  settings would overwrite each other. Rejected.

### D3: Sign-in: the account's value wins, through a "set if absent" change

`plan.md` 4.5: at sign-in the account's existing value wins, and the device's value is used only for settings the
account does not have. Plain newest-wins cannot do this, and there are three ways a device's setting reaches the account
at sign-in, each needing the rule:

1. **The server's merge** (`mergeAnonIntoAccount`): the descriptor gets an optional `mergeAnon(existing, incoming)`;
   settings define it as `existing ?? incoming`. Other types leave it out and use `merge`. `mergeRecordInto` takes a rule
   (`"merge"` or `"anon"`) and picks the function; `same(winner, existing)` makes a second merge a no-op.
2. **Changes still queued** when the reader signs in (the last best-effort send failed or the device was offline): they
   would be sent under the account as ordinary changes and, if newer, beat the account's value.
3. **The safety-net re-send** of every local record (used when the cookie was lost and the server could not merge).

For 2 and 3 the browser, at sign-in, **deletes the queued setting changes and queues one `if_absent` change per local
setting record** (carrying the record's current value). The server applies a change with `fields.if_absent = 1` with the
`"anon"` rule: stored only if the account has no value for that name. One mechanism covers the merge being skipped and
changes that never reached the anonymous owner.

- **After sign-in the device pulls everything** (cursor 0, existing behavior), and a setting row with no change of ours
  waiting **replaces** the local record (D4), so the device shows the account's value.
- A change the reader makes **after** signing in is an ordinary change (`if_absent` 0): newest wins.
- **Changes kept after an offline sign-out** (`kept_ops`) are the account's own earlier choices and stay ordinary
  changes when the same account signs in again.
- **The re-send after a `403`** is to a brand-new anonymous owner that has nothing, so it sends ordinary changes
  (`if_absent` 0) and includes settings.
- **Order dependence, stated:** which value an account ends with depends on which device signed in first for a setting
  the account lacked (the first one provides it). Every device still converges to what the server holds. The convergence
  test therefore compares devices with the server for settings, and does not compare against a "newest of all changes"
  oracle (it keeps that oracle for bookmarks and the merge oracle for memorize).
- **Alternative:** the server decides from the account's rows only at merge time and the browser drops queued setting
  changes without re-sending them. Rejected: a setting chosen offline for a setting the account lacks would be lost.

### D4: Local store, runner and pulled rows

- **Dexie version 3** adds `preferences: "pref_key"`; earlier versions are untouched. (Rolling back to code that declares
  an older version still opens the database; checked for version 2 in `add-memorize` task 1.2, and checked again for 3 in task 1.2 here:
  **result, with `fake-indexeddb` and Dexie 4: a database created at version 3 opens when the code declares only version 2,
  `bookmarks` and `memorize` read back intact, writes still work, and the database reopens at version 3 with its `preferences` row.**
  Not yet repeated in a real browser; task 7.1 does not need it, because the check is on Dexie's own open logic.)
- `CLIENT_TYPES.preference = { table: "preferences", pulled: pulledPreference, resend }`. `pulledPreference` is the
  bookmark rule: with a change of ours waiting for that name, merge with `newestWins`; otherwise the server's row replaces
  ours (the server may have clamped a time). The runner's transactions already list every table through `recordTables(db)`.
- `resend(records, newId, { atSignIn })` is how a type produces re-send changes. Settings return `if_absent` changes when
  `atSignIn` is true and ordinary ones otherwise. `completeSignIn` calls it with `atSignIn: true` and removes queued
  changes of types that declare `replaceQueuedAtSignIn` (settings); the 403 path calls it with `atSignIn: false`.
- `setPreference(db, name, value, { now, newId })` writes the record and the outbox change in one Dexie transaction. It
  is a no-op when there is a record with the same value, or no record and the value is the default. The record's time is at
  least 1 ms after the one it replaces, so a local choice always wins on its own device.
- **Found while writing task 4.2 (a gap in D3/D4, fixed in code):** a queued `if_absent` change must not count as "a change of
  ours is waiting" when a row for the same setting is pulled. If it did, then with more queued changes than one request holds
  (more than 200 at sign-in, e.g. many bookmarks) the `if_absent` change is sent in a later request than the first pull; the
  device's own, newer value would beat the account's row locally, the server would then ignore the `if_absent` change, and the
  account's row (already behind the cursor) would never arrive again, leaving the device and the server different. The runner
  now builds its "waiting" set from changes that `claimsRecord` (not `if_absent`); an ordinary change queued next to it still
  claims the name. Tests: `lib/local/account.test.js` (250 bookmarks plus a setting at sign-in) and `lib/local/sync.test.js`.
- The new type appears in `clientTypeNames()`, so the existing `pulled_types` rule makes a device that gets this version
  pull from position 0 once and the server's `types` opt-in keeps older tabs from receiving setting rows.
- **Sign-out** clears the `preferences` table with the other record tables (existing loop), and the live store then
  reports defaults, so the theme returns to light (D5).

### D5: Applying settings: the live store, the applier, and a copy for the first paint

- `usePreferences()` is a live store like `useBookmarks()` and `useMemorize()`: `{ ready, values }`, `values` being the
  three settings with defaults filled in.
- **`PreferencesApplier`** (client, rendered in the layout next to `SyncStarter`) runs `applyPreferences(values)` in an
  effect: `document.documentElement.dataset.theme = values.theme` and `style.setProperty("--arabic-size", px)`. It also
  writes `localStorage["dua-prefs"] = { theme, arabic_font }`. It writes **only once the store is `ready`**, otherwise the
  first render would overwrite the saved copy with defaults.
- **The inline script** in `<head>` (built from `lib/preferences.js`, so the list of valid values is not repeated) reads
  `localStorage["dua-prefs"]`, checks each value against the allowed list, and sets the same attribute and variable
  before the first paint. `<html>` gets `suppressHydrationWarning` (the guide above). It sets nothing when the copy is
  missing or invalid, which is the light/medium default. A localStorage failure (blocked storage) is caught and ignored.
- **The copy is a cache, not a second source of truth.** IndexedDB wins: after `ready` the applier corrects the page and
  the copy if they differ (at worst one flash, for a reader whose storage was cleared). Sign-out resets it through the
  same path. It holds no identifying data.
- **Checked in task 1.1 (the bundled guide):** the guide's theme section matches this design (a `<head>` script setting an
  attribute on `<html>`, plus `suppressHydrationWarning`). One difference: in development, React Strict Mode's remount resets
  `<html>` to the attributes its JSX names, clearing what the script set, so the applier must re-apply the attribute in an
  effect (it does, once the store is ready); production is unaffected. The guide's `useId`/`InlineScript` helper is for
  per-element scripts and is not needed: the theme script acts on `<html>` once per full load and the attribute survives soft navigations.
- **Alternative:** read IndexedDB in the inline script. Rejected: it is asynchronous, so it cannot run before first paint.
- **Alternative:** a cookie read on the server. Rejected: pages are static and saved for offline use, so the server cannot vary them.

### D6: The dark theme: semantic tokens, not an inverted palette

- `app/globals.css` gets semantic theme colors: `--color-surface` (cards, panels: `bg-white` today), `--color-page` (the
  body's `#ebeef2`), `--color-ink` (body text), `--color-line` (`#cccdcf` borders) and `--color-muted` (`#868686`). Their dark
  values are set under `:root[data-theme="dark"]`. The existing `--color-dua-bg` and `--color-icon-bg` get dark values the same way.
  `primary` stays the same green.
- The components' `bg-white`, `bg-[#ebeef2]`, `border-[#cccdcf]`, `divide-[#cccdcf]` and `text-[#868686]` become the
  semantic classes (about 25 edits, no layout change). **`--color-white` is not overridden**, because `text-white` on
  the green buttons and badges would turn dark with it.
- `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` makes the existing `dark:` classes follow the
  app's theme instead of the operating system's (proposal: behavior note).
- Black SVG icons need inverting in dark; the colored ones (the logo, the category images) must not be. The task
  list does a page-by-page pass in the browser and fixes what it finds with a narrow rule or `dark:invert` on the
  monochrome icons, rather than a blanket filter.
- **Checked in task 1.1:** with this project's Tailwind (`@tailwindcss/postcss` 4.3.x), `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))`
  compiles, and `dark:invert` is emitted as `.dark\:invert:where([data-theme="dark"], [data-theme="dark"] *)`, so it follows `data-theme`.
  Semantic theme colors (`--color-surface`, `--color-page`) generate `bg-surface` and `bg-page`, and `text-[length:var(--arabic-size,28px)]` compiles.
- **Alternative:** `filter: invert(1) hue-rotate(180deg)` on `<html>`. Rejected: it inverts every image and the Arabic text's contrast tuning.
- **Alternative:** Tailwind's `dark:` utilities on every element. Rejected: hundreds of edits for what tokens do in one place.

### D7: The Settings panel, the card, and the labels

- `RightBar` stays a Server Component. Its static Font Settings and Appearance Settings boxes keep their header rows and
  get a client component each underneath, like `LanguageToggle`: `ArabicSizeSetting` and `AppearanceSetting`. Each is a
  native radio group (`fieldset` with a legend, one `<input type="radio">` per option: arrow keys, focus and the
  selected state come free), reads `usePreferences()`, and writes with `setPreference` then `getRunner().notifyChange()`
  (the same pattern as `memorize()` in `lib/local/client.js`, with the one-time persistence request).
- The option labels and legends come from `lib/i18n.js` using the language of the current page
  (`langFromPathname(usePathname())`). The panel's existing English headings ("Settings", "Font Settings") are not
  translated today and are left alone; translating the shell is a separate piece of work already in `plan.md`.
- `DuaCard`'s Arabic paragraph changes from `text-[28px] leading-[3rem]` to `text-[length:var(--arabic-size,28px)]` and
  `leading-[calc(var(--arabic-size,28px)*48/28)]` (1.72 would give 48.16px, not today's 48px), so a missing variable gives today's look exactly.
- The reciter has no control. `setPreference(db, "reciter_id", "7")` is the whole API phase 4 will use.

### D8: Tests

- **Pure units:** `lib/preferences.js` (every value list, the pixel map, defaults), `newestWins` shared by bookmarks and
  settings (the bookmark tests pass unchanged), `validateOp` for settings (every value in and out of range, an unknown name,
  a missing name, a non-text value, `if_absent` 0, 1 and 2) and for bookmark/memorize unchanged, `keyOf`,
  `preferenceChange` (first choice, same value, default value with and without a record, clock behind), `pulledPreference`.
- **Server on a real libSQL file:** a change applied twice, an older change after a newer one, `if_absent` stored when the
  account has no value and ignored when it has one, a sign-in merge with and without an existing account value (and twice,
  and with a forced failure), a pull that names `preference`, positions strictly increasing across mixed concurrent
  writes, and the handler: a request without `types` never gets a setting row, a bad name or value is a 400 that stores nothing.
- **Browser store with `fake-indexeddb`:** a change writes the record and the outbox row in one transaction; the runner
  sends `types` with `preference`, resets the cursor once (`pulled_types`), applies a pulled setting row, keeps a pending
  newer change over an older pulled row, and skips an unknown type; sign-in replaces queued setting changes by one
  `if_absent` change per record and leaves bookmark and memorize changes alone; sign-out clears the table, keeps unsent
  setting changes in `kept_ops`, and the same account signing in sends them as ordinary changes; the 403 re-send includes settings as ordinary changes.
- **Convergence test:** devices also change settings (random name, random valid value) in the same schedule, including
  sign-in part-way. After the final drain every device and the server hold identical settings. Checked by breaking the
  tiebreak in `newestWins` on purpose and seeing a seed fail, then reverting.
- **Smoke:** a setting change is accepted and comes back only when the request names `preference`; a bad value is a 400.
- **Browser check** (manual, recorded under the last task): dark theme on a full load and from the offline copy with no
  light flash; the text size on a card; the choice on a second "device" after sign-in; the account's value winning at
  sign-in; sign-out returning to light; keyboard use; no console errors; every page checked in dark for unreadable text.

## Risks / Trade-offs

- **[A key generalization breaks bookmarks or memorize]** → It is its own task group first, with the existing tests
  as the net: they must pass with only call-shape changes before any setting code is added.
- **[A wrong value reaches the page]** → The inline script and the applier both check every value against
  `lib/preferences.js` before touching the DOM, and ignore anything else.
- **[The copy in localStorage and IndexedDB disagree]** → IndexedDB wins after the first read (D5). A flash happens only when the copy was wrong.
- **[Dark theme leaves unreadable spots]** → A page-by-page check in the browser is a task (D6). Semantic tokens mean a
  fix is one color value or one class.
- **[`@custom-variant` changes the existing `dark:` classes]** → Intended and noted in the proposal; seven classes, all on the right bar's icons.
- **[Production table missing at deploy]** → A request that names `preference` would fail on the `SELECT` and the sync
  answers 503 for bookmarks too. Run `npm run db:user:init` first (it only adds a table). Same rule as memorize; stated in the README.
- **[Rolling back with queued setting changes]** → An older server answers 400 to a batch with an unknown type, so that
  device's sync stalls until the new build returns. Local data is untouched. Fix forward. Not mitigated in code.
- **[A newer browser with a setting name an older server does not know]** → The same 400. Settings are added together on both sides, behind the table above.
- **[The first device to sign in decides the settings the account lacked]** → That is the rule in `plan.md` 4.5. The result is still the same on every device.
- **[Readers below 1536px cannot change settings]** → A pre-existing limit of the right bar (open question 1).
- **[Storage cleared]** → Signed-in readers get settings back from the server. An anonymous reader loses them, like bookmarks.

## Migration Plan

1. **Before deploying the code:** run `npm run db:user:init` against the production database. It adds the `preferences`
   table and index only; the current build ignores it.
2. Deploy. Browsers pick up the build after the "Reload" bar. A device's first sync with it asks from position 0.
3. **Rollback:** deploy the previous build. `preferences` rows stay unused. The previous code opens a Dexie version 3
   database (task 1.2: checked, it opens and its tables read and write normally). Devices with queued setting changes cannot sync until the new build returns.
4. Schema changes later are new statements and a new Dexie version, never edits.

## Open Questions

1. **Reaching Settings on narrower windows.** The right bar only shows at 1536px and wider, so on a laptop or phone a
   reader cannot change the theme or size. This is a layout limit that exists today. A follow-up could add a `/settings`
   page or a menu entry (it would reuse the two setting components unchanged). Not needed for the specs here.
2. **The four Arabic sizes** (22, 28, 34 and 40px, medium being today's 28px) are a visual call. Changing them is one table in `lib/preferences.js`.
3. **Bangla labels** are written by the assistant and need review by a Bangla speaker, with the earlier ones.
