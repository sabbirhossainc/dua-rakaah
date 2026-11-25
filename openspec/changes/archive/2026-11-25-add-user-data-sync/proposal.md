# Proposal

## Why

Readers can browse every dua, even offline, but the app remembers nothing about them. The bookmark icon on each dua
card does nothing, and `/bookmark` does not exist. `plan.md` (phase 3) decides that user data is local-first: the
reader's device is the source of truth, it works offline, and it syncs through the server to a shared Turso database
so the same bookmarks appear on every device after sign-in. This change builds that foundation and the first feature
on top of it (bookmarks). Memorize and reciter preferences come next and reuse the same sync.

## What Changes

- **A local store in the browser** (IndexedDB, through Dexie) that holds bookmarks and a queue of changes not yet
  sent to the server. The UI reads and writes only this store, so it never waits for the network.
- **Anonymous identity.** Every device gets a random ID on first load and is usable immediately, with no sign-in.
- **Server sync.** A `POST /api/sync` route receives a device's queued changes, merges them into one shared Turso
  database (through `@libsql/client`, server-side only, so the token never reaches the browser), and returns what
  changed since the device's last sync. A sync runs after each change, when the browser comes back online, when the
  tab regains focus, and on a timer. A repeated request has no extra effect.
- **Google sign-in** (Auth.js). Signing in merges the device's anonymous bookmarks into the account, and the account's
  bookmarks then appear on every device that signs in.
- **Sign-out** keeps changes that have not synced yet (hidden from the next person using the device) for 30 days,
  then discards them.
- **Bookmarks.** The bookmark icon on a dua card toggles a bookmark and shows its state. `/bookmark` and
  `/bn/bookmark` list the saved duas, link back to each one, and work offline.
- **Tests** that replay changes from several simulated devices in random order and check that all of them end in the
  same state.

Not in this change: memorize (learned flag and progress), reciter and other preferences (the sync protocol is
written for any record type, so they are added later without changing it), the other sidebar placeholders
(`/alldua`, `/ruqyah`, `/dua-info`, `/books`), search, audio, and the Privacy Policy and Terms pages (needed before
launch, `plan.md`). Translating the global chrome is also left out, except the new strings this change adds.

## Capabilities

### New Capabilities

- `user-identity`: how a device is identified (anonymous ID, signed cookie), Google sign-in, merging an anonymous
  user into an account, and what happens to unsynced data at sign-out.
- `data-sync`: the local store and the sync request: changes are recorded locally first, sent when possible,
  applied once however often they arrive, merged by fixed conflict rules, and pulled by position so clock errors
  cannot hide changes.
- `bookmarks`: the bookmark toggle on dua cards and the bookmark pages, including offline behavior.

### Modified Capabilities

None. The specs from `add-content-pages` and `add-offline-pwa` are not archived yet, and none of their requirements
change. This change adds the two new pages to the saved-for-offline list, which is a data change in
`lib/precache.js`, and the `caching-boundaries` rule that `/api/` is never cached is what keeps `/api/sync` and
`/api/auth/*` safe.

## Impact

- **New dependencies:** `@libsql/client` (server only), `dexie`, `next-auth` (Auth.js v5). Which Auth.js version
  works with Next 16 is checked first (design D2).
- **New files:** a server-only Turso module and schema, the sync route, the Auth.js route and config, a client-side
  local store and sync runner, a bookmark button, the two bookmark pages, tests.
- **Changed files:** `app/components/DuaIcons.js` (the bookmark icon becomes a button, the other four icons stay as
  they are), `app/components/content/DuaCard.js` (passes the dua ID), `lib/precache.js` (two more pages),
  `lib/i18n.js` (new labels), `app/components/Topbar.js` (sign-in and sign-out), `README.md`, `plan.md`.
- **New environment variables (server only):** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`,
  `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and a secret for signing the anonymous cookie. Tests and local development
  use a local libSQL file (`file:` URL), so no cloud account is needed to run them.
- **Needs from the project owner before the live parts can be checked:** a Turso database and token, and a Google
  OAuth client with the right redirect URL.
- **Hosting:** still a Node server. The sync route needs one.
- **Risk:** sync bugs are the main risk (`plan.md`, 4.7). The conflict rules, the once-only change IDs and the
  random-order replay tests are there to contain it. See `design.md`, Risks.
