# Plan: ird-dua-app

_Last updated 2026-11-26 (phase 4a built, its match review still open). This file covers only the work still ahead. Completed work (restructure into one
Next.js app, SQLite via `lib/db.js`, Next 16, Tailwind 4, ESLint flat config) is in git history, in commit `d1557b2`
on branch `restructure/single-next-app`. Phase 1 (content pages) is the OpenSpec change `add-content-pages`, in
`openspec/changes/archive/2026-11-25-add-content-pages/`._

## 1. Where the project stands

A "Dua & Ruqyah" web app that shows Islamic supplications (duas) grouped by category. Its UI is
modeled on duaruqyah.com.

```
 ird-dua-app/  (one Next.js 16 app, React 19, Tailwind 4, Turbopack)
   app/                 routes and components
   lib/db.js            read-only SQLite helpers (better-sqlite3, server-only)
   data/dua_main.sqlite content database (read-only, ships with the app)
   public/              icons and category images
```

**Works today:**
- `npm run lint`, `npm test`, `npm run build` and `npm run smoke` (checks against a running server) pass.
- `/duas` is a category grid. `/duas/<slug>?cat=N` shows one category with its duas grouped by subcategory.
  `/bn/duas` and `/bn/duas/<slug>?cat=N` are the same pages in Bangla.
- Dua cards show the title, intro text, Arabic text, transliteration, translation, closing text and reference.
  A dua stored across several rows is one card with several parts (176 duas, not 190 cards).
- The language buttons in the Settings panel switch between the two URL trees.
- The content DB is compacted (604 KB), and `npm run db:vacuum` repeats that safely.
- Duas can be bookmarked (the icon on each card), and `/bookmark` lists them. Bookmarks work offline, sync to a shared
  database, and follow the reader after Google sign-in (phase 3).
- Readers can delete their data at `/account`, and old removal records can be purged (phase 3).
- Duas can be memorized (the third icon on each card: a "learned" checkbox and progress steps 0, 25, 50, 75, 100), and
  `/memorize` lists what the reader has started. It works offline and syncs the same way as bookmarks (phase 3).
- Dua parts with a matched Hisn al-Muslim recording can be played while online (phase 4a). **Not ready to launch:** the
  matches are not yet reviewed and the source's usage terms are unconfirmed.

**Not done yet:**

| Area | State |
|---|---|
| `/` and `/support` | Placeholder text only. `/` shows just "Home Page". |
| LeftBar items (`/alldua`, `/ruqyah`, `/dua-info`, `/books`) | These routes don't exist. The others stay as placeholders. `/bookmark`, `/bn/bookmark`, `/memorize`, `/bn/memorize`, `/account` and `/bn/account` exist. |
| `Search` and the category search input | Markup only. Search was left out of phase 1 (item 7 of the old roadmap). |
| `DuaIcons` copy, plan, share, report | Links with `href=""` and no behavior. The bookmark icon works (phase 3). |
| `RightBar` settings (general, font, appearance) | Static. Only the language buttons work. |
| LeftBar and Topbar text | Not translated. Only the content pages and the category list switch language. |
| Bangla UI labels | Written by the assistant (`lib/i18n.js`). A Bangla speaker should review them. |
| Audio | Hisn al-Muslim recordings play on some duas (4a). The review of the matches, Quran.com audio and a reciter picker (4b) are open. See phase 4. |

### Content data model (`data/dua_main.sqlite`)

```
 category (10 rows)          sub_category (23 rows)        dua (190 rows)
 +----------------+          +-----------------+           +--------------------+
 | id             |          | id              |           | id                 |
 | cat_id      <--+----------+ cat_id       <--+-----------+ cat_id             |
 | cat_name_bn    |          | subcat_id    <--+-----------+ subcat_id          |
 | cat_name_en    |          | subcat_name_bn  |           | dua_id             |
 | no_of_subcat   |          | subcat_name_en  |           | dua_name_bn/_en    |
 | no_of_dua      |          | no_of_dua       |           | top_bn/_en         |
 | cat_icon  -----+--> /public/images/<icon>.svg           | dua_arabic         |
 +----------------+          +-----------------+           | dua_indopak        |
                                                           | clean_arabic       |
                                                           | transliteration_*  |
                                                           | translation_*      |
                                                           | bottom_bn/_en      |
                                                           | refference_bn/_en  |
                                                           | audio (114 filled) |
                                                           +--------------------+
```

- Every table is bilingual (`_bn` and `_en`).
- No primary or foreign keys are declared. Joins work by convention on `cat_id` and `subcat_id`.
- 153 duas have Arabic text, and 37 don't.
- 190 rows but **176 distinct `id` values**. Rows that share an `id` are the parts of one dua, and their order in the
  table (`rowid`) is the only record of part order. Keep it when the file is replaced.
- The stored `no_of_dua` counts rows and is off for category 5, so the app computes counts instead.
- The file was 6.7 MB and is now 604 KB after `VACUUM`.
- `lib/db.js` helpers: `getCategories()` (with computed `dua_count` and `subcat_count`), `getCategory(catId)`,
  `getCategoryBySlug(slug)`, `getSubcategories(catId)`, `getDuasByCategory(catId)`, `getAllDuas()`, and `getDua(id)`,
  which returns all parts of one dua in order. They return raw rows with both languages. The pure helpers for
  slugs, language columns and grouping are in `lib/content.js`.

## 2. Decisions

| Topic | Decision |
|---|---|
| Content storage | `data/dua_main.sqlite`, read-only, shipped with the app, read directly by Next.js. There's no separate API server. |
| Content rendering | `/duas` and `/bn/duas` are prerendered. **Category pages render per request**, because `?cat=N` decides the category. The app needs a Node server, and static-only hosting won't work. Route Handlers are for things the browser needs live, such as search. |
| Category URL | `/duas/<slug>?cat=N`. `cat` decides the page. The slug is cosmetic: a wrong slug redirects (308) to the canonical URL, and an unknown category returns 404. |
| `/duas` | A category grid. |
| Language | **English is the default.** Bangla is the alternative. It comes from the URL only: `/duas/...` for English and `/bn/duas/...` for Bangla. |
| Sidebar | Ruqyah, books, dua-info and alldua stay as **placeholders**. Bookmark and memorize become real features. |
| User data | **Turso** (hosted SQLite) for bookmarks, memorize, preferences, and any future data the app writes. It stays separate from the content DB. |
| Identity | **Hybrid.** Users start with an anonymous ID (kept in IndexedDB, and bound to the browser by a signed cookie at the first sync). Google sign-in goes through Auth.js with **JWT sessions and no database adapter**, so no Auth.js tables exist and only Google's account ID is stored. The anonymous data is merged into the account at sign-in. |
| Architecture | **Local-first.** The app works offline and syncs when online. |
| Sync model | **Sync through the server**, to **one shared Turso DB** with `owner_id` columns. The Turso token never reaches the browser. |
| Offline content | **All** content is available offline. |
| Memorize | A "learned" flag plus progress (0 to 100), **set by the user**. No spaced repetition. |
| Memorize conflicts | **The further progress wins.** Un-ticking and resetting are allowed through `reset_gen`. |
| Sign-out | Local data is kept **only if it hasn't synced yet**. Kept data is discarded after **30 days**. |
| Audio hosting | **Not hosted by this app** and **not available offline**. |
| Audio UI | Hidden when offline. Disabled with **"Audio unavailable"** when online but no source works. |
| Audio providers | **Quran.com** first for duas that are Quran verses, then **Hisn al-Muslim**. EveryAyah is dropped because its terms are unknown. |
| Partial-verse duas | Play the full verse, labeled **"Full verse recitation"**. |
| Reciter | **A per-user setting** that syncs through Turso. |

## 3. Roadmap

### Phase 1: Content pages (done)

Implemented by the OpenSpec change `add-content-pages`. It covers the category route, full dua cards, the `/duas`
grid, Bangla through the URL, the cleanups (export name, duplicate IDs, undefined Tailwind classes, `<html>`
class, description and favicon), the `VACUUM`, the deployment trace and the README. See its `design.md` for the
decisions, including D12: there is no `loading.js` above the category pages, because a streamed fallback would force
status 200 and hide the real 404 and 308 responses.

Left over from the old phase 1 list:
- **Search** (optional): add `app/api/search/route.js` with prepared `LIKE` queries, used by `Search` and the category filter.
- **Translate the global chrome** (LeftBar, Topbar) if it's wanted.
- **Bangla label review** by a Bangla speaker.

### Phase 2: Offline content (PWA) (done)

Implemented by the OpenSpec change `add-offline-pwa`. Read its `design.md` for the reasons. In short:

- **Serwist through `@serwist/turbopack`**, not `@serwist/next` (which needs webpack). A Route Handler,
  `app/serwist/[path]/route.js`, builds the worker (`app/sw.js`) and serves it at `/serwist/sw.js`.
- **Saved after one online visit:** the 20 category pages (`/duas/<slug>?cat=N` and `/bn/duas/<slug>?cat=N`, taken from the
  database at build time), `/duas`, `/bn/duas`, `/`, `/support`, `/offline`, and the icons, images, scripts, styles and
  fonts. Each page entry carries a revision that is a hash of the app's source and the content database.
- **Not cached:** audio, anything under `/api/`, and other sites' files. The worker uses its own allow-list of rules
  (`lib/sw-rules.js`), not Serwist's default list, which caches all three.
- **No React Server Component payloads are cached.** Offline, a link click fails to fetch one, and Next falls back to a
  normal page load, which the saved page answers.
- **Updates:** a new build waits until the reader clicks "Reload" in a small bar. The page never reloads by itself.
- **Development:** no worker. A leftover one on the same address is removed.
- **Rollback:** a build with `SW_KILL=1` makes every device remove the worker.
- **Checks:** unit tests for the rules and the list, `npm run check:precache`, extra `npm run smoke` checks, and a
  manual offline test (README, "Offline use"), which was run in Chrome by stopping the server.

Left for later: a web app manifest and PNG icons (installing the app), and an offline banner.

### Phase 3: User data, identity and sync (done)

Implemented for bookmarks by the OpenSpec change `add-user-data-sync`. Read its `design.md` for the reasons. In short:

- **Server:** Turso through `@libsql/client` (`lib/turso.js`; a `file:` URL for local use and tests), the schema in
  `lib/sync/schema.js`, the merge rules and validation in `lib/sync/records.js`, identity and the sign-in merge in
  `lib/sync/identity.js`, and `POST /api/sync` (`lib/sync/handler.js`, one write transaction per request).
- **Identity:** Auth.js (`next-auth@5.0.0-beta.32`, pinned) with Google, JWT sessions, no adapter. The signed cookie
  `dua_anon` proves which anonymous owner a browser holds. A `403` makes the client take a new anonymous ID and re-send
  everything (design D3). A session that ended gives `401 signed_out`.
- **Client:** IndexedDB through Dexie (`lib/local/`): bookmarks, an outbox, `meta`, and `kept_ops` for changes kept
  after an offline sign-out. A sync runner sends after each change, on `online`, on focus and every 5 minutes.
- **Features done:** the bookmark button on every card, `/bookmark` and `/bn/bookmark` (offline, with a title index
  built into the page), Google sign-in and sign-out with the 30-day keep rule, and the sync of all of it.
- **Tests:** unit and store tests, and a convergence test that replays random schedules over simulated devices (200
  seeds). Sign-in with a real Google account was checked by hand on 2026-11-25: the account was created with only the Google ID, bookmarks synced to it, and a second device (local data wiped, session kept) received them.

Memorize is implemented by the OpenSpec change `add-memorize` (read its `design.md` for the reasons). In short:

- **Generic sync.** The server's store, the sign-in merge and the browser's runner, sign-in and sign-out code now loop
  over the record types in `lib/sync/records.js` (server) and `CLIENT_TYPES` in `lib/local/apply.js` (browser). A new
  record type is a descriptor in each plus its tests.
- **One change type, `memorize`.** A reset is an ordinary change with a higher `reset_gen`, not a separate
  `memorize.reset` type, because the server's merge only looks at `reset_gen` (section 4.4).
- **The record has no clock:** `memorize(owner_id, dua_id, learned, progress, reset_gen, server_seq)`. There is no
  `deleted` ("start over" is a reset to 0 and not learned), no `updated_at` and no `last_reviewed_at`: nothing reads
  them, and a device-clock value inside a max-merge cannot be corrected by the server.
- **`types` in the request.** A request may name the record types the device understands. Without it the server sends
  bookmarks only, so a browser still running old code is never sent rows it would store as bookmarks. A device that
  starts to understand a new type pulls from position 0 once (`meta.pulled_types`).
- **Dexie version 2** adds the `memorize` table. Progress input is five steps (0, 25, 50, 75, 100); the server accepts
  any whole number from 0 to 100. The panel couples the two fields: ticking "learned" sets progress 100, un-ticking
  leaves progress alone, and choosing a step under 100 also un-ticks "learned".
- **Deploy order:** run `npm run db:user:init` on the hosted database *before* deploying the build that needs a new table.
- **Settings** (OpenSpec change `add-preferences`): record type `preference`, keyed by `pref_key` (not `key`, an SQL
  keyword), with three names, `theme`, `arabic_font` and `reciter_id` (stored only until phase 4). Dexie version 3. Deviations
  from sections 4.2 and 4.5: the column is `pref_key`, there is no `lang` setting (the language is the page's URL), and the
  account-wins rule at sign-in is a `fields.if_absent` change (set only if the account has no value) used for queued and
  re-sent setting changes, plus `mergeAnon` on the server. Dark theme and text size are applied by `PreferencesApplier`
  and an inline script before first paint, using the `dua-prefs` copy in localStorage. The settings are on the right bar
  (1536px and wider only); a `/settings` page for narrower screens is not built.

- **Purge and data deletion** (OpenSpec change `add-data-deletion`): `npm run db:user:purge` removes removed
  bookmarks and applied change IDs accepted more than 180 days ago, and a device that missed a purge is refreshed
  (`since`, `full`, `removed_before`). Readers delete their data at `/account` and `/bn/account`; deletion markers
  stop other devices uploading it again (`410`). Nothing schedules the purge: the operator does. Not built: deleting
  empty or abandoned anonymous owners, exporting data, and the Privacy Policy page.

### Phase 4: Audio

Split into two changes, so that audio could start without Quran Foundation credentials.

**4a: Hisn al-Muslim** (OpenSpec change `add-dua-audio`; read its `design.md` for the reasons). Built:

- `npm run audio:match` matches each dua **part** against the source and writes `data/audio-sources.json` and a
  review report. A person's decisions go in `data/audio-review.json` (README, "Audio").
- A player on each matched part: hidden offline, next recording on failure, "Audio unavailable", the credit line.
- `npm run audio:check` checks the listed URLs. **Nothing schedules it:** the operator does.
- **Differences from sections 5.2 and 5.3:** the list is a JSON file, not an `audio_sources` table. It is keyed by dua,
  part number and a hash of the Arabic text. Only a **whole-text** likeness of 95% is accepted without a person (a
  contained match needs review). `ihadis` URLs are not listed. There is no `checked_at`, `verse_keys` or `coverage` yet.
- **Open:** the review of the matches (task 3.1 of the change). Before it, 50 of 153 parts (47 of 140 duas) have a
  recording.
- **Decided 2026-11-26:** the automatic matches are used for now, and a Hafez will review them later. Nobody has
  listened to them yet. **Duas 2, 75, 124, 232 and 239 are held back,** because their written text differs from the
  recording's by a word or letter. Each hold is a `reject` line in `data/audio-review.json`; when the Hafez approves
  one, change it to `approve` and run `npm run audio:match -- --cached`. Duas 125, 201 and 225 are below 100% too, but
  differ only in spelling or spacing, and stay on.
- The report to send is `.audio-cache/report-for-hafez.html` (local only, never committed). It was made before the
  holds, and `audio:match` rewrites `report.html` but not this copy.

**4b: Quran.com** (not started):

1. Match `dua_arabic` against a Quran text with an open license (such as Tanzil) and add the verse keys to the list.
2. `/api/audio/<dua_id>?reciter=<id>` and `/api/reciters`: Quran.com calls made from the server, cached for 7 days or less (section 5.4).
3. The "Full verse recitation" label and the Quran Foundation credit in the player.
4. A reciter picker: "Audio / Reciter" in the `RightBar` Settings panel.

### Before launch

- **Real Privacy Policy and Terms of Use pages,** linked from `MenuCom`. The Quran Foundation terms require them.
- **Quran Foundation production access approved,** and the production credentials and URLs switched in together.
  Register the app (pre-live) at the **start of phase 4**, because the process for approval isn't documented
  and may take time. See "Getting access and calling the API" in section 5.4.
- **Check Hisn al-Muslim's usage terms.** Audio must not be launched before this. None were found on 2026-11-26.
- Review the dua-to-audio matches and have them signed off.
- Name `www.hisnmuslim.com` in the Privacy Policy: it sees the reader's address when they press play.

## 4. Design: local-first sync

### 4.1 Architecture

```
 BROWSER                                       SERVER (Next.js)            CLOUD
 +---------------------------------------+     +--------------------+     +-----------+
 | Service worker (Serwist)              |     |                    |     |           |
 |  precache: app files + ALL content    |     | content pages      |     |           |
 |  (10 categories, 176 duas, en + bn)   |<----+ (rendered from     |     |           |
 |                                       |     |  dua_main.sqlite   |     |           |
 |  UI reads user data from local only   |     |  per request)      |     |           |
 |        |                ^             |     |                    |     |           |
 |        v                |             |     |                    |     |           |
 |  IndexedDB                            |     | POST /api/sync     |     |  Turso    |
 |   bookmarks, memorize, preferences    |     |  1. who is it?     |     |  (libSQL) |
 |   outbox               (pending ops)  +---->|     cookie/session |     |           |
 |   meta: anon_id, owner, cursor        |<----+  2. apply pushes   +---->|  owners   |
 |                                       |     |  3. return pulls   |<----+  bookmarks|
 |  sync runner: on 'online', on focus,  |     |     after cursor   |     |  memorize |
 |  after each write, every N minutes    |     |                    |     |  prefs    |
 +---------------------------------------+     +--------------------+     +-----------+
```

- **The UI never waits for the network.** Every read and write goes to IndexedDB first, and sync runs in the background.
- **The server owns the Turso token.** The browser only talks to `/api/sync` and the Auth.js routes.
- **Content and user data stay separate.** User records reference `dua.id` by value, so `dua.id` must stay
  stable whenever the content DB is replaced.
- Content pages are the same for every visitor. Bookmark and memorize state is filled in by the client from IndexedDB, never server-rendered.

**Why sync goes through the server rather than straight to Turso:** Turso's browser sync works one database at a
time, and its tokens cover a whole database. Direct sync would need one Turso database per visitor plus an endpoint
that issues tokens, and merging an anonymous user into an account would mean copying across databases. Its browser
package was also pre-release when this was checked. The user data here is small, so server-mediated sync is simpler and safer.

### 4.2 Turso schema (bookmarks, memorize, preferences, `owners`, `applied_ops` and the counter are built)

```
 owners                       bookmarks                        memorize
 +---------------------+      +---------------------------+    +------------------------------+
 | id (PK, uuid)       |<-----+ owner_id                  |    | owner_id                     |
 | kind  anon|account  |      | dua_id                    |    | dua_id                       |
 | user_id (nullable)  |      | deleted   0|1             |    | learned  0|1                  |
 | merged_into (null)  |      | updated_at (client time)  |    | progress 0..100              |
 | created_at          |      | op_id, server_seq         |    | reset_gen                    |
 +---------------------+      | PK(owner_id, dua_id)      |    | server_seq                   |
                              +---------------------------+    | PK(owner_id, dua_id)         |
 (no Auth.js tables: JWT sessions, no adapter)                 | (no clock, no deleted flag)  |
                                                               +------------------------------+
 preferences                                  applied_ops
 +------------------------------------------+ +--------------------------------------+
 | owner_id  --> owners.id                  | | PK(owner_id, op_id), applied_at      |
 | pref_key  "theme", "arabic_font",        | | ignores ops that are sent twice      |
 |           "reciter_id" (built)           | |                                      |
 | value     text                           | +--------------------------------------+
 | updated_at, op_id, server_seq            |
 | PK(owner_id, pref_key)                   |
 +------------------------------------------+
```

- `server_seq` comes from a single counter that the server bumps on every change it accepts. Devices pull rows where
  `server_seq` is greater than their cursor, so clock skew never affects what gets pulled.
- `deleted` marks a removed record instead of deleting it, so removals made offline reach the other devices. Old
  deleted rows are purged by `npm run db:user:purge`.
- Create an `owners` row only when the first write is synced, not on every page view.
- `applied_ops` is keyed by owner **and** op, so a change that was applied to an anonymous owner still applies once to
  the account when the device re-sends it at sign-in. A `sync_counter` table holds the single position counter.

### 4.3 Sync protocol

```
 client                                           server
   |  POST /api/sync                                 |
   |  { anon_id, cursor,                             |
   |    ops: [ {op_id, type, table, dua_id|key,      |
   |            fields, client_ts}, ... ] }          |
   |------------------------------------------------>|
   |                                    resolve owner (session > cookie > anon_id)
   |                                    follow owners.merged_into if set
   |                                    for each op not in applied_ops:
   |                                        merge into row (section 4.4)
   |                                        assign new server_seq
   |                                    collect rows with server_seq > cursor
   |  { owner_id, new_cursor, rows: [...] }          |
   |<------------------------------------------------|
   | apply rows locally, drop acknowledged ops       |
   | from the outbox, save new_cursor                |
```

Pushes and pulls happen in one request. The request is safe to retry, because each `op_id` takes effect only once.

### 4.4 Conflict rules

- **Bookmarks and preferences:** the newest change wins. The greater `updated_at` wins, and if those are equal,
  the greater `op_id` wins. A removal is an ordinary change that sets `deleted = 1`.
- **Memorize:** the further progress wins, field by field, with `reset_gen` for resets made on purpose:

```
 merge(a, b):
   if a.reset_gen != b.reset_gen:  return the row with the higher reset_gen
   else: learned          = max(a.learned, b.learned)
         progress         = max(a.progress, b.progress)
```

- **Increments `reset_gen`:** un-ticking "learned", lowering progress, or "start over". The client sends these as an
  ordinary `memorize` change that carries the new values and the higher `reset_gen`.
- **Doesn't increment it:** ticking "learned" or raising progress. Those are normal changes, merged with max().
- The merge gives the same result whatever order or however many times changes arrive. Two devices resetting at
  the same time end up with the same `reset_gen`, and their new values are merged with max().

### 4.5 Identity lifecycle

```
 first load (possibly offline)
   --> anon_id = crypto.randomUUID(), stored in IndexedDB; local rows owned by anon_id
 first successful sync
   --> server creates owners(id = anon_id, kind = anon)
       and sets a signed httpOnly cookie binding the browser to anon_id
 Google sign-in (Auth.js)
   --> push any pending outbox ops under anon_id
   --> server, in one transaction:
         - find or create the account owner
         - merge the anon rows into the account (section 4.4)
         - preferences: the ACCOUNT's existing value wins, and the anon value
           is used only for keys the account doesn't have yet
         - owners[anon_id].merged_into = account owner
   --> client: owner = account, cursor = 0, full pull
 other devices on their own anon_id
   --> each merges independently when that device signs in
 later syncs from an already-merged anon_id
   --> the server follows merged_into, or rejects them if that device has since signed out
```

### 4.6 Sign-out

```
 user clicks "Sign out"
   |
   +-- online --> push the outbox --> success --> clear all local user data, new anon_id
   |
   +-- offline, or the push failed
         --> KEEP the unsynced ops, tagged with the account owner (not the new anon), with kept_at
         --> clear the already-synced local rows, start a new anon_id
         --> when that account signs in again on this device: push the kept ops, then delete them
         --> kept ops older than 30 days are deleted (checked at app start and before each sync)
```

- The kept ops must stay **hidden** from the new anonymous session. On a shared device, the next person must not see them.
- Warn before signing out offline. For example: "3 changes haven't synced. They'll be kept on this device for
  30 days and uploaded the next time you sign in."

### 4.7 Other risks

- **Browser storage can be evicted.** Call `navigator.storage.persist()` after the first bookmark.
  Unsynced anonymous data is the only thing that can really be lost.
- **Sync bugs are the main risk.** The merge rules above and the once-only `op_id` contain them. Back that up with tests that replay changes in random order.

## 5. Design: audio

### 5.1 Facts checked on 2026-11-25

- **The original audio is dead.** The 114 `audio` values (`http://www.ihadis.com/duaaudiofinal/<n>.mp3`) redirect to
  `https://ihadis.com/...`, which returns **404** for every file tried (2, 3, 4, 50 and 100). The Wayback Machine has no snapshot.
  The URLs are also plain `http://`, which an HTTPS page blocks as mixed content.
- **Hisn al-Muslim API:**
  - `https://www.hisnmuslim.com/api/en/husn_en.json` lists 132 chapters and about 266 adhkar. Each has `ARABIC_TEXT` and its own audio,
    at `https://www.hisnmuslim.com/audio/ar/<id>.mp3`.
  - The audio returns 200 `audio/mpeg` over HTTPS with `Access-Control-Allow-Origin: *`.
  - Chapter 126's JSON was malformed (it parsed on 2026-11-26), and the API's own URLs are `http://` and need rewriting.
    Item 153 has a broken audio address.
- **Quran.com (Quran Foundation) Content API v4:**
  - Verse-by-verse recitations, with OAuth2 client credentials **used from the server only**.
  - Published developer terms, last updated 2026-11-20 (section 5.4).

### 5.2 How well Hisn al-Muslim matches

_These figures are from the first test and count rows (dua parts): the 153 belong to 140 duas. The matching command's
rule is stricter (phase 4a)._

A test script compared our 153 Arabic duas with all 266 Hisn al-Muslim items, after normalizing the Arabic:

| Match quality | Duas | Handling |
|---|---|---|
| Exact or contained (0.95 or higher) | **56** | Accept, then spot-check |
| Strong (0.85 to 0.95) | **17** | A person reviews each one |
| Weak (0.6 to 0.85) | 43 | Rejected by default. The audio may have extra or missing text. |
| None (below 0.6) | 37 | No fallback |

```
 strong-or-better / total with Arabic text, by category
 1 Dua's Importance   6/18     6 Sleep             20/31
 2 Dua's Excellence   3/14     7 Cloths             5/8
 3 Time of Dua        8/15     8 Home               3/6
 4 Dua Acceptance     4/5      9 Toilet             2/2
 5 Morning & Evening 19/50    10 Adhaan & Iqamah    3/4
```

Expected coverage: **about 73 of 153 from Hisn al-Muslim**, plus the Quran verse duas from Quran.com. Six duas cite a surah,
and likely more, such as Ayat al-Kursi and the three Quls, which are cited by hadith. Categories 1 and 2 are mostly hadith
about dua rather than recited adhkar.

### 5.3 How audio is chosen

Matching happens **during data prep, never at play time.** Playing the wrong recitation for a dua is a content error.

```
 DATA PREP (re-run when needed)                           RUNTIME (browser, online)
 +-----------------------------------------------+        +------------------------------+
 | 1. normalize Arabic (strip diacritics, unify  |        | candidates for this dua,     |
 |    alef/ya/ta marbuta, drop punctuation)      |        | in priority order            |
 | 2. compare with Hisn al-Muslim + open Quran   |        |          |                   |
 |    text (Tanzil); mark full|partial verses    |        |   try next on 'error'        |
 | 3. score: exact / strong / weak / none        |        |          |                   |
 | 4. a person reviews strong (and weak) matches | -----> |   all failed -> disabled     |
 | 5. health-check URLs (200 audio/mpeg)         |        |   "Audio unavailable"        |
 | 6. write audio_sources                        |        +------------------------------+
 +-----------------------------------------------+
```

```
 audio_sources   (content data: in dua_main.sqlite or a shipped JSON, never in Turso)
 +-------------------------------------------------------------+
 | dua_id       --> dua.id                                     |
 | priority     1 = first candidate, 2 = next, ...             |
 | provider     ihadis | quran.com | hisnmuslim                 |
 | url          https; NULL for quran.com (resolved at runtime) |
 | verse_keys   JSON list, quran.com only, e.g. ["2:285","2:286"]
 | coverage     full | partial  (quran.com only)                |
 | match_score  0..1                                           |
 | reviewed     0|1  (only exact or reviewed rows ship)         |
 | checked_at   last successful health check                   |
 +-------------------------------------------------------------+
```

Provider order:
- **Quran verse dua:** `ihadis` (dead, kept in case it returns, behind a health check), then `quran.com`, then `hisnmuslim`.
- **Other dua:** `ihadis`, then `hisnmuslim`.

### 5.4 Quran.com: rules from the terms and how they're met

| Rule | How the app complies |
|---|---|
| "Content API credentials must stay on your backend" | Only Next.js routes call the API. The browser gets only the audio URLs. |
| Direct audio URLs are fine if you "credit Quran Foundation and the reciter … and do not rehost them" | Stream from their hosts, never copy the MP3s, and always show the credit. |
| Don't "cache or store Quran Foundation Content longer than 1 week" | Resolve URLs at runtime and cache them for **7 days or less** (1 day recommended). Store only our own verse keys. |
| Their content in "a public source-code repository … is redistribution" | Never commit API responses, audio URLs or reciter lists. |
| An app needs "a publicly reachable Privacy Policy and Terms of Use" | See "Before launch". |
| "The text of the Quran is not modified in any way" | Show the IRD Arabic text as-is. |
| Credentials can be revoked immediately, and APIs can change with about 30 days' notice | The fallback chain covers this. |

```
 browser                                   Next.js route (server)
   |  GET /api/audio/<dua_id>?reciter=<id>    |
   |----------------------------------------->|
   |                                          | 1. read audio_sources
   |                                          | 2. OAuth token (cached until it expires)
   |                                          | 3. verseRecitation.byKey(key, reciter) per verse
   |                                          | 4. cache per (dua_id, reciter) for 7 days or less
   |  { urls: [...], coverage,                |
   |    credit: { reciter, source } }         |
   |<-----------------------------------------|
   | play the urls in order (multi-verse duas)|
```

- **Reciters:**
  - `/api/reciters` wraps the API's recitation list, cached for 7 days or less.
  - Only **verse-by-verse** recitations can appear in it. The API's reciter IDs for whole surahs don't work with the verse endpoint.
  - The default is recitation 7 (believed to be Alafasy, needs confirming). If the chosen reciter lacks a verse, fall back to the
    default reciter, then to the next provider.
- **Rate limits** aren't published: handle `429` by falling back to the next provider.

#### Getting access and calling the API

The Quran Foundation docs split this into two complementary parts. The **developer journey** is the
one-time setup that gets credentials. The **SDK** is how the code calls the API. The SDK is the
recommended way to call it from a JavaScript backend. _(Checked 2026-11-25.)_

```
 Developer journey (one-time setup)              SDK (in the code)
 +------------------------------------+          +--------------------------------------+
 | 1. Create the app in the Developer |          | @quranjs/api/server                  |
 |    Console, type "Backend/server"  |  creds   |   createServerClient({               |
 | 2. Save the client secret (it is   | -------> |     clientId, clientSecret,          |
 |    shown only once)                |          |     services: { gatewayUrl,          |
 | 3. Request scopes:                 |          |                 oauth2BaseUrl },     |
 |      content.audio.read            |          |     contentScopeMode: "granular" })  |
 | 4. Build against pre-live          |          | content.v4.audio.verseRecitation...  |
 | 5. Request production when ready   |          | content.v4.resources.recitations...  |
 +------------------------------------+          +--------------------------------------+
   (skip "redirect URIs": that step is             gets and renews tokens itself and
    only for user sign-in, which we don't need)    adds the required headers
```

**Credentials and scopes**
- App type: **Backend/server.** The client secret is shown only once, so store it right away.
- New backend apps get **granular** scopes. Asking for the general `content` scope fails with `invalid_scope`.
  Scopes don't include each other, so request every scope the app uses.
  - **`content.audio.read`** covers reciters, recitations, audio files, timing data and recitation styles. It's the only scope the plan needs.
  - Add `content.quran.read` only if the app ever fetches Quran text. The plan doesn't, because the Arabic text comes from the IRD database.
- OAuth2 uses the **`client_credentials`** grant: `POST <token server>/oauth2/token`.
  - Tokens last **3600 seconds**, and there's no refresh token. When one expires, request a new one.
  - Every API call sends the `x-auth-token` and `x-client-id` headers.

**Environments**

| | Token server | API |
|---|---|---|
| Pre-live (where new apps start) | `https://prelive-oauth2.quran.foundation` | `https://apis-prelive.quran.foundation` |
| Production (after approval) | `https://oauth2.quran.foundation` | `https://apis.quran.foundation` |

- Never mix pre-live and production tokens or hosts. When production access is approved, switch the credentials and both URLs together.
- **Pre-live only has surahs 1 and 2.** Test with duas from those two surahs, for example dua 4 (Al-Fatihah 1:5) or the sleep duas from
  2:285 and 2:286. Other verses only work on production.
- The docs pages read don't explain how production approval works or how long it takes.

**SDK (`@quranjs/api`)**
- Use **3.17.0 or later**, which adds `contentScopeMode: "granular"` for the granular scopes.
- Import from **`@quranjs/api/server`** only.
  - `@quranjs/api/public` is for login in the browser. It doesn't accept a client secret and can't make content calls.
  - Avoid the legacy default `QuranClient` export.
- The SDK requests tokens, caches them, renews them before they expire, and adds the required headers.
- The SDK **defaults to production**. For pre-live, set both `services.gatewayUrl` and `services.oauth2BaseUrl`.
- Still to check: the docs don't say which Node version it needs, so confirm it works on Node 24 and Next 16.

**Server-only environment variables** (never with the `NEXT_PUBLIC_` prefix):

```
 QF_CLIENT_ID=...
 QF_CLIENT_SECRET=...
 QF_OAUTH2_BASE_URL=https://prelive-oauth2.quran.foundation   # production: https://oauth2.quran.foundation
 QF_API_BASE_URL=https://apis-prelive.quran.foundation        # production: https://apis.quran.foundation
```

The 7-day caching limit, the credit requirement and the Privacy Policy rule in the table above come from the
[Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/), not from these setup pages. They still apply.

Sources: [developer journey](https://api-docs.quran.foundation/docs/developer-journey/),
[SDKs](https://api-docs.quran.foundation/docs/sdk/), [JavaScript SDK](https://api-docs.quran.foundation/docs/sdk/javascript/),
[quickstart](https://api-docs.quran.foundation/docs/quickstart/),
[OAuth2](https://api-docs.quran.foundation/docs/tutorials/oidc/getting-started-with-oauth2/),
[scopes](https://api-docs.quran.foundation/docs/user_related_apis_versioned/scopes/).

### 5.5 Player behavior

1. Offline: controls hidden.
2. Online: play candidate 1, and on `error` try the next one. Remember failed URLs for the session.
3. No working candidate: a disabled control labeled **"Audio unavailable"**.
4. Always show the source, for example "Recitation: Hisn al-Muslim" or "Recitation: <reciter> · Quran Foundation".
5. `coverage = partial`: add the label **"Full verse recitation"**.

## 6. Open questions

1. _(Resolved in phase 1: `?cat=N` stays, and `/duas` is a category grid.)_
2. **What `/` should be:** it shows only "Home Page". A redirect to `/duas`, or a real home page?
3. _(Resolved in `add-memorize`: five steps, 0 / 25 / 50 / 75 / 100. The server accepts any whole number from 0 to 100.)_
4. _(Resolved in `add-dua-audio`: hidden when offline, and disabled with "Audio unavailable" when online but broken.)_
5. **Default reciter:** recitation 7 is Mishari Rashid al-Afasy on Quran.com's public list (seen 2026-11-26; recheck
   with credentials). Is that the one you want?
6. _(Answered 2026-11-26: a Hafez reviews the dua-to-audio matches. Not done yet.)_
7. **Is about 50% audio coverage enough for launch,** or should more providers be searched?
8. **Hisn al-Muslim's usage terms** still need checking.
