# Design

## Context

See `proposal.md` for why, and `plan.md` sections 2 and 4 for the decisions this design carries out (local-first,
sync through the server, one shared Turso database with `owner_id` columns, hybrid identity). Facts checked on
2026-11-25:

- **Where the app is.** One Next.js 16 app (Turbopack, React 19, Node 24). Content is read-only SQLite
  (`data/dua_main.sqlite`, `lib/db.js`, `server-only`). `add-offline-pwa` precaches the category pages and the
  fixed pages in `lib/precache.js`, and its worker never touches `/api/` (`lib/sw-rules.js`). Neither change is archived.
- **`DuaIcons`** is rendered by `DuaCard`, a server component, and today is five `<Link href="">` icons. The card's
  `dua.id` is the value user data must reference (`plan.md` 4.1). `DuaCard` has `id="dua-<id>"` on its root, so
  `#dua-<id>` links already scroll to a card.
- **Packages** (npm, today): `next-auth@5.0.0-beta.32` (Auth.js v5; its peer range includes Next 16, but v5 is still
  a beta, and `latest` is v4), `@libsql/client@0.18.0` (runs on the server, opens `file:` URLs as well as Turso),
  `dexie@4.4.7`.
- **Next 16** has `proxy.js` (the successor of middleware) and its own authentication guide under
  `node_modules/next/dist/docs/01-app/02-guides/authentication.md`. `AGENTS.md` says to read the bundled docs before
  writing code, so the first task group checks the Auth.js setup against them.
- **Pages with per-reader data must not depend on the server.** Content pages are the same for every visitor and
  are prerendered or saved offline (`plan.md` 4.1). Bookmark state therefore comes from IndexedDB in the browser, never
  from the server render.

## Goals / Non-Goals

**Goals:**
- The reader's bookmarks work with no sign-in, no network and no waiting, and arrive on every device after sign-in.
- Sync is correct before it is fast: the same result for any order, duplicate or delay of changes.
- The sync protocol and the local store are generic (any record type with a key), so memorize and preferences are
  added by describing a new record type, not by changing the protocol.
- Nothing needs a cloud account to develop or test.

**Non-Goals:**
- Memorize, preferences, and their conflict rules (the `memorize` merge in `plan.md` 4.4 is not built here).
- Live push from the server (WebSockets, server-sent events). Devices poll.
- Purging old removed rows on the server, and account deletion. Both are needed before launch but are not
  needed to prove the design.
- A web app manifest, background sync API, and anything that makes the worker handle `/api/` (it must not).

## Decisions

### D1: Sync goes through `POST /api/sync`, one round trip, with a position cursor

Same as `plan.md` 4.3. The request is `{ anon_id, cursor, ops }` and the answer is `{ owner_id, cursor, rows }`.
`ops` is the device's outbox. `rows` are all records with `server_seq` greater than `cursor`. The server applies
the ops, then reads the rows, in one transaction, so an op the device just sent comes back in the same answer and
the device does not need a second request.

- **A record type is described once**, in a table in `lib/sync/records.js` (name, key columns, merge function,
  value validator). Only `bookmark` exists in this change. The route, the local store and the tests loop over that
  table, so adding `memorize` later is one entry plus its merge function.
- **Alternatives:** (a) talk to Turso straight from the browser: rejected in `plan.md` 4.1 (one database per visitor
  and the token reaching the browser). (b) A REST route per action (`PUT /api/bookmarks/<id>`): simpler for one
  record type, but it cannot send a batch made offline, cannot be idempotent without extra work, and would be
  redone for memorize.
- **Batch limit:** 200 ops per request and 64 KB body. A device with more sends several requests. This bounds the
  work one request can make the server do.

### D2: Auth.js v5 beta, JWT sessions, no adapter and no Auth.js tables

`plan.md` says Auth.js "storing its tables in Turso". That is not needed: the app stores no email, name or picture
(`user-identity` spec). With the JWT session strategy and no adapter, Auth.js keeps nothing in the database, and
the only thing the app needs from an account is Google's stable `sub`. The `owners` table stores it as
`user_id = "google:<sub>"`.

- **Alternatives:** (a) a database adapter with the `users`, `accounts` and `sessions` tables: more tables, and it
  would store profile data the app has no use for. (b) NextAuth v4 (`latest`): stable, but built for the Pages
  Router and has no support for Next 16. (c) Writing Google OAuth by hand: more security-sensitive code than it
  is worth.
- **Proven (task 1.1, 2026-11-25):** `next-auth@5.0.0-beta.32` with the Google provider, JWT sessions and no adapter builds on
  Next 16.4.6 (Turbopack). `/api/auth/providers` and `/api/auth/session` work (the session is `null` when signed out),
  and `auth()` returns `null` in a Route Handler. `/duas` and `/bn/duas` stay static. Visiting `/api/auth/session` sets
  CSRF and callback-URL cookies, which is why the account control calls it once and not on every page.
- **Beta risk:** v5 has been in beta for a long time. It is pinned to an exact version. Task 1.1 proves it
  (sign-in route, session read in a Route Handler, `npm run build`) before anything depends on it, and the
  session is read in exactly one place (`lib/auth.js`), so replacing the library touches one file.
- The session cookie is the Auth.js one. Cookies are `httpOnly`, `sameSite=lax` and `secure` in production.
- **Not signed in is the normal state.** Nothing in the layout calls the session on the server (that would make
  every page dynamic and break the saved-for-offline list). The Topbar's sign-in control is a client component
  that asks `/api/auth/session` once and treats a failure (offline) as "unchanged".

### D3: Identity on the server: `resolveOwner`

One function decides who a request belongs to, in this order:

1. A valid Auth.js session: the owner for `google:<sub>`, created if missing (`kind = account`).
2. The signed cookie `dua_anon` (`<owner_id>.<hmac>`, HMAC-SHA-256 of the id with `ANON_COOKIE_SECRET`,
   compared in constant time): that owner.
3. A body `anon_id` that is a well-formed UUID and has no `owners` row yet: a new owner (`kind = anon`).
   The response sets the cookie.
4. Anything else: reject with 403.

A request with **no changes** from an unknown `anon_id` creates nothing (the reader "never changed anything" and
leaves no record), and the answer has `owner_id: null`.

An anonymous request whose owner chain ends in an **account** and has no matching session is refused with
`401 signed_out`. This covers a session that expired (the cookie still points at the merged account). The client then
treats itself as signed out (D8 sign-out steps, with kept changes).

Then, if the owner row has `merged_into`, follow it, repeatedly, until a row without it. That makes a device that
signs out and in again, or another device on a merged anonymous id, land on the account (`plan.md` 4.5).

- **A bare `anon_id` cannot read or write an existing owner's data.** Step 3 only creates. This stops one person
  from reading another's anonymous bookmarks by guessing a UUID (they are random 122-bit values, but the rule
  is cheap and the `user-identity` spec requires it).
- **A lost first response.** The server creates the owner on the first sync, but the cookie travels in that response. If
  the response is lost, the device retries with no cookie and the server answers `403`. The client rule: **on a `403`
  take a new anonymous id, drop the cursor, and re-send every local bookmark** (`resendOps`). Nothing is lost because the
  device holds all its data. The old owner is left orphaned and unreachable, which is harmless. The same rule covers a
  reader who cleared cookies but not site storage. The convergence test (D10) simulates it.
- **A signed-out device after a merge.** After sign-in the device continues as the account's device. After
  sign-out it starts a new anonymous id and cookie (D8), so it can never reach the account again without signing in.
  The old cookie is cleared by the sign-out call.
- **Alternative:** put the anonymous id only in a cookie and drop it from the body. Rejected: offline-first means
  the id exists in IndexedDB before any cookie does, and the first sync must be able to claim it.

### D4: Turso access, the schema and the counter

`lib/turso.js` (server-only) exports a client built from `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. When the URL
is a `file:` URL, no token is needed. Development uses `file:data/user-dev.db` (gitignored), tests use a temporary
file. Schema is created by a small idempotent `ensureSchema()` run by `npm run db:user:init` and, in development
only, on first use. In production, tables are created by running that command once (README).

```
 owners(id PK, kind, user_id UNIQUE NULL, merged_into NULL, created_at)
 sync_counter(id = 1, value)                      -- the single position counter
 bookmarks(owner_id, dua_id, deleted, updated_at, op_id, server_seq, PK(owner_id, dua_id))
 applied_ops(owner_id, op_id, applied_at, PK(owner_id, op_id))
```

- `server_seq` comes from `sync_counter`, incremented inside the same transaction that applies an op, so two
  concurrent requests can never get the same position and a device never skips a row that commits later with a
  lower position. **This holds because the sync transaction takes the write lock first** (`BEGIN IMMEDIATE`
  through libSQL's `"write"` transaction mode). Reads that need a consistent view of the counter happen inside it.
- A bookmark row stores the `op_id` of the change that won, which is what the "greater identifier wins on equal
  times" rule compares.
- `applied_ops` is how a repeated op is recognised. **It is keyed by owner and op together**, not by op alone: the same
  op must still apply once to the account after it was applied to the anonymous owner, because the client re-sends its
  local bookmarks at sign-in as a safety net (D8). Purging old rows is left for later (see the proposal's follow-up
  list). A repeated application is harmless anyway, because the merge rules are order-independent and idempotent.
- **Write transactions of one client run one at a time inside the process** (a small queue in `lib/sync/store.js`).
  A `file:` database gives each transaction its own connection and two at once fail with `SQLITE_BUSY` (found by the
  50-way concurrency test). Between processes, Turso orders writes itself.
- **Proven (task 1.2, 2026-11-25):** on Node 24, `@libsql/client@0.18` opens a `file:` URL, and a `"write"`
  transaction commits two statements and rolls back on a forced constraint error (the rolled-back row is gone). A
  `server-only` module that imports it builds, a route that uses it answers under `next start`, and no file under
  `.next/static` contains "libsql".
- **Alternative to a global counter:** one counter per owner. Slightly less contention, but the global one is
  simpler to reason about and the app's write rate is tiny.
- **Alternative to `INSERT ... ON CONFLICT` merge in SQL only:** the merge function is plain JavaScript in
  `lib/sync/records.js`, called inside the transaction, so the rules are the same code the tests exercise and the
  client can reuse the same function when applying pulled rows.

### D5: The conflict rule for bookmarks, as a pure function

`mergeBookmark(a, b)` returns the record with the greater `updated_at`, and when equal the greater `op_id`
(string comparison of UUIDs). It is commutative, associative and idempotent, which is what makes the result
independent of order and repetition (`data-sync` spec, "Devices converge"). A removal is a record with
`deleted = 1`, merged by the same rule. `updated_at` is the device's clock in milliseconds; a clock that is
wrong only affects which of two *concurrent* edits wins, never what a device receives (D1 uses `server_seq`).

- **Why not `server_seq` as the arbiter** (last write to reach the server wins): then an edit made earlier but
  synced later would beat a newer one, which surprises the reader. The plan chose newest-change-wins.
- **Clock sanity:** the server clamps an `updated_at` more than 24 hours in the future to the server's current time,
  so a device with a clock set to the year 2100 cannot permanently win every conflict.
- **The server may store a corrected time**, and the server's merge decides ties and conflicts. So a device applies a
  pulled row like this (`pulledRecord` in `lib/local/apply.js`): if it still has an unacknowledged change for that
  dua in its outbox, it merges the row with its own record by the usual rule (its change may still win); otherwise
  the row replaces its record. This makes the server's answer the truth once a change is acknowledged, and a clamped
  time (or any other server-side correction) cannot leave a device on a different value from the server.
- **A local change always wins on its own device**: its time is at least 1 ms after the record it replaces, so a
  device whose clock is behind a synced record's time can still remove or add a bookmark.

### D6: The local store (Dexie) and the sync runner

`lib/local/db.js` (client only) defines the Dexie database `dua-user`:

```
 bookmarks  key [dua_id]            { dua_id, deleted, updated_at, op_id }
 outbox     key op_id               { op_id, type, dua_id, fields, client_ts, owner, kept_at? }
 meta       key name                anon_id, owner, cursor, signed_in_account
```

- **A write is one Dexie transaction** that updates the `bookmarks` row and adds the `outbox` row together, so
  there is never a state change with no op, or an op with no state change.
- **The sync runner** (`lib/local/sync.js`) is a plain module with one in-flight request at a time. Triggers:
  after a write (debounced 500 ms), `online`, `visibilitychange` to visible, a 5-minute interval, and startup.
  It sends the outbox, applies the returned rows with the same merge function, deletes acknowledged ops (by id, so
  an op added during the request is not lost), and saves the cursor, in one Dexie transaction.
- **React side:** a small hook, `useBookmarks()`, uses Dexie's `liveQuery` so every card and the bookmark page
  update when the store changes, including from a sync or another tab. Cards render "not bookmarked" until the
  first read finishes, so the server HTML and the first client render match (no hydration mismatch).
- **Storage persistence:** `navigator.storage.persist()` is called once after the first write.
- **Alternative:** `localStorage`. Rejected: synchronous, size-limited, and no transactions or live queries.
  **Alternative:** `idb` or raw IndexedDB: more code for the same result. Dexie is small and its `liveQuery` is
  what the UI needs.

### D7: The bookmark page gets a title index from the server

`/bookmark` and `/bn/bookmark` are static pages (so they are saved for offline use like `/duas`). Each embeds a
compact index of every dua, built at build time from `getAllDuas()`: `[id, title, categoryId, subcategoryId]`
for 176 duas plus the category list, in that page's language, about 15 to 25 KB. The client component joins the
reader's bookmarks (from Dexie) with this index. Titles come from `groupDuas` (same title rule as the cards, and
a fallback label such as "Dua 121" or the Bangla equivalent for a dua with no title in that language).

- **Link target:** `categoryHref(cat, lang) + "#dua-" + id`. These are the same URLs the worker already saves.
- **Alternative:** fetch dua data from an API at runtime: needs the network, and `/api/` is never cached. Rejected.
- **Alternative:** store titles in the bookmark record: duplicates content in user data and goes stale when the
  content database is replaced. Rejected (`plan.md` 4.1: user records reference `dua.id` by value only).
- `lib/precache.js` gets `/bookmark` and `/bn/bookmark` in `FIXED_PAGE_URLS`; `scripts/check-precache.mjs` and the
  tests that assert "5 page URLs" are updated to 7.

### D8: Sign-in, merge and sign-out

**Sign-in** (client flow, then one server transaction). `lib/sync/service.js` runs identity, the merge, the ops and
the pull as one write transaction:

1. Before leaving for Google, the client sends the outbox one last time (best effort) and stores
   `meta.pending_merge = anon_id`, so the merge still happens if the reader returns after a long Google screen.
2. Google redirects back, Auth.js sets the session.
3. On return the client calls `POST /api/sync` with the same body as always. `resolveOwner` sees a session
   **and** a body `anon_id` that is not the account's: it runs `mergeInto(account, anon_id)` inside the same
   write transaction as the ops, merging every anonymous record into the account with the D5 rule, and sets
   `owners[anon_id].merged_into = account`. The merge needs the cookie for `anon_id` (step 2 of D3) to prove
   the browser owns it.
4. The server's merge needs the signed cookie. If the cookie was lost, the merge is skipped, so **the client also
   re-sends every local bookmark as an op on the first sync after sign-in** (same `op_id`s, at most 176 records, batches
   of 200). Because `applied_ops` is per owner, they apply to the account, and the merge rule keeps the newest.
5. The answer has `owner_id = account`. The client sets `meta.owner = account`, `cursor = 0`, and pulls
   everything. Its own bookmark rows are already merged, so nothing visible changes except additions.

Because the merge happens inside the sync request, a failure rolls the whole request back (the `user-identity`
"merge interrupted" scenario), and retrying is safe (the merge is the idempotent D5 rule and `merged_into` is
set to the same value).

**Sign-out:**

1. If online, the client sends the outbox. If that succeeds (or the outbox was already empty), it clears
   `bookmarks`, `outbox`, `meta.owner` and `meta.cursor`, creates a new `anon_id`, and calls the sign-out route,
   which clears the Auth.js session and the `dua_anon` cookie.
2. If offline or the send failed with unsent ops: the client shows a confirm dialog with the count
   ("3 changes haven't synced. They'll be kept on this device for 30 days and uploaded the next time you sign in.").
   On confirmation it **moves** the unsent ops to a separate Dexie table `kept_ops`
   `{ op_id, account_owner, ..., kept_at }`, clears the rest as in step 1, and signs out. `kept_ops` is never read
   by the UI or the sync runner while signed out or while a different account is signed in.
3. When account X signs in on the device, the runner first sends `kept_ops` whose `account_owner` is X (as
   ordinary ops), then deletes them after the server confirms. Kept ops older than 30 days are deleted at
   startup and before each sync.

- The browser's own `confirm()` is avoided in favor of an in-page dialog (the Chrome tooling cannot drive
  native dialogs and they cannot be translated or styled), but the text and the 30-day rule are fixed by the spec.
- **Shared device caveat:** kept ops are on disk until uploaded or expired, and a person with developer tools can
  read them. They only hold dua numbers and times. This is accepted, and the warning text says the data stays on
  the device.

### D9: Where user data meets the offline layer

`/api/sync` and `/api/auth/*` are already excluded from the worker by `isApi` (`lib/sw-rules.js`, a `caching-boundaries`
requirement from `add-offline-pwa`). This change adds a test that asserts both URLs with `GET` and `POST`, so the
guarantee does not depend on a reader remembering it. The worker is **not** changed. The bookmark pages are
documents like any other and are covered by the existing navigation rule.

- **Sign-in redirects through Google and back** (navigation to other origins and `/api/auth/callback/google`). The
  worker's navigation rule only answers same-origin documents from saved copies and falls back to the network.
  Task 6.x checks that sign-in still works with the worker active, since a cached shell for a callback URL would break it.

### D10: Tests that need no cloud account

- **Pure units** (`node --test`): the merge function, `resolveOwner` (with a fake store), cookie signing,
  validators, `buildPrecacheEntries` with the new pages.
- **Store tests on a real libSQL file** in a temp directory: schema creation twice, op idempotence, `server_seq`
  monotonic under concurrent requests (`Promise.all` of many sync calls), merge into account in one transaction
  with a forced failure in the middle.
- **Convergence test** (`lib/sync/convergence.test.js`): N simulated devices, each an in-memory local store plus The clocks are coarse on purpose, so equal times (the op id tiebreak) happen often. Checked by breaking the
  tiebreak on purpose: seed 28 fails.
  outbox, run a seeded random schedule of local changes, syncs, delivery delays, duplicate deliveries and drops
  against the real server logic. After a final drain, every device and the server must hold identical bookmarks.
  The seed is printed on failure so a failing schedule can be replayed. It runs with several seeds in CI.
- **Browser checks** (manual, like `add-offline-pwa` task 6): offline bookmark, two-device sync (two browser
  profiles), sign-in with real Google credentials when the owner has provided them, sign-out offline.

## Risks / Trade-offs

- **[A sync bug loses or resurrects a bookmark]** → The merge is one small pure function, ops are applied once,
  deletes are records, and the random-order convergence test runs against the real server code.
- **[Auth.js v5 is still a beta]** → Pinned exactly, used in one file (`lib/auth.js`), proven first (task 1.1). If it
  fails the proof, the fallback is hand-written Google OAuth behind the same `getSession()` function, and
  everything else in this design is unchanged.
- **[Anonymous data lost when the browser clears storage]** → Persistent storage is requested after the first
  write. A reader who signs in has the server copy. This is stated in the README. Anonymous-only readers can still lose
  data, which `plan.md` 4.7 accepts.
- **[Turso is unreachable or the token is wrong]** → The route answers 503 and the device keeps its queue. The
  reader sees no error, only that other devices do not update.
- **[A leaked or guessable owner id exposes someone's bookmarks]** → The signed cookie rule (D3). Bookmarks are not
  sensitive, but a reader's list can reveal their interests, so it is treated as private.
- **[Service worker breaks sign-in]** → The worker ignores `/api/` (existing rule, new test) and only answers
  same-origin documents. Checked in a real browser with the worker running (task 7).
- **[The global counter is a write bottleneck]** → Acceptable for a few writes per reader per day. If it ever
  matters, per-owner counters are a local change inside `lib/sync/store.js`.
- **[Clock abuse]** → The server clamps `updated_at` in the future (D5).
- **[Deploys need a persistent Node server and a Turso database]** → Already required for content pages. The Turso
  database and the Google OAuth client are created by the project owner (tasks list what is needed).

## Migration Plan

1. Deploy the code with `TURSO_*`, `AUTH_*` and `ANON_COOKIE_SECRET` set, then run `npm run db:user:init` once.
   Until Turso is configured, the sync route answers 503 and the app behaves as local-only. Readers lose nothing.
2. The bookmark feature is the only visible change. Existing readers have no local database, and Dexie creates it on
   first load.
3. **Rollback:** deploy the previous build. The `owners`, `bookmarks` and `applied_ops` tables are only read by
   this code, so they can stay. Local databases in readers' browsers stay unused until the feature returns.
   The service worker is not changed by this release, so no kill switch is needed.
4. **Schema changes later** are added as new idempotent statements in `ensureSchema()`, never by editing existing
   ones, and Dexie versions are incremented for local store changes.

## Open Questions

- Which Turso region and plan to use, and the production domain for the Google OAuth redirect URL. Neither changes
  the design or tasks. They are needed from the project owner only for the live checks.
- Whether the Topbar sign-in control should live in `MenuCom` or next to it. A layout detail, decided when the
  control is built.
