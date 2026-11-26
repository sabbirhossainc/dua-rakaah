<<<<<<< HEAD
## To run this Project
 #install the dependences 
## Run this command on both front-end and back-end
 #npm run dev
=======
# Dua & Ruqyah

A web app that shows Islamic supplications (duas) grouped by category, with the Arabic text,
transliteration and translation, in English and Bangla. Its look is modeled on duaruqyah.com.

It is one Next.js 16 app (React 19, Tailwind 4, Turbopack). The content lives in a read-only SQLite
file that ships with the app. There is no separate API server.

```
app/                  routes and components
  duas/               English pages           /duas, /duas/<slug>?cat=N
  bn/duas/            Bangla pages            /bn/duas, /bn/duas/<slug>?cat=N
  components/         shared UI; components/content/ holds the dua cards and category pages
  sw.js, serwist/     the service worker and the route that serves it (offline use)
  offline/            the page shown for something that is not saved
  bookmark/, bn/bookmark/  the bookmark pages
  api/sync, api/auth  the sync route and Google sign-in (Auth.js)
  account/, bn/account/    "Delete my data"; api/account/delete is its route
lib/
  db.js               read-only SQLite helpers (server only)
  content.js          pure helpers: slugs, language columns, grouping, language switch
  i18n.js             UI labels in English and Bangla
  precache.js         the pages the service worker saves (also sw-rules.js, build-revision.js)
  sync/               server side of sync: schema, merge rules, identity, the request handler
  local/              browser side: the IndexedDB store (Dexie), the sync runner, sign-in and sign-out
  turso.js, auth.js   the shared user-data database and Google sign-in (server only)
  audio/              recordings: Arabic matching, the list builder, the review report and the player
data/dua_main.sqlite  the content database (10 categories, 23 subcategories, 176 duas)
data/audio-sources.json  the recordings each dua part may play (generated: do not edit by hand)
data/audio-review.json   a person's approvals and rejections of those matches
public/               icons and category images
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

Open http://localhost:3000/duas.

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
| `npm run audio:match` | Matches the dua texts with Hisn al-Muslim recordings and writes `data/audio-sources.json` and a review report. `npm run audio:match -- --cached` reuses the last download. See "Audio". |
| `npm run audio:check` | Checks that every listed recording still answers with audio. Exits with an error if one does not. See "Audio". |

## URLs

| URL | Page |
|---|---|
| `/duas` | Category grid |
| `/duas/<slug>?cat=<id>` | One category, with its duas grouped by subcategory |
| `/bn/duas`, `/bn/duas/<slug>?cat=<id>` | The same pages in Bangla |
| `/bookmark`, `/bn/bookmark` | The reader's bookmarked duas (read from the browser, works offline) |
| `/memorize`, `/bn/memorize` | The duas the reader has started memorizing, in progress and learned (read from the browser, works offline) |
| `/account`, `/bn/account` | "Delete my data", linked from the top bar at every width (deleting needs a connection) |

- `cat` decides which category is shown. The slug is only for readability: a wrong slug, or no `cat`, redirects
  (308) to the canonical URL, and an unknown category returns 404.
- The language comes from the URL only. English has no prefix and Bangla lives under `/bn`. The language buttons
  in the Settings panel (visible at 1536px and wider) switch between the two.
- A dua that is stored across several rows in the database is shown as one card with several parts.

## Hosting

Category pages read `?cat=N`, so they render on each request and the app needs a Node server.
Static-only hosting (`output: 'export'`) will not work. A service worker needs HTTPS (`localhost` is fine). `/duas` and `/bn/duas` are prerendered.
`next.config.mjs` makes sure `data/dua_main.sqlite` is included in the deployment output.

## Offline use

After one online visit, every page can be read with no network: the 20 category pages in both languages, `/duas`,
`/bn/duas`, `/`, `/support`, `/bookmark`, `/bn/bookmark`, `/memorize`, `/bn/memorize`, `/account`, `/bn/account`, and the icons, images, scripts, styles and fonts they use. A service worker
(Serwist, `app/sw.js`) saves them. Anything else shows `/offline`, a short page that links back to `/duas`.

- **Production builds only.** `npm run dev` never registers the worker, and removes one left on the same
  address by an earlier run. A worker belongs to an address (`localhost:3000`), so test production builds on
  another port: `npm run build`, then `npm start -- -p 3100`. To check offline use, open `/duas`, wait a few
  seconds, stop the server, and open other pages.
- **Check what a build will save:** `npm run check:precache` (after `npm run build`). It compares the worker's list
  with the database and fails if a category page is missing, or if audio or an `/api/` URL is in it.
- **Updates.** A new build downloads in the background. A bar then offers "Reload", and the page never reloads by
  itself. The list is re-downloaded on every build that changes the app, the database or the list of recordings.
- **Never saved:** audio files, anything under `/api/`, and other sites' files. The rules are in `lib/sw-rules.js`
  (each one has a test).
- **If the worker ever misbehaves,** build with `SW_KILL=1` and deploy that build (`SW_KILL=1 npm run build` in bash, `$env:SW_KILL=1; npm run build` in PowerShell).
  Each device removes the worker and its saved files the next time it opens the app. Then redeploy a normal build.

## Audio

The recordings come from [Hisn al-Muslim](https://www.hisnmuslim.com). Which recording belongs to which dua part is
decided before the build, never while a reader is playing. The design is in
`openspec/changes/add-dua-audio/design.md`.

**Do not launch audio until Hisn al-Muslim's usage terms are confirmed.** None were found on 2026-11-26. To withdraw
audio, set `recordings` to `[]` in `data/audio-sources.json` and rebuild (running `audio:match` again would refill it).

### What readers see

- A dua part with a listed recording has a play and pause button under its Arabic text, with the credit
  "Recitation: Hisn al-Muslim" (in Bangla on `/bn` pages). A part with no recording has nothing. The bookmark and
  memorize pages have no audio.
- One recording plays at a time, and leaving the page stops it. **Nothing is requested from the source until play is
  pressed.** Pressing play lets the source see the reader's address.
- A recording that errors, or has not started after 15 seconds, is skipped in favor of the part's next one. When none
  works, the button reads "Audio unavailable" until the device reconnects.
- **Offline, the buttons are hidden.** Audio is never saved on the device. Saved pages carry the list, so a changed list
  reaches devices as a normal update.

### Matching

`npm run audio:match` downloads the source's chapters into `.audio-cache/`, compares the Arabic of every dua part with
every item, and writes:

- `data/audio-sources.json`, the shipped list: dua, part number (the part's position in the dua), a hash of the
  part's Arabic text, and its recordings in play order. It holds no text from the source. Commit it.
- `.audio-cache/report.html`, the review report. **Never commit `.audio-cache/`:** it holds the source's text, whose
  usage terms are not known.

Vowel marks, punctuation, spacing and spelling variants of a letter are ignored. A recording is accepted
automatically only when the two **whole** texts are at least 95% alike. A dua that is merely contained in a longer
recording, or the other way round, needs a person.

If anything cannot be downloaded, or the review file has a mistake, the list is left unchanged. A chapter that
arrives but cannot be read is skipped with a warning. Every part that loses its recording is named.

### Review

1. Run `npm run audio:match` and open `.audio-cache/report.html` in a browser (it plays the recordings, so you need a
   connection).
2. Listen to every recording accepted automatically below 100%, and to a sample of the others. Go through the pairs
   under "Needs review".
3. **Approve a recording only if it says what the card says: nothing missing and nothing extra.** Under each pair are
   two lines, one to approve and one to reject. Copy the one you choose into `data/audio-review.json`, which is a
   JSON list:

   ```json
   [
     {"dua_id":4,"part":1,"item":10,"decision":"approve","text_sha":"…","item_sha":"…"},
     {"dua_id":6,"part":1,"item":59,"decision":"reject","text_sha":"…","item_sha":"…","note":"recording is longer"}
   ]
   ```

   `note` is optional. A decision overrides the automatic rule in both directions.
4. Run `npm run audio:match -- --cached`, then `npm run audio:check`, and commit both files in `data/`.

A decision holds only for the two texts that were reviewed. If either changes, it is reported as out of date and
ignored (an out-of-date rejection still keeps the recording out), so decide again and replace the old line.

### Checking the recordings

The source can move or remove files. `npm run audio:check` asks for the first byte of every listed address, tries a
failed one once more, changes nothing, and exits with 1 if any fails. **Nothing runs it unless you schedule it,** for
example weekly:

```bash
# cron, Mondays at 06:00
0 6 * * 1  cd /path/to/ird-dua-app && npm run audio:check
```

```powershell
# Windows Task Scheduler, Mondays at 06:00
schtasks /Create /TN "dua audio check" /SC WEEKLY /D MON /ST 06:00 /TR "cmd /c cd /d C:\path\to\ird-dua-app && npm run audio:check >> audio-check.log 2>&1"
```

To drop a dead recording, run `npm run audio:match`, or reject it in the review file, then rebuild and deploy.

## User data and sync

Bookmarks, memorize progress and settings are saved on the reader's device first (IndexedDB, through Dexie), so they work
offline and never wait for the network. A background sync copies them to one shared database (Turso, a hosted
SQLite) through `POST /api/sync`, which lets the same data appear on every device after Google sign-in. The designs
are in `openspec/changes/archive/2026-11-25-add-user-data-sync/design.md` (the sync, bookmarks),
`openspec/changes/archive/2026-11-25-add-memorize/design.md` (memorize) and `openspec/changes/add-preferences/design.md`
(settings).

- **Settings.** The right bar (1536px and wider) has Font Settings (Arabic text size: small, medium, large, extra
  large; medium is the original 28px) and Appearance Settings (light or dark). A choice applies at once, works
  offline and follows the reader to every device after sign-in. There is also a stored `reciter_id` setting with no
  control yet (the Quran.com recordings will use it). Three setting names exist: `theme`, `arabic_font`, `reciter_id`; they are
  listed with their valid values in `lib/preferences.js`. Two devices that change the same setting keep the newest
  change. **At sign-in the account's existing value wins**; the device's value is used only for a setting the account
  does not have yet (a change with `if_absent: 1`). Sign-out returns the device to light and medium.
- **No flash on dark.** Pages are saved static HTML, so the server cannot know the theme. A small inline script in
  `<head>` (built in `lib/preferences.js`) sets `data-theme` and `--arabic-size` from a copy in
  `localStorage["dua-prefs"]` before the first paint. The copy only holds the theme and the size, is a cache, and
  IndexedDB wins once it has been read (`PreferencesApplier`).
- **Key field.** A record's key is named by its type: `dua_id` for bookmarks and memorize, `pref_key` for settings.

- **Memorize.** Every dua card has a memorize control (the third icon). It opens a panel with a "learned" checkbox
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
again as a new anonymous device. The reader's other devices are answered `410` at their next sync, and clear
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
>>>>>>> restructure/single-next-app
