# Design

## Context

See `proposal.md` for why. These facts were checked against the code, the installed packages and Next's bundled docs
on 2026-11-25:

- **Where the app is after `add-content-pages`.** `/duas` and `/bn/duas` are prerendered. The 20 category pages
  (`/duas/<slug>?cat=N`, `/bn/duas/<slug>?cat=N`) render per request, because `cat` decides the page. `/` and
  `/support` are static placeholders. `lib/db.js` can list the categories and `lib/content.js` can build each
  category's URL (`categoryHref`). The app needs a Node server.
- **Turbopack.** Next 16 builds with Turbopack. `plan.md` names `@serwist/next`, which is a webpack plugin. Next's PWA
  guide (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`) points to `@serwist/turbopack` for
  Turbopack. Version 9.6.0 exists, needs Node 18 or newer, and lists `esbuild` as a peer dependency. `typescript`
  and `esbuild-wasm` are optional peers.
- **How `@serwist/turbopack` works** (from its source). A Turbopack build has no plugin hook, so the package uses a
  Route Handler. `app/serwist/[path]/route.js` calls `createSerwistRoute({ swSrc, additionalPrecacheEntries })`.
  The route is `force-static`, so `next build` bundles the service worker file with esbuild, injects the precache
  list, and writes `sw.js` as a prerendered file. The response carries `Service-Worker-Allowed: /`, so a worker
  served from `/serwist/sw.js` can control the whole site. A client component, `SerwistProvider`, registers it.
- **`defaultCache` is not safe for this app.** In production it contains a rule that caches `.mp3`, `.wav` and `.ogg`
  files (`CacheFirst`, 24 hours), a rule that caches every `GET /api/` response (`NetworkFirst`, 24 hours), a rule
  that caches every other same-origin request, and a rule that caches cross-origin requests. Each one breaks a
  decision in `plan.md`. In development it is `NetworkOnly` for everything.
- **`SerwistProvider` defaults** that matter: `reloadOnOnline` is `true` (it reloads the page whenever the device
  goes online), and `cacheOnNavigation` is `true` (it stores each page the reader navigates to).
- **Assets.** Every image in `public/` is an SVG (124 KB in `public/images`, 106 KB in `public/icons`), and `next/image`
  serves them directly, so there are no `/_next/image` URLs. The font is Inter through `next/font`, which is
  self-hosted under `/_next/static/media`. `.next/static` is about 870 KB (20 files). A category page's HTML is
  250 to 570 KB in development (measured through `curl`), so the 20 category pages are a few MB.
- **A service worker belongs to an origin, not to a build.** A worker registered by `npm start` on
  `localhost:3000` keeps controlling `localhost:3000` when `npm run dev` runs there later.

## Goals / Non-Goals

**Goals:**
- Every page listed in the specs works offline after one online visit, and a deploy replaces it as one whole
  version, never a mix of two.
- The caching rules are an allow-list that can be read in one screen, and audio, `/api/` and other origins are
  excluded by construction rather than by a rule that could be removed by accident.
- The parts that can be checked without a browser are plain functions with unit tests (the precache list, the
  request matchers).
- A mistake can be undone for readers who already have the worker.

**Non-Goals:**
- Caching server-rendered React payloads (RSC) for soft navigation. See D5.
- Sync, queues or any user data. That is phase 3.
- Caching anything for audio, even "just the first few seconds". That is phase 4, and the decision is to never cache it.
- The web app manifest and install prompt, an offline banner, and Next's experimental `useOffline` hook.

## Decisions

### D1. `@serwist/turbopack` and `serwist`, not `@serwist/next`

`@serwist/next` needs the webpack build, so using it would mean `next build --webpack` and giving up Turbopack for
the whole app. `@serwist/turbopack` works with the build the app already uses. Its cost is the Route Handler
workaround, which is what the package documents. The packages are `@serwist/turbopack` and `serwist` (runtime, the
worker imports `serwist`) and `esbuild` (dev dependency, bundles the worker). `useNativeEsbuild: true` is set, as in
the package's own example, so `esbuild-wasm` isn't needed.

- *Alternative: write the worker by hand with Workbox or no library.* More code to own and no precache helper.
  Rejected.
- *Alternative: the `next dev --webpack` and `@serwist/next` route.* Rejected for the reason above. It stays the way
  back if `@serwist/turbopack` breaks on a future Next release.

### D2. Files

```
 app/sw.js                       the service worker source (bundled by esbuild at build time)
 app/sw-kill.js                  a worker that unregisters itself and clears saved files (D9)
 app/serwist/[path]/route.js     serves /serwist/sw.js and injects the precache list
 app/offline/page.js             the offline fallback page
 app/components/PwaProvider.js   client: registers the worker, removes it in development, shows the update prompt
 lib/precache.js                 pure: builds the precache list from categories + file lists
 lib/sw-rules.js                 pure: request matchers used by app/sw.js
 lib/build-revision.js           server: hash of the build inputs (D4)
 scripts/check-precache.mjs      checks the built worker's precache list against the database
```

`app/layout.js` wraps its children in `PwaProvider`. The worker URL is `/serwist/sw.js` and its scope is `/`.
`next.config.mjs` gets `withSerwist(...)` and a `headers()` entry that sets `Cache-Control: no-cache, no-store,
must-revalidate` on `/serwist/:path*`, as the Next PWA guide recommends for the worker file. The worker is
registered with `updateViaCache: "none"`.

### D3. What is precached

Two sources feed the worker's precache list.

**Pages (our list).** `lib/precache.js` exports `buildPrecacheEntries({ categories, revision })`, and the route passes
the result as `additionalPrecacheEntries`. Each entry is `{ url, revision }`:

| Entries | Count | Revision |
|---|---|---|
| `categoryHref(cat, "en")` and `categoryHref(cat, "bn")` for every category | 20 | the build revision (D4) |
| `/duas`, `/bn/duas`, `/`, `/support`, `/offline` | 5 | the build revision |

The categories come from `getCategories()`, so the saved set follows the database with no hand-kept list. Category
URLs have a query string. Serwist's precache keeps the `cat` parameter (it ignores only `utm_*` and `fbclid` by
default), and the check script confirms the stored URLs are exactly the ones the sidebar links to.

**Files (Serwist's glob, with an explicit allow-list).** `createSerwistRoute` globs the build output itself, and
gives each file a hash or, for `.next/static`, no revision (the names contain a hash). We set `globPatterns` to:

- `.next/static/**/*.{js,css,woff2}`: about 20 files. This includes the self-hosted Inter font.
- `public/**/*.{svg,png,jpg,jpeg,webp,avif,gif,ico}`: the 42 icons and images.

and `globIgnores` for any audio or video extension, as a second guard.

*Why not the defaults:* found in the task 1.2 spike. Serwist's default patterns are `.next/static/**/*.{js,css,html,ico,
png,svg,...}`, which **leaves out `.woff2` fonts** (the page would fall back to a system font offline), plus
`public/**/*`, which would precache **any file ever put in `public/`, including audio**. An allow-list of extensions
fixes both.

*Build order (checked in the spike):* the route runs during `next build`'s page generation, after compilation. All 20
files in `.next/static` were visible to it, including the build manifests, so the glob sees a complete build. The
install-time fallback that this section first described (reading each cached page's HTML for chunk URLs) isn't needed.

*Worker file:* the built worker is `.next/server/app/serwist/sw.js.body`. The check script (D10) reads it.

*Development:* the package drops `additionalPrecacheEntries` and the manifest when `NODE_ENV` is `development`.

### D4. One revision per build, from the build's inputs

The page entries are rendered by the server, not built to a file, so Serwist has nothing to hash. Their revision
decides when a device downloads them again. It has to change whenever the pages could change, and it has to give the same
value in every process that evaluates the route (Next evaluates `next.config` and route modules in several workers).
So the revision is a SHA-256 over `data/dua_main.sqlite`, the source under `app/`, `lib/` and `public/`,
`package-lock.json` and `next.config.mjs`.

- *Alternative: `git rev-parse HEAD`* (what Serwist's example does). It misses uncommitted changes, needs `.git` at
  build time, and gives the same revision for a content-only change that isn't committed yet. Rejected.
- *Alternative: a timestamp.* Different in each worker process, so the worker file and its entries could disagree. Rejected.
- Trade-off: every deploy with any source change downloads the 25 page entries again (a few MB). That is accepted.
  Over-refreshing is safe, and under-refreshing would break "one version at a time".

### D5. Runtime rules: an allow-list, not `defaultCache`

`app/sw.js` passes its own `runtimeCaching` list and never imports `defaultCache`. `lib/sw-rules.js` holds the
matchers as plain functions of the `{ request, url, sameOrigin }` object that Serwist passes to a matcher:

| Rule | Matches | Handler | Limits |
|---|---|---|---|
| navigations | a same-origin `navigate` request that is not `/api/` and is not audio | `NetworkOnly`. Its only job is to give a failed navigation to the fallback (D6). | none |
| static files | a same-origin `GET` under `/_next/static/`, with a script, style or font | `CacheFirst` (the names contain a hash) | 128 entries, 30 days |
| images and icons | a same-origin `GET` for an image or font file that is not audio | `StaleWhileRevalidate` | 64 entries, 30 days |

Everything else matches no rule. A request that matches no rule isn't handled by the worker at all, and goes to the
network exactly as it would without one. That is how audio, `/api/`, other origins and other methods stay out: **they
are never matched**, so removing a "block audio" rule can't open a hole. Each rule's matcher also begins with
`!isAudio(...)` and `!isApi(...)`, so a broad rule added later keeps the exclusion. `isAudio` is true for a request
whose destination is `audio` or `video`, or whose URL ends in a common audio extension (`mp3`, `m4a`, `aac`, `ogg`,
`oga`, `opus`, `wav`, `flac`, `weba`), on any origin. Unit tests cover each matcher with the specs' scenarios.

Soft-navigation payloads (RSC requests, which carry an `RSC: 1` header and a `_rsc` query parameter) match no rule.
Offline, Next's router can't fetch one, and it then does a normal full-page navigation. That request is a
document request, which the precache answers. The page is replaced instead of patched in place, so a link to a
page never visited and the language buttons both work. Caching the payloads would add stored copies that could come
from a different build than the HTML around them (D7), for a small gain. Task 1 checks that Next behaves this way in
this version.

- *Alternative: use `defaultCache` and remove the rules we don't want.* Rejected: it breaks silently when a Serwist
  release adds a rule.
- *Alternative: cache RSC payloads as `defaultCache` does.* Rejected for the version-mixing reason above.

### D6. The offline fallback

A navigation that is not precached matches the "navigations" rule, whose handler fails offline, and Serwist's
`fallbacks` setting then serves `/offline` for it. `/offline` is a prerendered page in the root layout, so it is
precached with the rest. It says, in English and Bangla, that the page isn't available offline and links to `/duas`.
It has `robots: noindex`. Online, the same rule passes the real response through, so 404 and 308 responses are
unchanged.

### D7. Updates: wait, prompt, then reload once

`new Serwist({ skipWaiting: false, clientsClaim: true, ... })`. A new worker installs in the background and downloads
its entries into the same precache store under new revisions, so the old worker keeps answering from the entries it
knows. Pages and their hashed chunks stay a matching set. When it finishes, it waits.

On every full page load `PwaProvider` also calls `registration.update()`. Browsers only re-check the worker file on a
navigation about once a day, so without this a deployed update could take that long to reach a reader. Offline, the
request fails and is ignored.

`PwaProvider` listens for the window-side `waiting` event. On `waiting`, with `isUpdate` true (not the first
install), it shows the prompt. "Reload" sends `SKIP_WAITING`, and a single `controlling` event then calls
`location.reload()` once. Dismissing hides the prompt for this page load only, and the waiting worker raises the event
again the next time the app opens. `SerwistProvider` is used with `reloadOnOnline={false}` and
`cacheOnNavigation={false}`: the first would reload the page on reconnecting, which the specs forbid, and the second
would store pages we haven't listed.

`clientsClaim: true` makes the first install take control of the already-open page, so offline works without a
second visit. On activation Serwist deletes precache entries that aren't in the new list (`cleanupOutdatedCaches`).
The worker also deletes its two runtime caches on activation, so nothing cached at runtime for the previous build stays
behind. (An old page can fetch a new chunk through the old worker while an update waits, and in testing that left one
entry there.) They fill again as pages are used.

The prompt is a small fixed bar at the bottom centre, outside the page grid, so it doesn't cover the cards. Its text
comes from new keys in `lib/i18n.js` (`updateAvailable`, `reload`, `dismiss`, and the offline page's strings),
with the language taken from the path prefix. Bangla wording is a draft for a Bangla speaker, like the other labels.

### D8. Development

`PwaProvider` passes `disable` when `process.env.NODE_ENV !== "production"`, so nothing registers. In development
it also runs `navigator.serviceWorker.getRegistrations()`, unregisters this app's worker and deletes this app's caches (the ones whose names start with `serwist-`, so other apps on the same `localhost` origin are left alone), so a worker left
by an earlier `npm start` on the same port can't serve stale pages. That is a few lines, and it is the reason the
README tells people to test production builds on another port. The development server also serves the kill worker (D9) at `/serwist/sw.js`, because a production worker left on the
same address answers page loads from its own saved copies, so the development page (and the cleanup code in it) may
never load. Its `update()` call (D7) fetches the worker file from the development server, gets the kill worker, which
clears this app's caches, unregisters itself and reloads the page from the development server. Nothing requests
`/serwist/sw.js` in development unless such a leftover exists.

### D9. A way back: the kill switch

A broken service worker is the one change here that can't be rolled back by redeploying, because readers' browsers
keep running the old worker. So `route.js` reads `SW_KILL`. When it is `1` at build time, `swSrc` is `app/sw-kill.js`
instead of `app/sw.js`. The kill worker calls `skipWaiting`, deletes this app's caches, unregisters itself and reloads the
open pages. The same build also sets `NEXT_PUBLIC_SW_KILL`, which makes `PwaProvider` stop registering and remove
any leftover worker (as in development, D8). Without that, the page would register the kill worker again on every
load, and each load would clear the caches and reload. The README documents the steps. In testing, Chrome kept the kill worker in the "waiting" state until the next page load, and the old page's update
bar showed meanwhile. The next load cleaned up completely (no registration, no caches, page not controlled).
The cause was not found. Because the worker file is fetched without HTTP caching
(`no-cache`, D2), every device picks the new one up the next time it opens the app.

### D10. Verification

- **Unit tests** (`node --test`): `lib/precache.js` (counts, exact URLs, no duplicates, no audio), `lib/sw-rules.js`
  (every scenario in `caching-boundaries`), and the new i18n keys in both languages.
- **`scripts/check-precache.mjs`** reads the built worker (`.next/server/app/serwist/sw.js.body`) and checks it
  against the database and the build: 20 category URLs that equal `categoryHref`, the 5 page URLs, every `.js`, `.css`
  and `.woff2` file in `.next/static`, every image in `public/`, and nothing with an audio extension or under `/api/`.
- **`npm run smoke`** gets extra checks: `/serwist/sw.js` returns 200 JavaScript with `Service-Worker-Allowed: /`
  and `no-cache`, and `/offline` returns 200.
- **Real offline test in a browser** (the part nothing else can check): build, `npm start -p 3100`, open `/duas`,
  wait for the worker, then stop the server and open pages. Stopping the server is real offline, and `localhost` counts
  as a secure origin, so the worker runs. The checklist is task 6.

## Risks / Trade-offs

- **A faulty worker stays on readers' devices.** → D9's kill switch, the `no-cache` header on the worker file, and
  `updateViaCache: "none"`. A smoke check confirms the headers.
- **Precached pages are served without asking the server.** A reader sees the saved version of a category page even
  online, until they accept an update. → That is the intended behavior, and the content only changes with a build
  (so does the revision).
- **An old tab can ask for a chunk that an accepted update deleted.** Tab A (old build) stays open while tab B
  accepts the update, and A's next lazy chunk request fails. → Next falls back to a full reload on a failed chunk,
  which then loads the new build. The window is small, because the app has few lazy chunks.
- **Storage use of a few MB, and re-download on every deploy** (D4). → Acceptable for the content size. The check script
  prints the total size so growth is visible.
- **`@serwist/turbopack` is a workaround package** (Route Handler instead of a plugin), and the app pins its minor version. → D1's
  alternative stays available. Task 1 proves it works on Next 16.4.6, Node 24 and Windows before anything else is built.
- **The installed worker survives into development.** → D8.
- **Safari and iOS can evict stored data** after weeks of non-use. → The pages come back on the next online visit. Phase 3 asks for persistent storage for user data.
- **Next's full-page fallback** (D5) is assumed from Next's router behavior and is not documented as a contract. →
  Task 1 and the offline checklist test it, and the fallback is to answer failed RSC requests with a 503 so the router takes the same path.

## Migration Plan

1. Merge with the worker enabled in production only. The first visit installs it silently (no prompt on the first install).
2. If a problem shows up, rebuild with `SW_KILL=1` and deploy. Devices clean themselves up on their next visit. Then
   fix and redeploy normally.
3. `plan.md` and the README are updated as part of this change.

## Open Questions

- **Prompt styling** (colour, exact position) can be adjusted when the bar is seen in a browser.
- **A web app manifest and PNG icons** (installing the app to a home screen) are left for a later change, once there are PNG icons.
