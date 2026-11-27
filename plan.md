# Plan: dua-rakaah

_Last updated 2026-11-27 (phases 4a, 4b and 5 built and the interface redesigned; reviews and live checks still open). This file covers only the work still ahead. Completed work (restructure into one
Next.js app, SQLite via `lib/db.js`, Next 16, Tailwind 4, ESLint flat config) is in git history, in commit `d1557b2`
on branch `restructure/single-next-app`. Phase 1 (content pages) is the OpenSpec change `add-content-pages`, in
`openspec/changes/archive/2026-11-25-add-content-pages/`._

## 1. Where the project stands

A "Dua & Raka'ah" web app that shows Islamic supplications (duas) grouped by category. Its UI follows the
owner's style guide and reference page (OpenSpec change `redesign-app-ui`). It is no longer modeled on duaruqyah.com.

```
 dua-rakaah/  (one Next.js 16 app, React 19, Tailwind 4, Turbopack)
   app/                 routes and components
   lib/db.js            read-only SQLite helpers (better-sqlite3, server-only)
   data/dua_main.sqlite content database (read-only, ships with the app)
   public/              the app's mark, category images and the star pattern
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
- Duas can be memorized (the control beside the bookmark on each card: a "learned" checkbox and progress steps 0, 25, 50, 75, 100), and
  `/memorize` lists what the reader has started. It works offline and syncs the same way as bookmarks (phase 3).
- Dua parts with a matched Hisn al-Muslim recording can be played while online (phase 4a). **Not ready to launch:** the
  matches are not yet reviewed and the source's usage terms are unconfirmed.
- With Quran Foundation credentials, dua parts that are Quran verses play a Quran.com recitation, with a reciter picker
  (phase 4b). Checked on pre-live (surahs 1 and 2) on 2026-11-26. **Not tried on production.**
- `/` and `/bn` are a home page with prayer times computed on the device, a countdown, the Hijri date, duas,
  categories, a hadith and a donation card, readable offline (phase 5). **Not ready to launch:** the picked content,
  the town list and the new Bangla text are not yet reviewed.

- One interface at every width from 320px (OpenSpec change `redesign-app-ui`): the style guide's colors and four
  self-hosted typefaces, a shared component library, a navigation bar or header, Settings at every width, a prayer
  band on the home page that follows the waqt, and not-found and error pages. **Not ready to launch:** the new Bangla
  labels, the Bangla typeface and the footer's Arabic line are not yet reviewed (see "Redesign reviews" below).

**Not done yet:**

| Area | State |
|---|---|
| `/support` | Placeholder text only. The home page's donation card links to it (question 13). |
| Redesign reviews | Open (task 7.7 of the archived `redesign-app-ui`): a Bangla speaker reviews the new Bangla labels (navigation, Settings, page intros, footer, 404 and error pages) and the Bangla typeface, Noto Sans Bengali, on a real phone; the Hafez reviews the footer's Arabic line, رَبِّ زِدْنِي عِلْمًا (Ta-Ha 20:114), and its English and Bangla meanings (`app/components/SiteFooter.js`, `footerArabicMeaning` in `lib/i18n.js`). Record their decisions here. |
| Home page reviews | Open: the Hafez reviews `data/home-picks.json`; a Bangla speaker reviews the new labels and town names. See phase 5. |
| Pages behind the old sidebar (`/alldua`, `/dua-info`, `/books`) | Don't exist. Their links were removed, not kept as placeholders. `/rakaah` is planned as phase 6 (salah), which adds its navigation entry. |
| Search | Not built. The search box and the category filter were removed until it is. The `searchCategories` label is kept in `lib/i18n.js`. |
| Copy, share and report on dua cards | Not built. Their icons were removed until they work. |
| General and font settings entries, profile menu items | Removed: they did nothing. |
| Bangla UI labels | Written by the assistant (`lib/i18n.js`). A Bangla speaker should review them. |
| Audio | Built (4a, 4b). Open: Quran Foundation production access, the checks on production, the review of the matches, and the launch conditions. See phase 4. |

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
| Navigation | Only working destinations are listed: Home, Duas, Saved, Memorize and Settings. Raka'ah joins it with the salah page (phase 6). Pages that don't exist are not linked. |
| Home page | **Cards:** location and time, today's Hijri date, prayer times with the current waqt, a countdown circle, duas, categories, a hadith, donation (phase 5). Prayer times are **computed on the device** (adhan); the location never leaves it. |
| Raka'ah content | **Our own guide, reviewed by a scholar, shipped with the app.** No API supplies one (checked 2026-11-26). APIs only add audio, words and evidence. |
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
- **Search** (optional): add `app/api/search/route.js` with prepared `LIKE` queries, and a search box and category filter that use it.
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
  and an inline script before first paint, using the `dua-prefs` copy in localStorage. The settings are in a panel
  that opens at every width (`redesign-app-ui` closed the gap on narrow screens).

- **Purge and data deletion** (OpenSpec change `add-data-deletion`): `npm run db:user:purge` removes removed
  bookmarks and applied change IDs accepted more than 180 days ago, and a device that missed a purge is refreshed
  (`since`, `full`, `removed_before`). Readers delete their data at `/account` and `/bn/account`; deletion markers
  stop other devices uploading it again (`410`). Nothing schedules the purge: the operator does. Not built: deleting
  empty or abandoned anonymous owners, exporting data, and the Privacy Policy page.

### Phase 4: Audio

Split into two changes, so that audio could start without Quran Foundation credentials.

**4a: Hisn al-Muslim** (OpenSpec change `add-dua-audio`, in `openspec/changes/archive/2026-11-26-add-dua-audio/`; read its `design.md` for the reasons). Built:

- `npm run audio:match` matches each dua **part** against the source and writes `data/audio-sources.json` and a
  review report. A person's decisions go in `data/audio-review.json` (README, "Audio").
- A player on each matched part: hidden offline, next recording on failure, "Audio unavailable", the credit line.
- `npm run audio:check` checks the listed URLs. **Nothing schedules it:** the operator does.
- **Differences from sections 5.2 and 5.3:** the list is a JSON file, not an `audio_sources` table. It is keyed by dua,
  part number and a hash of the Arabic text. Only a **whole-text** likeness of 95% is accepted without a person (a
  contained match needs review). `ihadis` URLs are not listed. There is no `checked_at`, `verse_keys` or `coverage` yet.
- **Open:** the review of the matches (the change is archived; its `tasks.md` lists what is left). Before the review, 50 of 153 parts (47 of 140 duas) have a
  recording.
- **Decided 2026-11-26:** the automatic matches are used for now, and a Hafez will review them later. Nobody has
  listened to them yet. **Duas 2, 75, 124, 232 and 239 are held back,** because their written text differs from the
  recording's by a word or letter. Each hold is a `reject` line in `data/audio-review.json`; when the Hafez approves
  one, change it to `approve` and run `npm run audio:match -- --cached`. Duas 125, 201 and 225 are below 100% too, but
  differ only in spelling or spacing, and stay on.
- The report to send is `.audio-cache/report-for-hafez.html` (local only, never committed). It was made before the
  holds, and `audio:match` rewrites `report.html` but not this copy.

**4b: Quran.com** (OpenSpec change `add-quran-audio`, in `openspec/changes/archive/2026-11-26-add-quran-audio/`; read its `design.md` for the reasons). Built:

- `npm run audio:match` also locates each part in Tanzil's "Simple Clean" text (CC BY 3.0, credited in the README, not
  committed) and lists verse keys. Only a part that is exactly one run of whole verses, found nowhere else, is accepted
  without a person.
- `GET /api/audio/<dua>/<part>?reciter=<n>` and `GET /api/reciters`, server only, through `@quranjs/api`; answers kept
  in memory for one day; only `https` addresses on Quran Foundation's audio hosts.
- The player plays a part's verses as one recording, tries Quran.com before Hisn al-Muslim, names the reciter, and
  labels "Full verse recitation". The "Reciter" list is in the Settings panel; the default is recitation 7.
- Without the four `QF_*` variables the app behaves as after 4a.
- **Differences from sections 5.2 to 5.5:** the route includes the part number; verses are a `quran` field in
  `data/audio-sources.json` (version 2), not an `audio_sources` table; near matches to the Quran text are never accepted
  automatically (stricter than 5.2); no `ihadis` candidate.
- **Coverage on 2026-11-26:** with Quran.com, 63 of 153 Arabic parts (56 of 140 duas) have audio; without it, 50 parts
  (47 duas). 16 parts have verses, 13 of them with no other recording.
- **Open:**
  - Request production access. Pre-live is registered and checked: duas 4, 125 and 202 play, with reciters 6 and 7
    (the only two pre-live lists); `audio:check` passed the 4 verses of surahs 1 and 2 and failed the other 49, as
    expected there.
  - Ask developers@quran.com about Content Sync (see "Before launch").
  - On production: listen to every listed verse run with recitation 7, check whether a surah's first verse file includes
    the basmala the card shows, and test playback on iOS Safari.
  - Decide the partial and near verse matches in `.audio-cache/report.html` (dua 201 is a near match of 2:255; duas 47,
    118 and 128 look like real quotations inside a verse).

### Phase 5: Home page

_Planned and built 2026-11-26. OpenSpec change `add-home-page`, archived in `openspec/changes/archive/2026-11-26-add-home-page/` with its reviews (task 5.4) still open._

The home page is separate cards on a soft Islamic background (our own subtle geometric pattern, in light and dark).
English at `/` and Bangla at `/bn`.
duaruqyah.com's home page was the reference for which sections to show, not for its design or text. It refused
automated fetching (403) on 2026-11-26.

**Cards, in order:**

1. **Location and time.** The place the times are for, and a live clock in that place's time zone (the device's for
   "My location" and the default).
2. **Today.** A short header: the weekday, the Hijri date and the Gregorian date.
3. **Prayer times.** Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, with the current waqt highlighted. Sunrise is shown
   but is not a prayer, and between sunrise and Dhuhr no waqt is current.
4. **Countdown.** A circle (SVG ring) that empties as the current waqt runs out, with the time left until the next one.
   During Fajr it counts to sunrise (decided 2026-11-26).
5. **Duas.** A few existing duas from `data/dua_main.sqlite`, linking to their category pages.
6. **Categories.** The 10 categories, reusing the `/duas` grid.
7. **Hadith.** One short hadith quote with its reference.
8. **Donation.** A card linking to `/support`. No payment is taken on the page.

**How it works (checked 2026-11-26):**

| Need | Choice | Why |
|---|---|---|
| Prayer times | **[adhan](https://github.com/batoulapps/adhan-js)** 4.4.6 (MIT), computed **in the browser** | Offline, no API and no request that reveals the reader's location. It has `currentPrayer()`, `nextPrayer()` and `timeForPrayer()`; the countdown is our own subtraction. Methods include `Karachi` and `MuslimWorldLeague`, and Asr can be `Hanafi` or `Shafi`. |
| Defaults | Method **Karachi**, Asr **Hanafi** | What most readers in Bangladesh use. A setting to change them can come later (question 14). |
| Location | **Dhaka** until the reader presses "Use my location" (browser geolocation) or picks a city from a shipped list | Never ask for location on page load. The coordinates **stay on the device** (local storage only, never synced, never sent), so the Privacy Policy can say so. No reverse geocoding: that would send the coordinates to a service. |
| Hijri date | `Intl.DateTimeFormat` with the `islamic-umalqura` calendar, Bangla digits on `/bn` | Built into the browser and Node. Node 24 gives "Thursday, Jumada II 16, 1448 AH" and "বৃহস্পতিবার, ১৬ জমাদিউস সানি, ১৪৪৮" for 2026-11-26. Bangladesh's moon sighting is often a day behind Umm al-Qura, so offer a −1/0/+1 day adjustment. |
| Duas and hadith | **From the content database**, chosen in the browser by the day's date from a list built into the page | No new source and no new license question. Categories 1 and 2 already hold hadith with references. Fixed and prerendered, so the page still works offline. |
| AlAdhan API | **Not used** | Not needed, and it would see the reader's location. Its terms (free, no attribution, no stated rate limit, logs kept 29 days) were read 2026-11-26. |

- **Rendering:** `/` and `/bn` are prerendered and precached (`lib/precache.js`).
  Everything that depends on the reader (location, clock, times, countdown, the day's dua and hadith) is filled in on
  the device after load. The server never sees it.
- **Times are a guide:** say so on the card, and suggest checking with the local mosque.
- **Checks:** unit tests for the waqt logic (current and next waqt, the gap after sunrise, Isha past midnight, the day
  change, invalid times near the poles), `npm run smoke` for `/` and `/bn`, and the precache check. All passed on
  2026-11-26, as did offline use on a production build. "Use my location" was tried with a stand-in for the browser's
  location service, **not** through a real permission prompt.
- **Town list:** 10 of the 64 towns were checked on a map on 2026-11-26 (by Claude, not a person). Cox's Bazar was
  3 km off and was corrected.
- **Open before launch:**
  - The Hafez reviews the duas and hadith quotes in `data/home-picks.json`.
  - A Bangla speaker reviews the new labels in `lib/i18n.js` and the town names in `data/bd-districts.json`.
  - The Privacy Policy says the position from "Use my location" stays on the device.

### Phase 6: Raka'ah (salah / namaz)

_Researched 2026-11-26. Not started. Proposed OpenSpec change: `add-rakaah`._

A Raka'ah navigation entry (`/rakaah`, to be added to `lib/nav.js` and `components/ui/icons.js`) leads to a page about salah (Bangla: namaz):
how to pray it, step by step, with the words said in each position. English at `/rakaah`, Bangla at `/bn/rakaah`, the
same URL rule as the dua pages.

**What the sources offer (checked 2026-11-26):**

| Source | What it has for salah | Terms and access | Use |
|---|---|---|---|
| **Quran Foundation** (Content API v4) | **No salah or prayer content:** no guide, no prayer times. Its "Ruku" endpoints are Quran divisions, not the prayer position. It does have verse text, translations, verse-by-verse audio, and hadith and answer lookups **per verse**. | Already registered (phase 4b). Verse text needs a second scope, `content.quran.read`. Same Developer Terms and Content Sync question. | Audio (and only if needed, text) for what is recited standing: Al-Fatihah and short surahs. |
| **Hisn al-Muslim** (`husn_ar.json`, already used in 4a) | Prayer chapters with Arabic text and audio: 16 opening (istiftah), 17 ruku, 18 rising from ruku, 19 sujood, 20 between the prostrations, 21 prostration of recitation, 22 tashahhud, 23 salawat after the tashahhud, 24 dua before salam, 25 adhkar after salam, 26 istikhara, 32 qunut of witr, 33 after witr. Also 15 adhan. | Usage terms **unknown** (the same blocker as 4a). Some chapter text URLs do not match their titles (86 and 87 point to the same file), so check each one. | Words and audio for each position, through the existing `audio:match` pipeline. |
| **This app's database** | Prayer duas already in "Time of Dua" (category 3): 38 after obligatory prayer, 44 in prostration, 49 and 50 opening the prayer, 51 behind the imam, 52 and 54 rising from ruku, 55 to 57 before salam. Bilingual, and some already have audio. | Ours. Source and license of the texts still unknown (see "Before launch"). | Link or reuse them from the steps rather than copying them. |
| **fawazahmed0/hadith-api** | Hadith collections in many languages, split into numbered sections (each collection's Book of Prayer). Whether Bengali editions exist still needs checking in `editions.json`. | Unlicense. Served from jsDelivr, no key, no stated rate limit; the README advises a fallback between `.min.json` and `.json`. | Optional: the evidence (dalil) under each step. Fetched before the build, like `audio:match`, never at run time. |
| **Sunnah.com API** | Hadith collections, including Bengali for some. | Needs an API key, requested through a GitHub issue. Terms of reuse not confirmed. | Alternative to the line above, if a key is granted. |
| **AlAdhan** (Islamic Network) | Prayer times, Qibla direction, Islamic calendar. **No guide.** | No key mentioned. Terms page (`credits-and-terms`) not read yet. | Optional, later: prayer times. Needs the reader's location, so it must go in the Privacy Policy. |
| **A written step-by-step guide** | No API was found. Books exist, for example *How to Pray According to the Prophet* by Ibn Baz, which has a Bangla edition (publisher page, not an API). | Copyrighted books: write our own text and cite them. | The core of the page. **Has to be written and checked by a scholar.** |

**Conclusion:** no API supplies a salah guide in English and Bangla. The guide text must be our own content, reviewed,
and shipped with the app like the duas. The APIs fill in the words, audio and evidence for each step.

**Proposed scope:**

1. **Content.** A new read-only content file (a table in `data/dua_main.sqlite` or a shipped JSON; decide in the
   design), bilingual (`_en` and `_bn`), never fetched at run time:
   - **Steps**, in order: intention (niyyah), opening takbir, standing (qiyam) with the opening dua, Al-Fatihah and a
     surah, ruku, rising from ruku, sujood, sitting between the prostrations, the second sujood, tashahhud, salawat,
     the dua before salam, salam. Each step has its instruction text, the Arabic words, transliteration and
     translation, and the reference.
   - **Raka'ah counts** for the five daily prayers (fard, sunnah, witr), plus Jumu'ah.
   - **After salam:** the adhkar (Hisn al-Muslim 25 and dua 38).
   - **Later, as separate steps:** witr and qunut, istikhara, sujood al-sahw.
2. **Page.** `/rakaah` and `/bn/rakaah`, prerendered, reusing the dua card (Arabic size setting, bookmark, memorize,
   audio) for the words of each step.
3. **Audio.** Run the steps' Arabic through `audio:match` like duas. Al-Fatihah and the short surahs come from
   Quran.com (verse keys), the position adhkar from Hisn al-Muslim. The same review and the same launch conditions as
   phase 4 apply.
4. **Offline.** Add both pages to the precache list (`lib/precache.js`) and to `npm run check:precache` and
   `npm run smoke`. No audio is saved, as in phase 2.
5. **User data.** If steps are bookmarked or memorized, their IDs must not collide with `dua.id`: either give the steps
   their own record type in `lib/sync/records.js`, or IDs in a range no dua uses. Decide in the design.
6. **Interface.** Use the shared components (`Steps` was built for the prayer positions), and decide how six entries
   fit the bottom bar.
7. **Not in the first version:** Qibla (adhan's `Qibla()` can compute it on the device), illustrations, video,
   women's or children's variants. Prayer times are on the home page (phase 5).

**Decisions needed before the design:** see section 6, questions 9 to 12.

### Before launch

- **Real Privacy Policy and Terms of Use pages,** linked from `MenuCom`. The Quran Foundation terms require them.
- **Quran Foundation's confirmation that this use is allowed.** Their terms (2026-11-20) say a website built from their
  content must refresh it through the Content Sync APIs at least every 7 days, and do not say whether a website that
  only streams their recitations counts.
- **Quran Foundation production access approved,** and the production credentials and URLs switched in together.
  Register the app (pre-live) at the **start of phase 4**, because the process for approval isn't documented
  and may take time. See "Getting access and calling the API" in section 5.4.
- **Check Hisn al-Muslim's usage terms.** Audio must not be launched before this. None were found on 2026-11-26.
- Review the dua-to-audio matches and have them signed off.
- Name `www.hisnmuslim.com` and Quran Foundation's audio hosts in the Privacy Policy: they see the reader's address
  when they press play.

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
2. _(Answered 2026-11-26: a real home page, phase 5.)_
3. _(Resolved in `add-memorize`: five steps, 0 / 25 / 50 / 75 / 100. The server accepts any whole number from 0 to 100.)_
4. _(Resolved in `add-dua-audio`: hidden when offline, and disabled with "Audio unavailable" when online but broken.)_
5. **Default reciter:** recitation 7 is built in as the default. Pre-live confirms it is Mishari Rashid al-Afasy
   (2026-11-26). Is that the one you want?
6. _(Answered 2026-11-26: a Hafez reviews the dua-to-audio matches. Not done yet.)_
7. **Is about 50% audio coverage enough for launch,** or should more providers be searched?
8. **Hisn al-Muslim's usage terms** still need checking.
9. **Raka'ah: which method (madhhab)?** The steps differ in places: hand position, raising the hands, what is said
   aloud, sitting. One method (most readers in Bangladesh follow Hanafi), or the main differences side by side?
10. **Raka'ah: who writes and reviews the guide?** No source provides it, so it must be written and signed off by a
    scholar (the Hafez from question 6, or someone else) before it ships.
11. **Raka'ah: Qibla?** Not in the first version. Prayer times moved to the home page (phase 5).
12. **Raka'ah: show hadith evidence under each step?** If yes, choose fawazahmed0/hadith-api (Unlicense, check for
    Bengali) or Sunnah.com (needs a key).
13. **Home: donation.** Where should the card point? `/support` is a placeholder. Which methods (bKash, Nagad, bank,
    a payment link) and to whom?
14. **Home: prayer time settings.** Karachi and Hanafi are fixed defaults in the first version. Should readers be
    able to change the method, the Asr rule and the Hijri adjustment, and should those sync like the other settings?
15. **Home: city list.** Bangladesh's 64 district towns only, or other countries too?
