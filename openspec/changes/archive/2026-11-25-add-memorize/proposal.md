# Proposal

## Why

Readers can bookmark duas, but there is no way to track which duas they are learning by heart. The sidebar has a
"memorize" entry that goes nowhere, and the card's `plan` icon does nothing. `plan.md` (phase 3, next item) decides
what memorizing is: a "learned" flag and a progress value from 0 to 100, both set by the reader, with no spaced
repetition, merged across devices by "the further progress wins". The local-first sync built for bookmarks
(`add-user-data-sync`) was made so a second record type would be cheap, so this is the moment to prove it.

## What Changes

- **Memorize records.** For each dua the reader can have a learned flag and a progress value (0 to 100). They are saved
  on the device first, queued, and synced through `POST /api/sync`, like bookmarks. A reader who never touches a dua
  has no record for it.
- **Merge rule: the further progress wins.** Two devices that changed the same dua keep the larger learned flag and
  the larger progress. Going backwards on purpose (un-ticking learned, lowering progress, starting over) is a
  *reset*: it raises a per-dua counter, `reset_gen`, and the higher counter wins outright. Any order, any repeat,
  gives the same result on every device.
- **A memorize control on every dua card.** It replaces the placeholder `plan` icon. It shows the dua's state and
  opens a small panel with a "learned" checkbox and five progress steps (0, 25, 50, 75, 100).
- **`/memorize` and `/bn/memorize`.** A page listing the duas the reader has started, in progress first and learned
  after, each linking to its card and with the same control. It works offline and carries the same small title index
  as the bookmark pages. The sidebar entry opens the page for the reader's language.
- **Sync made generic.** Today the server's read, write and merge code and the browser's runner, sign-in and sign-out
  code are written for bookmarks only. They are changed to loop over the record types in `lib/sync/records.js`, with
  bookmark behavior unchanged, so memorize (and later preferences) are entries in that table.
- **Old browser code stays safe.** A request may list the record types the device understands. The server sends only
  those, and a request that lists none gets bookmarks only. A tab still running last week's code never receives rows
  it would store as bookmarks. A device that gets this version pulls everything once, so rows an older version skipped
  are fetched.
- **Sign-in merge, sign-out keep rule and the 30-day expiry** cover memorize changes with no new rules.
- **Tests:** unit tests for the merge and validation, server and local-store tests, memorize in the random-schedule
  convergence test, new smoke checks, and a manual browser check.

Not in this change: reciter and language preferences, spaced repetition or reminders, a "last reviewed" time,
purging old rows, and account deletion.

## Capabilities

### New Capabilities
- `memorize`: tracking learned and progress per dua: the card control, the memorize pages, offline use, and what
  "learned", "progress" and "start over" mean to the reader.

### Modified Capabilities
- `data-sync`: a second record type with its own conflict rule (further progress wins, with resets), validation of its
  fields, a request that names the record types it understands, and convergence that covers both record types.
- `user-identity`: sign-in merges every kind of reader data into the account, not only bookmarks.

## Impact

- **Server:** `lib/sync/records.js` (the `memorize` entry, its merge and validation, the `types` request field),
  `lib/sync/schema.js` (a `memorize` table, added as new statements), `lib/sync/store.js`, `lib/sync/identity.js` and
  `lib/sync/service.js` (loop over record types), `lib/sync/handler.js`. No new package and no new environment
  variable. Production needs `npm run db:user:init` run once more to create the table.
- **Browser:** `lib/local/db.js` (Dexie version 2: a `memorize` table, and the cursor reset), `lib/local/apply.js`,
  `lib/local/sync.js`, `lib/local/account.js`, a memorize module and live store, `app/components/` (the control, the list),
  `app/memorize/page.js` and `app/bn/memorize/page.js`, `LeftBar.js`, `DuaIcons.js`, `lib/i18n.js`, `lib/precache.js`
  (9 fixed pages instead of 7).
- **Specs:** a new `memorize` spec and deltas to `data-sync` and `user-identity`.
- **Docs:** `README.md` (user data section) and `plan.md` (phase 3 status and the memorize decisions below).
- **Deviations from `plan.md`, to be recorded there when this is done:** the `memorize` table has no `deleted`,
  `updated_at` or `last_reviewed_at` columns (see `design.md` D2 and D3), and a reset is an ordinary `memorize` change
  with a higher `reset_gen`, not a separate `memorize.reset` type (D1).
