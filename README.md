# Dua & Raka'ah

A web app that shows Islamic supplications (duas) grouped by category, with the Arabic text,
transliteration and translation, in English and Bangla. Its look follows its own style guide (see "Look and layout").

It is one Next.js 16 app (React 19, Tailwind 4, Turbopack). The content lives in a read-only SQLite
file that ships with the app. There is no separate API server.

```
app/                  routes and components
  page.js, bn/page.js     the home page           /, /bn (cards in components/home/)
  duas/               English pages           /duas, /duas/<slug>?cat=N
  bn/duas/            Bangla pages            /bn/duas, /bn/duas/<slug>?cat=N
  components/         the header, bottom bar, footer, Settings panel and controls; content/ holds the dua pages,
                      home/ the home page, ui/ the shared component library
  globals.css         the theme: colors for both themes, spacing, type and the shared styles
  sw.js, serwist/     the service worker and the route that serves it (offline use)
  offline/            the page shown for something that is not saved
  bookmark/, bn/bookmark/  the bookmark pages
  api/sync, api/auth  the sync route and Google sign-in (Auth.js)
  api/audio, api/reciters  Quran.com recitation addresses and the reciter list
  account/, bn/account/    "Delete my data"; api/account/delete is its route
lib/
  db.js               read-only SQLite helpers (server only)
  content.js          pure helpers: slugs, language columns, grouping, language switch
  i18n.js             UI labels in English and Bangla
  precache.js         the pages the service worker saves (also sw-rules.js, build-revision.js)
  sync/               server side of sync: schema, merge rules, identity, the request handler
  local/              browser side: the IndexedDB store (Dexie), the sync runner, sign-in and sign-out
  turso.js, auth.js   the shared user-data database and Google sign-in (server only)
  audio/              recordings: Arabic and Quran matching, the list builder, the review report and the player
  quran/              the Quran Foundation client, the recitation service and its route handlers (server only)
  prayer/             prayer times, the current waqt, dates, and the reader's place (all computed in the browser)
  home/               the home page's daily duas and hadith
data/dua_main.sqlite  the content database (10 categories, 23 subcategories, 176 duas)
data/bd-districts.json   Bangladesh's 64 district towns with coordinates (from GeoNames)
data/home-picks.json     the duas and hadith quotes picked by hand for the home page
data/audio-sources.json  the Quran verses and recordings each dua part may play (generated: do not edit by hand)
data/audio-review.json   a person's approvals and rejections of those matches
public/               the app's mark (also the favicon), category images and the star pattern
scripts/              smoke test, precache check, user-data setup and purge, database compaction, audio matching
openspec/             specs, designs and tasks for each change
plan.md               roadmap for the work still ahead
```

## Getting started

Developed and tested on Node 24.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build (run `npm run build` first) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`node --test`) for `lib/` and the database compaction script |
| `npm run smoke` | Checks a running server against the specs: statuses, redirects, content, both languages. Start it with `npm start` first. Set `BASE_URL` to test another address. |
| `npm run check:precache` | Checks the built service worker's list of saved files against the database. Run it after `npm run build`. |
| `npm run db:user:init` | Creates the user-data tables in the database named by `TURSO_DATABASE_URL`. Safe to run again. Reads `.env.local`. |
| `npm run db:user:purge` | Deletes removed bookmarks and applied change IDs that the server accepted more than 180 days ago. `npm run db:user:purge -- --dry-run` only reports the counts. Reads `.env.local`. |
| `npm run db:vacuum` | Compacts `data/dua_main.sqlite`. It replaces the file only if the schema and every row stay identical. Stop the dev server first. |
| `npm run audio:match` | Matches the dua texts with Quran verses and Hisn al-Muslim recordings, and writes `data/audio-sources.json` and a review report. `npm run audio:match -- --cached` reuses the last downloads. See "Audio". |
| `npm run audio:check` | Checks that every listed recording still answers with audio, and with Quran Foundation credentials every listed verse. Exits with an error if one does not. Reads `.env.local`. See "Audio". |

## URLs

| URL | Page |
|---|---|
| `/`, `/bn` | The home page, in English and Bangla: prayer times and a countdown, the Hijri date, duas, categories, a hadith, donation |
| `/duas` | Category grid |
| `/duas/<slug>?cat=<id>` | One category, with its duas grouped by subcategory |
| `/bn/duas`, `/bn/duas/<slug>?cat=<id>` | The same pages in Bangla |
| `/bookmark`, `/bn/bookmark` | The reader's bookmarked duas (read from the browser, works offline) |
| `/memorize`, `/bn/memorize` | The duas the reader has started memorizing, in progress and learned (read from the browser, works offline) |
| `/account`, `/bn/account` | Sign-in state and "Delete my data" (deleting needs a connection), linked from the footer and the Settings panel |

- `cat` decides which category is shown. The slug is only for readability: a wrong slug, or no `cat`, redirects
  (308) to the canonical URL, and an unknown category returns 404.
- The language comes from the URL only. English has no prefix and Bangla lives under `/bn`. The language buttons
  in the Settings panel switch between the two; `/` and `/bn` are each other's pair.
- A dua that is stored across several rows in the database is shown as one card with several parts.

## Look and layout

The design is in `openspec/changes/archive/2026-11-27-redesign-app-ui/design.md`.

- **Colors.** Emerald 900 `#0A2B25` and Emerald 800 `#0E3B33`, Sand 50 `#FBF8F2` and Sand 100 `#F4EDE0`, Gold
  `#C9A34E`, and Gold text `#7A5B12` for gold-colored text. The light theme is sand with emerald; the dark theme is
  emerald with sand. Every color is a named token in `app/globals.css`, used by role (`bg-surface`, `text-muted`).
  `npm test` checks the contrast of the text pairs in both themes, and fails if any other file in `app/` sets a color
  by hex value or palette class (`lib/theme.test.js`; `components/ui/icons.js` is the one exception).
- **Typefaces**, all under the [SIL Open Font License 1.1](https://openfontlicense.org/), downloaded by
  `next/font/google` when the app is built and served from the app's own origin, so they work offline:

  | Typeface | Used for |
  |---|---|
  | [Fraunces](https://github.com/undercasetype/Fraunces) | Latin headings and the countdown |
  | [Inter](https://github.com/rsms/inter) | Latin interface and body text |
  | [Noto Sans Bengali](https://github.com/notofonts/bengali) | Bangla |
  | [Scheherazade New](https://software.sil.org/scheherazade/) | Arabic dua text |

  Text picks its typeface by its `lang`, so mark Arabic with `lang="ar"` and an English word inside Bangla with
  `lang="en"`. A build needs a connection to fetch the fonts.
- **Shared components** (`app/components/ui/`): buttons, tags, icon circles, cards, tiles, list cards, sections,
  section headings, the page intro, sheets, segmented controls, selects, checklists, steps, empty states, notices,
  ornaments, the icon set and the wordmark. Pages are built from these; one role uses one component. A component takes
  a variant, never a color.
- **Navigation.** Home, Duas, Saved, Memorize and Settings (`lib/nav.js`): a bar at the bottom of the screen below
  1024px, links in the header from 1024px. Settings opens a panel on the current page, from the bottom on phones and
  from the side from 768px. The sign-in button is in the header, and the support page is linked from the panel and the
  footer. Every page has a skip link, one `h1` and the footer.
- **Layout.** The document scrolls, under a sticky header. The duas pages show the category list as a column from
  1280px; below that it opens from the "Categories" button. Supported from 320px.

## Home page

`/` and `/bn` are built once, with the app, so every reader gets the same HTML. Their sections, in order: location and
time, today, prayer times, countdown, duas, categories, hadith, donation. The first four form the prayer band, whose
colors follow the current waqt (neutral until the time and place are known): one column on phones, two from 1024px,
and from 1280px three, with the times in a row below. Below the band, the hadith and donation cards sit side by side
from 1024px. The designs are in `openspec/changes/archive/2026-11-26-add-home-page/design.md` and
`openspec/changes/archive/2026-11-27-redesign-app-ui/design.md`.

- **Where the times come from.** The [adhan](https://github.com/batoulapps/adhan-js) library (MIT) computes them
  **in the browser**, by the University of Islamic Sciences, Karachi method with the Hanafi Asr. No service is asked,
  so they work offline. They are a calculation: the card tells readers to check with their local mosque. Between
  sunrise and Dhuhr no waqt is current, and during Fajr the countdown runs to sunrise. Where a time cannot be
  computed (near the poles), the page says so and shows no countdown.
- **Place.** Dhaka until the reader chooses a district town or presses "Use my location" (which needs HTTPS or
  `localhost`). The browser is asked for the position only when that button is pressed. A picked town is shown in its
  own time zone; the default and "My location" are shown in the device's.
- **Hijri date.** The Umm al-Qura calendar, which the reader can move one day back or forward.
- **Stored on the device only.** `localStorage["dua-home"]` holds the place (a town, or a position rounded to 3
  decimals) and the Hijri adjustment. It is never sent to the server or synced, and "Delete my data" removes it.
  The Privacy Policy must say this before launch.
- **Duas and hadith.** `data/home-picks.json` lists them by `dua.id`. Which ones show changes with the date. A quote
  with no text in a page's language is left out of that page. **The list still has to be reviewed** before launch.
- **Town coordinates** are from [GeoNames](https://www.geonames.org/), used under
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The Bangla town names and labels still need review.

## Hosting

Category pages read `?cat=N`, so they render on each request and the app needs a Node server.
Static-only hosting (`output: 'export'`) will not work. A service worker needs HTTPS (`localhost` is fine). `/duas` and `/bn/duas` are prerendered.
`next.config.mjs` makes sure `data/dua_main.sqlite` is included in the deployment output.

## Offline use

After one online visit, every page can be read with no network: the 20 category pages in both languages, `/duas`,
`/bn/duas`, `/`, `/bn`, `/support`, `/bookmark`, `/bn/bookmark`, `/memorize`, `/bn/memorize`, `/account`, `/bn/account`, and the icons, images, scripts, styles and fonts they use. A service worker
(Serwist, `app/sw.js`) saves them. Anything else shows `/offline`, a short page that links back to `/duas`. The home
page's prayer times, countdown, Hijri date and town list work offline too. The font files are saved with the build
files (about 840 KB).

- **Production builds only.** `npm run dev` never registers the worker, and removes one left on the same
  address by an earlier run. A worker belongs to an address (`localhost:3000`), so test production builds on
  another port: `npm run build`, then `npm start -- -p 3100`. To check offline use, open `/duas`, wait a few
  seconds, stop the server, and open other pages.
- **Check what a build will save:** `npm run check:precache` (after `npm run build`). It compares the worker's list
  with the database and fails if a category page or the home page's background is missing, or if audio or an `/api/`
  URL is in it.
- **Updates.** A new build downloads in the background. A bar then offers "Reload", and the page never reloads by
  itself. The list is re-downloaded on every build that changes the app, the database or the list of recordings.
- **Never saved:** audio files, anything under `/api/`, and other sites' files. The rules are in `lib/sw-rules.js`
  (each one has a test).
- **If the worker ever misbehaves,** build with `SW_KILL=1` and deploy that build (`SW_KILL=1 npm run build` in bash, `$env:SW_KILL=1; npm run build` in PowerShell).
  Each device removes the worker and its saved files the next time it opens the app. Then redeploy a normal build.

## Audio

The recordings come from [Hisn al-Muslim](https://www.hisnmuslim.com) and, for duas that are Quran verses, from
[Quran.com](https://quran.com) (Quran Foundation), when its credentials are set. Which recording or verses belong to
which dua part is decided before the build, never while a reader is playing. The designs are in
`openspec/changes/archive/2026-11-26-add-dua-audio/design.md` and `openspec/changes/archive/2026-11-26-add-quran-audio/design.md`.

**Do not launch audio until Hisn al-Muslim's usage terms are confirmed.** None were found on 2026-11-26. To withdraw
all audio, set `recordings` to `[]` in `data/audio-sources.json` and rebuild (running `audio:match` again would refill
it).

### What readers see

- A dua part with a recording has a play and pause button under its Arabic text, with a credit (in Bangla on `/bn`
  pages). A part with none has nothing. The bookmark and memorize pages have no audio.
- A part with listed verses plays Quran.com first: its verses one after another as one recording. The credit reads
  "Recitation: Quran Foundation", with the reciter's name from the moment play is pressed and answered. When the verses
  hold more than the card, it is also labeled "Full verse recitation". If Quran.com fails, the part's Hisn al-Muslim
  recording plays instead, under the credit "Recitation: Hisn al-Muslim".
- **Reciter:** the Settings panel has "Reciter", a list of the verse-by-verse reciters. Recitation 7 is selected until the reader chooses; the choice is saved and synced like other settings, and
  applies from the next press on a part that is not playing or paused. The block is hidden offline and without
  credentials, and says so when the list cannot be loaded.
- One recording plays at a time, and leaving the page stops it. **No audio, and no audio address, is requested until play
  is pressed** (the reciter list is loaded for the panel). Pressing play lets the audio's host see the reader's address.
- A recording that errors, or has not started after 15 seconds (each verse has its own 15), is skipped in favor of the
  part's next one. When none works, the button reads "Audio unavailable" until the device reconnects or, for Quran.com,
  another reciter is chosen. If a browser will not start the sound after waiting for the address, a second press does.
- **Offline, the buttons are hidden.** Audio is never saved on the device. Saved pages carry which parts have audio, so a
  changed list, or switching Quran.com on or off, reaches devices as a normal update.

### Matching

`npm run audio:match` downloads Hisn al-Muslim's chapters and the Quran text into `.audio-cache/`, compares the Arabic
of every dua part with both, and writes:

- `data/audio-sources.json`, the shipped list. For each dua part: dua, part number (the part's position in the dua), a
  hash of the part's Arabic text, `quran` (the verses, such as `"from": "2:285", "to": "2:286"`, with `coverage`
  `"full"`, or `"partial"` when the verses hold more than the card; or `null`) and `candidates` (the Hisn al-Muslim
  recordings in play order, possibly none). It holds no text from either source. Commit it.
- `.audio-cache/report.html`, the review report. **Never commit `.audio-cache/`:** it holds both sources' text, and
  Hisn al-Muslim's usage terms are not known.

Vowel marks, punctuation, spacing and spelling variants of a letter are ignored.

- **Hisn al-Muslim:** a recording is accepted automatically only when the two **whole** texts are at least 95% alike. A
  dua that is merely contained in a longer recording, or the other way round, needs a person.
- **Quran verses:** accepted automatically only when the card is exactly one run of whole verses in one surah that
  appears nowhere else. An opening basmala before a surah's first verse is optional. Part of a verse, a repeated verse
  or a near match needs a person.

The Quran text is the "Simple Clean" text of the [Tanzil Project](https://tanzil.net) (Copyright Tanzil Project,
[Creative Commons Attribution 3.0](https://tanzil.net/docs/Text_License)). It is used only to choose verse keys: the
app shows the Arabic from its own database. The command refuses a download that is incomplete or lacks Tanzil's notice.
Check [tanzil.net/updates](https://tanzil.net/updates/) for newer versions.

If anything cannot be downloaded, the Quran text is unusable, or the review file has a mistake, the list is left
unchanged. A chapter that arrives but cannot be read is skipped with a warning. Every part that loses its recording or
its verses is named.

### Review

1. Run `npm run audio:match` and open `.audio-cache/report.html` in a browser (it plays the Hisn al-Muslim
   recordings, so you need a connection). It cannot play Quran verses: listen to those in the running app.
2. Listen to every recording accepted automatically below 100%, and to a sample of the others. Go through the pairs
   under "Needs review". Many short phrases are found inside verses without being quotations: leave those alone.
3. **Approve a recording only if it says what the card says: nothing missing and nothing extra.** The one exception is
   a verse that holds more than the card: if you approve it, the app labels it "Full verse recitation". Under each pair
   are two lines, one to approve and one to reject. Copy the one you choose into `data/audio-review.json`, which is a
   JSON list:

   ```json
   [
     {"dua_id":4,"part":1,"item":10,"decision":"approve","text_sha":"…","item_sha":"…"},
     {"dua_id":6,"part":1,"item":59,"decision":"reject","text_sha":"…","item_sha":"…","note":"recording is longer"},
     {"dua_id":47,"part":1,"verses":"21:87-21:87","decision":"approve","text_sha":"…","verses_sha":"…"}
   ]
   ```

   An entry is about an `item` or about `verses`, never both. Only one run of verses can be approved for a part, and
   that approval replaces an automatic one. `note` is optional. A decision overrides the automatic rule in both
   directions.
4. Run `npm run audio:match -- --cached`, then `npm run audio:check`, and commit both files in `data/`.

A decision holds only for the two texts that were reviewed. If either changes, it is reported as out of date and
ignored (an out-of-date rejection still keeps the recording out), so decide again and replace the old line.

### Quran.com credentials

Quran.com audio is optional. It is on when all four variables are filled in (see `.env.example`), and off, with no
control and no reciter choice, when any is empty. **Set them both when you build and when you run the app:** saved
pages are built with the source on or off. Changing them only at run time leaves saved devices with the old controls
until the next build. All four are server only; never give one a `NEXT_PUBLIC_` prefix, and never commit them.

1. Register the app in the Quran Foundation
   [Developer Console](https://api-docs.quran.foundation/docs/developer-journey/) as a **Backend/server** app and
   request the scope `content.audio.read`. The client secret is shown only once.
2. New apps start on **pre-live**, which has surahs 1 and 2 only (try duas 4, 125 and 202):

   ```
   QF_OAUTH2_BASE_URL=https://prelive-oauth2.quran.foundation
   QF_API_BASE_URL=https://apis-prelive.quran.foundation
   ```

3. After production access is approved, switch the client ID, the secret and both addresses **together**
   (`https://oauth2.quran.foundation` and `https://apis.quran.foundation`), then rebuild.

The browser only ever calls this app: `GET /api/reciters` and `GET /api/audio/<dua>/<part>?reciter=<n>`. The server asks
Quran Foundation, keeps an answer in memory for one day at most (their limit is a week), writes none to disk, and only
passes on `https` addresses on their audio hosts. When the reader's reciter lacks a verse, recitation 7 is used.

**Do not launch Quran.com audio until all of these are done:** production access is approved; a Privacy Policy and
Terms of Use are published and name the audio hosts; the listed verses have been checked by listening; and Quran
Foundation has confirmed this use. Their [Developer Terms](https://api-docs.quran.foundation/legal/developer-terms/)
(2026-11-20) say a website built from their content must refresh it through their Content Sync APIs, and do not say
whether a website that only streams their recitations counts. Ask developers@quran.com. To switch the source off,
empty the four variables and rebuild.

### Checking the recordings

The sources can move or remove files. `npm run audio:check` asks for the first byte of every listed address, tries a
failed one once more, changes nothing, and exits with 1 if any fails. With the credentials in `.env.local` (or the
environment) it also asks for recitation 7's address of every listed verse and checks it the same way; without them it
says how many verses it did not check, and that alone is not a failure. **Nothing runs it unless you schedule it,** for
example weekly:

```bash
# cron, Mondays at 06:00
0 6 * * 1  cd /path/to/dua-rakaah && npm run audio:check
```

```powershell
# Windows Task Scheduler, Mondays at 06:00
schtasks /Create /TN "dua audio check" /SC WEEKLY /D MON /ST 06:00 /TR "cmd /c cd /d C:\path\to\dua-rakaah && npm run audio:check >> audio-check.log 2>&1"
```

To drop a dead recording, run `npm run audio:match`, or reject it in the review file, then rebuild and deploy.

## User data and sync

Bookmarks, memorize progress and settings are saved on the reader's device first (IndexedDB, through Dexie), so they work
offline and never wait for the network. A background sync copies them to one shared database (Turso, a hosted
SQLite) through `POST /api/sync`, which lets the same data appear on every device after Google sign-in. The designs
are in `openspec/changes/archive/2026-11-25-add-user-data-sync/design.md` (the sync, bookmarks),
`openspec/changes/archive/2026-11-25-add-memorize/design.md` (memorize) and `openspec/changes/archive/2026-11-25-add-preferences/design.md`
(settings).

- **Settings.** The Settings panel has the Arabic text size (small, medium, large, extra large; medium is 28px) and
  the appearance (light or dark). A choice applies at once, works offline and follows the reader to every device after
  sign-in. "Reciter" (shown only when Quran.com audio is on) sets `reciter_id`, the Quran.com reciter; see "Audio". Three setting names exist: `theme`, `arabic_font`, `reciter_id`; they are
  listed with their valid values in `lib/preferences.js`. Two devices that change the same setting keep the newest
  change. **At sign-in the account's existing value wins**; the device's value is used only for a setting the account
  does not have yet (a change with `if_absent: 1`). Sign-out returns the device to light and medium.
- **No flash on dark.** Pages are saved static HTML, so the server cannot know the theme. A small inline script in
  `<head>` (built in `lib/preferences.js`) sets `data-theme` and `--arabic-size` from a copy in
  `localStorage["dua-prefs"]` before the first paint. The copy only holds the theme and the size, is a cache, and
  IndexedDB wins once it has been read (`PreferencesApplier`).
- **Key field.** A record's key is named by its type: `dua_id` for bookmarks and memorize, `pref_key` for settings.

- **Memorize.** Every dua card has a memorize control (beside the bookmark). It opens a panel with a "learned" checkbox
  and five progress steps (0, 25, 50, 75, 100). `/memorize` lists what the reader has started. Two devices that
  change the same dua keep the **further progress**; going backwards on purpose (un-ticking, lowering, starting over)
  is a reset that wins over older progress on every device (`reset_gen`).
- **Record types.** The sync carries more than one kind of record (`bookmark`, `memorize`, `preference`), described once in
  `lib/sync/records.js`. A request names the types the device understands in an optional `types` list; without it the
  server sends bookmarks only, so a browser still running older code is never sent rows it cannot store. A device that
  starts to understand a new type pulls everything once.
- **Anonymous first.** A device gets a random ID on first load and works with no sign-in. The server binds the
  browser to that ID with a signed, HTTP-only cookie (`dua_anon`) at the first sync.
- **Sign-in** (Google, through Auth.js with JWT sessions) merges the device's bookmarks into the account. The app
  stores only Google's account ID: no email, name or picture. **Sign-out** keeps any change that had not synced for
  30 days (hidden from the next person on the device) and uploads it the next time the same account signs in.
- **Storage can be cleared** by the browser. Signed-in readers have a server copy. A reader who never signs in
  can lose bookmarks if the browser clears the site's data (the app asks the browser to keep it).
- **Sync polls**: after each change, when the browser comes back online, when the tab is shown again, and every
  5 minutes. There is no live push.

Environment variables (server only: none may start with `NEXT_PUBLIC_`). Copy `.env.example` to `.env.local`:

| Variable | What it is for |
|---|---|
| `TURSO_DATABASE_URL` | The user-data database. Use `file:data/user-dev.db` locally: no account or token is needed. A hosted one looks like `libsql://<name>-<org>.turso.io`. |
| `TURSO_AUTH_TOKEN` | The token for a hosted Turso database. Leave empty for a `file:` URL. |
| `AUTH_SECRET` | Signs the sign-in session cookie. A long random string. |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | A Google OAuth client. Its redirect URL is `<origin>/api/auth/callback/google`. |
| `ANON_COOKIE_SECRET` | Signs the anonymous-device cookie. A long random string, different from `AUTH_SECRET`. |
| `AUTH_TRUST_HOST` | Set to `true` when the app runs behind a proxy that sets the host header. |

### Deleting data

A reader, signed in or not, can erase their data at `/account` after a confirmation. The server deletes the account,
every anonymous device merged into it and all their records in one transaction; the device is cleared and starts
again as a new anonymous device (the home page's saved place and Hijri adjustment are removed with the rest). The reader's other devices are answered `410` at their next sync, and clear
themselves. Signing in with the same Google account later starts a new, empty account, and changes a device had set
aside at an offline sign-out before the deletion are not stored in it. The server keeps only deletion markers: the
time, with a SHA-256 hash of the account ID or with a deleted anonymous owner's random ID. The design is in
`openspec/changes/archive/2026-11-26-add-data-deletion/design.md`.

Rolling back to a build from before this feature is safe for the data, but the old server ignores the markers, so a
deleted reader's other devices could upload again. Avoid rolling back once deletions have happened.

### Purging old removals

Removed bookmarks and the list of applied change IDs grow for ever unless purged. **Nothing is purged unless the
command is run.** Run it now and then, for example monthly from the operator's scheduler (cron, a scheduled CI job or
Windows Task Scheduler), with the hosted database's URL and token in the environment or in `.env.local`:

```bash
npm run db:user:purge -- --dry-run   # only report how many rows would go
npm run db:user:purge
```

It only removes what the server accepted more than 180 days ago, and is safe to repeat. A device that had not synced
past a purged removal is sent all its records at its next sync and drops the bookmarks that are gone; its unsent
changes older than those removals do not bring them back. A device that stays offline for more than 180 days can lose
such an old unsent bookmark change.

```bash
# Try sync locally with no cloud account
cp .env.example .env.local      # then set TURSO_DATABASE_URL=file:data/user-dev.db and the two secrets
npm run db:user:init            # for a local file the tables are also created on first use
npm run build && npm start -- -p 3100
```

For a hosted database, create it in Turso, put its URL and token in the environment, and run
`npm run db:user:init` once. **When a release adds a table (memorize added `memorize`, settings added `preferences`,
data deletion added `purge_marks`, `deleted_accounts` and `deleted_owners`), run `npm run db:user:init`
against the hosted database *before* deploying the new build**: it only adds tables, so the old build is not
affected, but the new build's sync fails (503, bookmarks included) until the table exists. Roll back by deploying the
previous build: the extra table stays unused, and local databases already at Dexie version 3 still open with the
previous code (checked with `fake-indexeddb`), but a device with memorize or setting changes still queued cannot sync until the
new build returns. `npm test` includes the convergence test: several simulated devices make random
changes over a network that drops, delays and repeats requests, and all of them must end with the server's data
(200 random schedules, and 200 more with purges and long-offline devices, about a minute). Set `CONVERGENCE_SEEDS` and `CONVERGENCE_FIRST_SEED` to run fewer or to
replay one. Sign-in with Google itself needs real credentials and has to be checked by hand.

## Changing the content database

`dua.id` values must stay stable, because bookmarks (and later memorize) refer to them. Rows that
share an `id` are the parts of one dua, and their order in the table is the only record of part order, so keep it.
After replacing the file, run `npm run db:vacuum`, `npm run audio:match` (a part whose Arabic text changed shows no
recording until it is matched again) and `npm run smoke`.
