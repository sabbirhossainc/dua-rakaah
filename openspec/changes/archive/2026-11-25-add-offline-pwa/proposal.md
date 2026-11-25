# Proposal

## Why

The content (10 categories, 176 duas, in English and Bangla) is small and never changes between builds, so it is a
good fit for offline reading, and offline use is one of the app's goals (`plan.md`, phase 2). Today every page
needs the server. Phase 3 (bookmarks, memorize) and phase 4 (audio) both assume the app shell and all content are
already on the device. This is phase 2, and it builds on the pages from `add-content-pages`.

## What Changes

- **A service worker** built with Serwist. `plan.md` names `@serwist/next`, but that package needs the webpack
  build, and this app builds with Turbopack (the Next 16 default). The change uses `@serwist/turbopack`, which
  Next's own PWA guide points to for Turbopack.
- **All content works offline after one online visit.** The service worker precaches the 20 category pages
  (`/duas/<slug>?cat=N` and `/bn/duas/<slug>?cat=N`), the two landing pages, the images and icons, and the app's
  scripts and styles. The category URLs are built from the content database when the app builds, so they follow
  the data.
- **An offline fallback page** for any page that was not saved.
- **"New content, reload" prompt.** When a new build installs, the reader sees a prompt and chooses when to reload.
  The page never reloads by itself.
- **Explicit caching boundaries.** The service worker uses its own short list of caching rules, not Serwist's
  `defaultCache`, because the default caches audio files and `/api/` responses. Audio and `/api/` requests are
  never cached or intercepted (decision in `plan.md`), and no other requests are cached unless a rule says so.
- **Off in development.** The service worker is only registered in production builds, so `npm run dev` always shows
  the current code.
- **Checks:** a script that lists what the build will precache and checks it against the database, and a manual
  offline test with a written checklist (this needs a browser).
- **README and `plan.md`** updated.

Not in this change: a web app manifest and the install prompt (the app has no PNG icons yet), an "offline"
banner, Next's experimental `useOffline` hook, background sync (phase 3), audio (phase 4), and translating the
global chrome.

## Capabilities

### New Capabilities

- `offline-content`: what is available with no network after the first online visit, how pages and assets are
  saved, what the reader sees for a page that was not saved, and that development builds never register a service worker.
- `content-updates`: how a new build reaches a device that already has the app, and the reload prompt.
- `caching-boundaries`: which requests the service worker may cache or answer, and which it must leave alone
  (audio, `/api/`, other origins).

### Modified Capabilities

None. The specs from `add-content-pages` are not archived yet, and none of their requirements change. This change
only adds behavior on top of them.

## Impact

- **New files:** `app/sw.js` (the service worker), `app/serwist/[path]/route.js` (serves it and builds the precache
  list), an offline fallback page, a small client component for the reload prompt, and a precache check script.
- **Changed files:** `app/layout.js` (registers the service worker and shows the prompt), `next.config.mjs`
  (`withSerwist`, a fixed build ID), `package.json` (dependencies, script), `README.md`, `plan.md`.
- **Dependencies:** `@serwist/turbopack` and `serwist` (runtime), `esbuild` (dev, bundles the service worker at
  build time). `typescript` and `esbuild-wasm` are optional peers and are not needed.
- **Requires** `add-content-pages` (category pages, `?cat=N` URLs, `lib/db.js`, `lib/content.js`) to be applied.
- **Hosting:** still a Node server. Nothing about static hosting changes.
- **Risk:** a service worker that caches the wrong thing is hard to undo for readers. See `design.md`, Risks.
