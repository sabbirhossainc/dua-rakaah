# Plan: ird-dua-app

_Explored 2026-11-24 and 2026-11-25. Sections 1 to 6 describe the project **as it was found**. Sections 7 to 12 hold the plan._

> **Layout change on 2026-11-25:**
> - `server/` was deleted: Express, `sqlite3`, `vercel.json`, and the committed `node_modules`.
> - The Next.js app moved from `ird-dua/` to the **repo root**.
> - The content database is now `data/dua_main.sqlite`.
> - Paths below use the new layout. Files that no longer exist are marked _(deleted)_.
>
> ```
> ird-dua-app/
>   app/  public/  data/dua_main.sqlite
>   package.json  next.config.mjs  postcss.config.js  eslint.config.mjs
>   jsconfig.json  .eslintrc.json  .gitignore  README.md  plan.md
> ```

## 1. What this project is

A two-part "Dua & Ruqyah" web app. It shows Islamic supplications (duas) grouped by
category. The UI is modeled on duaruqyah.com: the favicon is hot-linked from that site.

Original layout, before the 2026-11-25 restructure:

```
+--------------------------------------------------------------+
|                        ird-dua-app/                          |
+--------------------------------------------------------------+
|                                                              |
|   ird-dua/  (frontend)              server/  (backend)       |
|   Next.js 14.1 App Router           Express 4 + sqlite3      |
|   React 18, Tailwind 3, SVGR        dua_main.sqlite (6.7 MB) |
|                                                              |
|   Server Components --fetch-->  http://localhost:5000        |
|        (revalidate: 10s)           |                         |
|                                    v                         |
|                              [ SQLite file ]                 |
|                                                              |
|   Deploy target (intended): Vercel, for both halves          |
+--------------------------------------------------------------+
```

- 16 commits, all from 2024-02-04 to 2024-02-10. The last one is `e64b03f Update MenuCom.js`.
- There are no tests, no CI and no env config. There was no root `.gitignore`. The Next.js one is at the root since the restructure.

## 2. Data model (from `data/dua_main.sqlite`, formerly `server/dua_main.sqlite`)

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

- Every table is bilingual (`_bn` and `_en`). The UI only reads the `_en` fields.
- No primary keys or foreign keys are declared. The joins work by convention on `cat_id` and `subcat_id`.
- `sub_category` is never queried anywhere.
- The CREATE TABLE statements in `server/db.js` _(deleted)_ were malformed (commas are missing between
  columns). They never run against the real file, because it is opened `OPEN_READONLY`
  and the tables already exist.

## 3. Frontend map (`app/`, formerly `ird-dua/app`)

```
RootLayout (app/layout.js)
+--------+-----------------------------------------------+-----------+
|LeftBar |  Topbar  [ "Duas Page" ]  [Search]  [MenuCom] |           |
| (nav)  +-----------------------------------------------+ RightBar  |
|        |  children                                     | (Settings |
| home   |   /          -> "Home Page" placeholder       |  static)  |
| alldua |   /support   -> "Support Page" placeholder    |           |
| ...    |   /duas      -> DuaLayout                     |           |
|        |                 +-----------+---------------+ |           |
|        |                 | Category  | Duas page     | |           |
|        |                 | (server)  | (server)      | |           |
|        |                 | fetch cats| fetch ALL duas| |           |
|        |                 +-----------+---------------+ |           |
+--------+-----------------------------------------------+-----------+
```

| Route / component | State |
|---|---|
| `/` , `/support` | Placeholders only |
| `/duas` | Lists all 190 duas: name, `top_en`, reference, and an `<audio>` with no controls |
| `/duas/<slug>?cat=N` (category links) | **No such route.** Every category link returns a 404 |
| `/alldua`, `/memorize`, `/bookmark`, `/ruqyah`, `/dua-info`, `/books` (LeftBar) | **No such routes.** All return 404 |
| `Search`, the category search input | Markup only, no handlers |
| `DuaIcons` (copy/bookmark/plan/share/report) | Links with `href=""`, no behavior |
| `RightBar` language toggle (English / Bangla) | Static buttons |
| `MenuCom` dropdown | Client component, **currently a syntax error** (see 5.1) |

The dua cards never render the core content: `dua_arabic`, `transliteration_en` and
`translation_en`. The section header is hard-coded to "Section: Sections".

## 4. Backend map (`server/`, _deleted 2026-11-25_)

```
 index.js  (CommonJS)                       api/index.js (ESM)
 +--------------------------------+         +---------------------+
 | express + cors                 | <-------| import app from ".."|  (Vercel entry)
 | opens SQLite OPEN_READWRITE    |         +---------------------+
 | GET /  -> never responds  (!)  |
 | GET /duas            COMMENTED |
 | GET /duas/duacategory COMMENTED|
 | app.listen(PORT)               |
 +--------------------------------+
 db.js -> separate READONLY connection with broken DDL; not imported by index.js
```

History of `server/index.js` _(deleted)_. This explains how it got into its current state:

```
a436849 "index"           routes live, using db.js        (works locally)
ed89239 "New version"     routes deleted                  (Vercel troubleshooting)
4122928 "Server: back"    routes re-added, but COMMENTED; db opened inline
```

The commit messages ("vercel", "fix server", "fix terminated", "newtrial", "builds") point to
a deployment attempt on Vercel that did not succeed and that the routes did not survive.

## 5. Findings: what is broken right now

### 5.1 Blocking (the app does not work end to end)

1. **The frontend will not compile.** `app/components/MenuCom.js:62-73` (line numbers as found; the file has local edits since then). The last
   commit commented out a block but left `}` and `})` uncommented inside `handleClick`.
   MenuCom is rendered by Topbar, which is in the root layout, so every page fails to build.
2. **The backend has no data routes.** Both `/duas` and `/duas/duacategory` are commented
   out in `server/index.js` _(deleted)_. The frontend fetches get 404s, and `.json()` or `.data.map`
   then throws, which lands on `app/error.js`.
3. **`GET /` hangs.** In `res.status(200),express.json({...})`, the comma operator means
   no response is ever sent.
4. **The commented route code calls `db.close()` inside each handler.** If you just
   uncomment it, the first request kills the connection for every request after it.

### 5.2 Deployment (Vercel)

- `sqlite3` is a native module. It is fragile on Vercel serverless builds.
- `OPEN_READWRITE` on Vercel's read-only filesystem will fail. The relative path
  `./dua_main.sqlite` is resolved from the process CWD, not the file's directory.
- `app.listen()` runs inside a serverless function.
- `api/index.js` uses ESM `import`/`export` while `index.js` is CommonJS.
  `vercel.json` builds `./index.js` but rewrites to `/api`, so it is unclear which entry Vercel runs.
- The frontend hard-codes `http://localhost:5000` in `app/lib/*.js`. There is no env var
  such as `NEXT_PUBLIC_API_URL`, so a deployed frontend can never reach a deployed API.

### 5.3 Correctness and quality (non-blocking)

- `generateStaticParams` is exported from `duas/page.js` and `components/Category.js`.
  It does nothing on a non-dynamic route or a component. If it ever ran, it would call `.map`
  on the `{message, data}` object rather than on the array.
- `app/lib/getAllDuas.js` exports a function named `getAllCatalist`. This is a copy-paste name.
- `LeftBar.js` exports a function named `RightBar`.
- In `duas/page.js`, the `key` is on the inner div instead of the outer mapped element, which
  causes a React key warning. All cards share `id="sec_1"`, and all categories share `id="cat_1"`.
- Tailwind classes such as `xs:`, `3xl:`, `sm-max:`, `md-max:`, `lg-min:`, `xl-min:`,
  `text-mss`, `mute-grey` and `dark-*` are not defined in the theme (now the `@theme` block in `app/globals.css`, since the Tailwind 4 upgrade on 2026-11-25), so they do nothing.
  `sm` is redefined to 480px, which shifts every responsive breakpoint.
- `<html className="p-10">`, and the metadata description says "Generated by Sabbir".
- `/duas` fetches all 190 duas, including large Arabic fields, on every render. Nothing is
  filtered by category or paginated.

### 5.4 Repo hygiene

- ~~`server/node_modules` (1,873 files) **was committed**.~~ RESOLVED on 2026-11-25: `server/` was
  deleted, git tracks no `node_modules` anymore, and the root `.gitignore` ignores `/node_modules`.
- ~~The root `README.md` is deleted.~~ RESOLVED: the Next.js README is now at the root. It still
  needs rewriting for this project.
- `node_modules` is installed at the root.
- The 6.7 MB SQLite binary is committed. That is fine at this size, but worth knowing about.

## 6. Shape of the problem

```
   How far is this from a working app?

   [doesn't build] --fix MenuCom--> [builds] --restore routes--> [/duas works locally]
                                                                      |
          +-----------------------------------------------------------+
          v
   [category filtering]  needs /duas/[slug] route + ?cat API param
          |
          v
   [real dua content]    render arabic / transliteration / translation
          |
          v
   [bn/en toggle]        client state or cookie, pick _bn/_en fields
          |
          v
   [deploy]              <-- the real fork in the road (see 7)
```

## 7. Open threads worth deciding

**A. Does the Express server need to exist at all?** RESOLVED. See section 9.
The data is a read-only 6.7 MB SQLite file with 223 rows of real content. Options:

| Option | Pros | Cons |
|---|---|---|
| Keep Express + sqlite3, host it somewhere with a disk (Render, Fly, a VPS) | Smallest change | Two deploys, CORS, keeping URLs in sync |
| Move the queries into Next.js Server Components or Route Handlers (`better-sqlite3`, read-only) | One app, no CORS, no localhost URL | Native module on Vercel still needs care |
| Export the DB to static JSON at build time and fully SSG the site | No runtime DB, cheapest hosting, fastest | The data is baked in, so a rebuild is needed to change it |

The data is static and the UI is read-only, so the **static JSON / SSG route is the most
natural fit**. That changes if user features like bookmarks or memorize are planned.

**B. Is this an assignment clone or a product?** The structure (a pixel-matched duaruqyah
layout, placeholder nav items) reads like a UI task. PARTLY RESOLVED: bookmark and memorize are real features, and the other sidebar items stay as placeholders (see sections 9 and 10). The answer decides whether the
nav items (memorize, bookmark, ruqyah...) are scope or decoration.

**C. Bangla first?** RESOLVED: English is the default, and Bangla is the alternative. All data is bilingual. The original site defaults to Bangla. The current
UI is English-only.

**D. Repo cleanup**. Should the `node_modules` removal be committed, should root and server
`.gitignore` files be added, and should the README be restored or rewritten?

## 8. Suggested next steps (no commitment)

1. Fix the `MenuCom.js` syntax error, so it builds.
2. Restore the two read routes, without `db.close()`. Fix `GET /`. Make the DB path absolute.
3. Move the API base URL into an env var.
4. Decide thread **A** before investing in deployment.
5. Add the category route and filtering, then render the full dua content.
6. Commit the `node_modules` removal and add `.gitignore` files.

> Steps 2 to 4 are replaced by the direction in section 9.

## 9. Direction: SQLite inside Next.js, no Express server

_Added 2026-11-25._

### Confirmed decisions

- **The Express server is removed.** Next.js reads `dua_main.sqlite` directly.
- **Bookmarks and memorize ARE real per-user features.** The app needs to write user data,
  which changes where and how SQLite can run. See section 10. _(Corrected on 2026-11-25. An
  earlier draft of this section wrongly said the app would stay read-only.)_
- **English is the default language.** Bangla is the alternative.
- **Sidebar placeholders stay** (ruqyah, books, dua-info, and so on) as non-interactive links for now.

### Target architecture

```
 +----------------------------------------------------------------+
 | repo root (Next.js, the only app)                              |
 |                                                                |
 |  app/duas/[slug]/page.js   --+                                 |
 |  app/components/Category.js -+--> lib/db.js --> data/dua_main.sqlite
 |  generateStaticParams()    --+    (read-only,     (moved here   |
 |                                    better-sqlite3)  from server/)|
 |  app/api/search/route.js  ----^   (optional, only for live     |
 |                                    search from the browser)    |
 +----------------------------------------------------------------+
        server/  --> DELETED 2026-11-25 (Express, sqlite3, vercel.json,
                     committed node_modules)
```

### Three ways to use the DB (they can be combined)

| Level | How it works | Runtime DB? | Role here |
|---|---|---|---|
| 1. Build-time only (SSG) | Pages and `generateStaticParams` query SQLite during `next build` | No | **Default** for categories and dua lists |
| 2. Server Components at request time | Pages call `lib/db.js` helpers directly | Yes | Fallback if the DB should change without a rebuild |
| 3. Route Handlers (`app/api/*/route.js`) | The same helpers, exposed as JSON | Yes | Only for search-as-you-type, or for future outside consumers |

Pages never call their own API over HTTP. Server Components call `lib/db.js` directly.

### Driver

| Driver | Verdict |
|---|---|
| `better-sqlite3` | **Recommended.** Synchronous and fast. Next.js already has it on its default list of packages it doesn't bundle. |
| `node:sqlite` (built in) | Possible. No dependency, and local Node v24 runs it without a flag, but its API is not yet marked fully stable. |
| `sqlite3` (current) | Drop it. Callback API, and the least reliable on serverless builds. |

### Things to get right

1. **Ship the DB file.** Next.js only includes files it can trace from imports, and a
   path string isn't traced. Include `data/dua_main.sqlite` explicitly in the Next.js config
   (on Next 16 that's the top-level `outputFileTracingIncludes` key). Not needed if every page is
   statically generated.
2. **Open read-only**, with `{ readonly: true, fileMustExist: true }`. Vercel's filesystem is read-only anyway.
3. **Use an absolute path:** `path.join(process.cwd(), "data", "dua_main.sqlite")`.
4. **Open one connection per server instance** at module level. Never close it inside a request.
5. **Filter in SQL** (`WHERE cat_id = ?`, using prepared statements). Don't fetch all 190 duas and filter in JS.
6. **The `sub_category` table** is the natural source for section headings in each category,
   replacing the hard-coded "Section: Sections".

### What this removes from section 5

- 5.1 #2 to #4 (missing routes, `GET /` hanging, `db.close()`): they go away with the server.
- All of 5.2: no separate deploy, no CORS, no `localhost:5000`, no `vercel.json` conflicts.
- 5.4: the committed `server/node_modules` goes away with the folder.

What remains: the `MenuCom.js` syntax error (5.1 #1), the missing routes, the cards not
showing Arabic text, transliteration or translation, the unused bn/en toggle, and the issues in 5.3.

### Revised next steps

1. ~~Fix the `MenuCom.js` syntax error.~~ DONE (rewritten by hand, with outside-click and Escape to close).
2. ~~Move `dua_main.sqlite` to `data/`.~~ DONE 2026-11-25. ~~Add `better-sqlite3` and `lib/db.js` with
   query helpers (`getCategories`, `getSubcategories(catId)`, `getDuasByCategory(catId)`).~~ DONE 2026-11-25.
3. ~~Replace `app/lib/getAll*.js` (the fetches to localhost) with direct calls to those helpers.~~ DONE 2026-11-25: `/duas` is now built ahead of time from SQLite.
4. Add `app/duas/[slug]/page.js` with a working `generateStaticParams`, and render the full dua content.
5. Optional: add `app/api/search/route.js` for the search box.
6. ~~Delete `server/` and move the app to the root.~~ DONE 2026-11-25. Still to do: rewrite the README
   for this project, covering one app and one `npm run dev` from the root.

### Language (decided: English default)

- Every query helper takes `lang` (`"en"` or `"bn"`) and picks the `_en` or `_bn` columns.
- The open question is still where the choice lives. Putting it in the URL (`/duas/...` for
  English, `/bn/duas/...` for Bangla) keeps content pages statically generated. Putting it in a
  cookie makes every content page dynamic. The URL is recommended.

## 10. Per-user data (bookmarks, memorize) with SQLite

_Added 2026-11-25._

### Short answer

**Yes, SQLite can store per-user data, but not as a plain file on Vercel.** SQLite needs
a disk that persists and is writable. Vercel's serverless functions have a read-only
filesystem. The only writable path there is `/tmp`, which is per-instance and gets wiped,
so bookmarks would silently disappear. So the answer depends on **where the app is hosted**.

### Split the data in two

```
 +----------------------------------------------------------------+
 | Next.js                                                        |
 |                                                                |
 |  content pages (SSG) --> lib/content-db --> dua_main.sqlite    |
 |                                             READ-ONLY, shipped |
 |                                             with the app,      |
 |                                             replaceable        |
 |                                                                |
 |  /bookmarks, /memorize   --> lib/user-db --> user data store   |
 |  Server Actions / API        (auth-aware)    READ-WRITE,       |
 |                                              must persist      |
 +----------------------------------------------------------------+
```

Keeping content and user data apart means `dua_main.sqlite` can be replaced with new
duas or fixes without touching anyone's bookmarks. Content pages stay statically generated.
Only the per-user pages become dynamic.

### Hosting options

| Option | SQLite? | How it works | Tradeoffs |
|---|---|---|---|
| **A. Own server with a persistent disk** (VPS, Railway or Fly.io volume, Render disk) | Yes, a real `.sqlite` file | `next start` plus `better-sqlite3`, `users.sqlite` on the volume, WAL mode | Simplest code, same driver for both databases. Single instance only, because SQLite has one writer and one disk. You own backups (for example, Litestream to S3). |
| **B. Vercel + hosted SQLite** (Turso / libSQL) | Yes, the SQLite dialect over the network | `@libsql/client` from Server Actions. The content DB can stay a bundled file. | Works on serverless and scales out. Adds an external service and an async driver. Two drivers if the content DB stays local. |
| **C. Cloudflare + D1** | Yes, SQLite-based | Next.js on Cloudflare Workers with D1 bindings | It's a different runtime, so Node native modules like `better-sqlite3` don't work. That's a bigger migration. |
| **D. No server-side storage** (browser `localStorage` / IndexedDB) | No | Bookmarks are kept in the browser | No accounts or DB needed. Bookmarks are tied to one device and browser and are lost if site data is cleared. Can be a stepping stone. |

**Recommendation:** If you're willing to run a small server, use **A**. It's one driver, one
codebase and zero external services, and SQLite handles this load easily. If Vercel is required,
use **B**: Turso keeps the SQLite schema and SQL, so very little changes.

### "Per-user" also means identity

You can't have per-user data without knowing who the user is. Options:

| Identity | How it works | Notes |
|---|---|---|
| Anonymous device ID | A random ID in an httpOnly cookie, created on first visit | No login screen. Lost when cookies are cleared or the device changes. |
| Real accounts | Auth.js (NextAuth) with Google or email login, sessions stored in the same user DB | Syncs across devices. Needs login UI, a privacy policy, and OAuth setup. |
| Hybrid | Start anonymous, and when the user signs in, merge the anonymous data into the account | Best UX, slightly more logic. |

### Draft schema for the user DB

```
 users              bookmarks                     memorize
 +-------------+    +------------------------+    +---------------------------+
 | id (PK)     |<---+ user_id  (FK)          |    | user_id   (FK)  ----------+--> users.id
 | email       |    | dua_id   --> dua.id    |    | dua_id    --> dua.id      |
 | name        |    | folder   (nullable)    |    | status    new|learning|done|
 | created_at  |    | note     (nullable)    |    | progress  0..100          |
 +-------------+    | created_at             |    | last_reviewed_at          |
                    | PK(user_id, dua_id)    |    | PK(user_id, dua_id)       |
                    +------------------------+    +---------------------------+
```

- `dua_id` points to `dua.id` in the content DB. That link is by convention, because the two
  databases are separate files and can't enforce a foreign key between them. If the content DB is
  replaced, the `dua.id` values must stay stable.
- Writes go through **Server Actions** (`"use server"`) or Route Handlers, never straight from the client.

### Confirmed decisions (2026-11-25)

- **Hosting for user data: Turso (option B).** It holds bookmarks, memorize, and any future
  feature that needs a database it can write to. Vercel stays possible for hosting the app.
- **Content stays separate.** `dua_main.sqlite` stays read-only and ships with the app.
- **Identity is hybrid.** Users start with an anonymous ID stored in a cookie. Google sign-in
  goes through Auth.js, and the anonymous data is merged into the account at sign-in.
- **The app is local-first.** It works offline and syncs to Turso when the network comes back. See section 11.

### What changes in the plan

- `lib/db.js` from section 9 splits into `lib/content-db.js` (read-only) and `lib/user-db.js` (read-write).
- `/bookmark` and `/memorize` move from sidebar placeholders to real pages. The other placeholders stay.
- The `DuaIcons` bookmark button becomes a Server Action toggle.
- Hosting is decided **before** writing `lib/user-db.js`, because it determines the driver.

### Open questions (in dependency order)

1. ~~**Hosting:** your own server with a disk (A), or Vercel (B)?~~ RESOLVED: Turso (B).
2. ~~**Identity:** anonymous device ID, real accounts, or hybrid?~~ RESOLVED: hybrid.
3. ~~**Memorize behavior:**~~ RESOLVED: a "learned" flag plus progress tracking. No spaced repetition.

## 11. Local-first architecture and sync

_Added 2026-11-25._

### Confirmed decisions

| Topic | Decision |
|---|---|
| Sync model | **Option 2: sync through the server.** Turso is not reached directly from the browser. |
| Turso layout | **One shared Turso database** with `owner_id` columns. The token stays on the server. |
| Offline content | **All content is available offline**, not just pages the user has already visited. |
| Memorize conflicts | **The further progress wins**, so learning is never lost. |
| Sign-out | **Keep local user data only if it hasn't synced yet.** Data that has synced is cleared. Kept data is discarded after **30 days**. |
| Memorize model | **A "learned" flag plus progress (0 to 100), set by the user.** No spaced repetition. |
| Un-tick and reset | **Allowed.** `reset_gen` is included from day one. See "Conflict rules". |
| Audio | **Not hosted by this app.** It plays from an external URL when one works, and not offline. A fallback provider is matched when the original is missing. See section 12. |
| Reciter | **A per-user setting**, stored in the `preferences` table and synced like other user data. At sign-in, the account's existing value wins. |
| Quran.com audio | **The first provider for Quran verse duas.** It is called only from the server, URLs are cached for 7 days or less, and the source is credited. See section 12. |

### Why sync goes through the server, not directly to Turso

Turso's browser sync (`push()` and `pull()` over a database stored in the browser) works one
database at a time, and its access tokens cover a whole database. Syncing directly from the
browser would therefore need **one Turso database per visitor**, including every anonymous one,
plus an endpoint that issues tokens. Merging an anonymous user into an account would become a
copy across databases. The browser sync package also looked pre-release when this was explored
(`@tursodatabase/sync-browser@0.1.5-pre.2`).

The user data here is tiny and has a simple structure. Bookmarks are a set of entries, and memorize
is a status per dua. Server-mediated sync keeps the token on the server, uses one database,
makes merging a single SQL transaction, and uses only stable packages (`@libsql/client`, IndexedDB).

Revisit direct sync only if a future feature needs heavy offline editing or real-time collaboration.

### Architecture

```
 BROWSER                                       SERVER (Next.js)            CLOUD
 +---------------------------------------+     +--------------------+     +-----------+
 | Service worker (Serwist)              |     |                    |     |           |
 |  precache: app files + ALL content    |     | content pages      |     |           |
 |  (10 categories, 190 duas, en + bn)   |<----+ (built ahead of    |     |           |
 |                                       |     |  time from         |     |           |
 |  UI reads user data from local only   |     |  dua_main.sqlite)  |     |           |
 |        |                ^             |     |                    |     |           |
 |        v                |             |     |                    |     |           |
 |  IndexedDB                            |     | POST /api/sync     |     |  Turso    |
 |   bookmarks, memorize  (local state)  |     |  1. who is it?     |     |  (libSQL) |
 |   outbox               (pending ops)  +---->|     cookie/session |     |           |
 |   meta: anon_id, owner, cursor        |<----+  2. apply pushes   +---->|  users    |
 |                                       |     |  3. return pulls   |<----+  owners   |
 |  sync runner: on 'online', on focus,  |     |     after cursor   |     |  bookmarks|
 |  after each write, every N minutes    |     |                    |     |  memorize |
 +---------------------------------------+     +--------------------+     +-----------+
```

Rules:
- **The UI never waits for the network.** Every read and write goes to IndexedDB first. Sync runs in the background.
- **The server owns the Turso token.** The browser only talks to `/api/sync` and the Auth.js routes.
- **Content and user data stay separate.** User records reference `dua.id` by value only.

### Turso schema (draft)

```
 owners                       bookmarks                        memorize
 +---------------------+      +---------------------------+    +------------------------------+
 | id (PK, uuid)       |<-----+ owner_id                  |    | owner_id                     |
 | kind  anon|account  |      | dua_id                    |    | dua_id                       |
 | user_id (nullable)  |      | deleted   0|1             |    | learned  0|1                  |
 | merged_into (null)  |      | updated_at (client time)  |    | progress 0..100              |
 | created_at          |      | server_seq (sync position)|    | last_reviewed_at             |
 +---------------------+      | PK(owner_id, dua_id)      |    | reset_gen (see below)        |
                              +---------------------------+    | deleted, updated_at          |
 users (Auth.js tables:                                        | server_seq                   |
 users, accounts, sessions)                                    | PK(owner_id, dua_id)         |
                                                               +------------------------------+
 applied_ops(op_id PK, owner_id, applied_at)  -- ignores ops that are sent twice

 preferences                                  (added 2026-11-25)
 +------------------------------------------+
 | owner_id  --> owners.id                  |
 | key       e.g. "reciter_id", later "lang"|
 | value     text                           |
 | updated_at, server_seq                   |
 | PK(owner_id, key)                        |
 +------------------------------------------+
 Conflict rule between devices: the newest change wins (like bookmarks).
 Merge rule at sign-in: see "Identity lifecycle".
```

- **`server_seq`** is a number from a single counter, assigned by the server each time it accepts a
  change. A device pulls "all rows for my owner where `server_seq` > my cursor". Clock skew between
  devices never affects which changes get pulled.
- **`deleted`** marks a removed record instead of deleting it, so a removal made offline reaches the
  other devices. Old deleted rows can be purged later.

### Sync protocol

```
 client                                           server
   |  POST /api/sync                                 |
   |  { anon_id, cursor,                             |
   |    ops: [ {op_id, table, dua_id, fields,        |
   |            client_ts}, ... ] }                  |
   |------------------------------------------------>|
   |                                    resolve owner (session > cookie > anon_id)
   |                                    follow owners.merged_into if set
   |                                    for each op not in applied_ops:
   |                                        merge into row (rules below)
   |                                        assign new server_seq
   |                                    collect rows with server_seq > cursor
   |  { owner_id, new_cursor, rows: [...] }          |
   |<------------------------------------------------|
   | apply rows locally, drop acknowledged ops       |
   | from the outbox, save new_cursor                |
```

Pushes and pulls happen in one request. The request is safe to retry because `op_id` makes each change take effect only once.

### Conflict rules

**Bookmarks** (one entry per owner and dua): **the newest change wins**. The change with the
greater `updated_at` wins. If two are equal, the greater `op_id` wins. Removals are ordinary
changes that set `deleted = 1`.

**Memorize** (decided: **the further progress wins**). Merging happens field by field, not as a whole row:

```
 merged.learned          = max(a.learned, b.learned)      0 < 1 (once learned, stays learned)
 merged.progress         = max(a.progress, b.progress)
 merged.last_reviewed_at = max(a.last_reviewed_at, b.last_reviewed_at)
```

This merge always gives the same result, whatever order or however many times changes arrive,
so devices always end up in the same state.

> **Gap this creates: un-learning and resets.** If the user un-ticks "learned" or taps "start
> over" on a dua, plain max() would immediately restore the old value from another device.
> A user-toggleable "learned" flag makes this gap concrete: un-ticking it is a reset.
>
> **Decided: `reset_gen` is included from day one.** It's a counter. A reset increments it.
> The higher `reset_gen` always wins outright, and the max() rules apply only between equal
> `reset_gen` values. A reset made on purpose then spreads to other devices, and an accidental
> conflict still never loses progress.

**What counts as a reset.** Progress is **set by the user** (decided), so it can go down on purpose.
- **Increments `reset_gen`:** un-ticking "learned", lowering progress, or tapping "start over".
  The new values are stored with the new `reset_gen`.
- **Does not increment it:** ticking "learned" or raising progress. Those are normal
  changes, merged with max().

```
 merge(a, b):
   if a.reset_gen != b.reset_gen:  return the row with the higher reset_gen
   else: learned          = max(a.learned, b.learned)
         progress         = max(a.progress, b.progress)
         last_reviewed_at = max(a.last_reviewed_at, b.last_reviewed_at)
```

Two devices resetting at the same time end up with the same `reset_gen`, and max() then merges their
new values. No data is lost and the order doesn't matter. The client sends a reset as an
explicit op type, `memorize.reset`, so the server never has to guess the user's intent from the values.

### Identity lifecycle

```
 first load (possibly offline)
   --> anon_id = crypto.randomUUID(), stored in IndexedDB
       all local rows have owner = anon_id
 first successful sync
   --> server creates owners(id = anon_id, kind = anon)
       and sets a signed httpOnly cookie that binds the browser to anon_id
 Google sign-in (Auth.js)
   --> first push any pending outbox ops under anon_id
   --> server, in one transaction:
         - find or create the account owner
         - merge the anon rows into the account (same conflict rules as above)
         - preferences: the ACCOUNT's existing value wins, and the anon value
           is used only for keys the account doesn't have yet
         - owners[anon_id].merged_into = account owner
   --> client: owner = account, cursor = 0, full pull
 other devices still on their own anon_id
   --> each merges independently when that device signs in
 later syncs from an already-merged anon_id
   --> the server follows merged_into to the account,
       or rejects them if that device has since signed out
```

### Sign-out (decided: keep only data that hasn't synced)

```
 user clicks "Sign out"
   |
   +-- online?  yes --> push the outbox --> success --> clear all local user data,
   |                                                    new anon_id, empty state
   |
   +-- offline, or the push failed
         --> the outbox still has unsynced ops
         --> KEEP those ops, tagged with the account owner (not the new anon)
         --> clear the already-synced local rows, start a new anon_id
         --> when that account signs in again on this device:
               push the kept ops under the account, then delete them
```

Details to settle while implementing:
- **The kept ops must stay hidden** from the new anonymous session. This matters on a shared
  device, where the next person should not see the previous user's bookmarks.
- **Warn before signing out offline.** For example: "3 changes haven't synced. They'll be kept on
  this device and uploaded the next time you sign in."
- **If the account doesn't sign in again on this device within 30 days** (decided), the kept
  ops are discarded. Each kept op stores a `kept_at` time. Expired ones are deleted when the app
  starts and before each sync. The sign-out warning should mention this time limit.

### Offline content (decided: everything available)

- The content is small. The text in `dua_main.sqlite` is about 160 KB. The file itself is 6.7 MB
  because 1,491 of its 1,642 pages are empty, so running `VACUUM` before shipping would shrink it to
  about 600 KB.
- When the service worker installs, it precaches every category page, the dua list, all icons and
  images, and the app files, in **both languages**. That's roughly a few hundred KB to a few MB, which is fine.
- Content updates: each build produces a new precache manifest. The service worker updates in the
  background, and the app shows a prompt to reload for the new content.
- **Audio (decided: not hosted by this app, and not available offline):**
  - The 114 `audio` values are `http://www.ihadis.com/duaaudiofinal/<n>.mp3`. Checked on
    2026-11-25: they redirect to `https://ihadis.com/duaaudiofinal/<n>.mp3`, which returns
    **404 Not Found** for every file tried (2, 3, 4, 50 and 100). **The audio is broken even when online.**
  - Even if the files came back, the stored `http://` URLs would be blocked as mixed content on an
    HTTPS page, so they would need rewriting to `https://`.
  - UI states (decided). This reads "hide audio controls" and "show disabled with Audio
    unavailable" as two different situations. **Confirm this reading.**

    | Situation | UI |
    |---|---|
    | Offline | Audio controls **hidden** |
    | Online, and a working source exists (original or fallback, see section 12) | Normal play control |
    | Online, but no source works (all candidates 404 or error) | Control **shown disabled**, labeled **"Audio unavailable"** |

  - The service worker must **not** cache or intercept audio requests.
  - Fallback providers for missing audio: see section 12.

### Libraries (proposed)

| Concern | Choice |
|---|---|
| Service worker / PWA | Serwist (`@serwist/next`) |
| Local store | IndexedDB through Dexie (small API, works offline) |
| Server to Turso | `@libsql/client` |
| Auth | Auth.js (Google provider) with the libSQL/Drizzle adapter, so its tables live in Turso |
| Query layer (optional) | Drizzle ORM. One schema file covers both the content DB (better-sqlite3) and Turso (libSQL). |
| Next.js version | DONE 2026-11-25: upgraded to Next 16.4.6 and React 19.3.1, building with Turbopack. |

### Risks

- **Bugs in the sync code are the main risk.** Mitigations: the merge rules above always reach the
  same result in any order, `op_id` makes every change apply only once, and tests should replay
  changes in random order across simulated devices.
- **Building pages ahead of time and showing user data must not mix.** Content pages stay static.
  Bookmark and memorize state is filled in by the client from IndexedDB, so a page never shows a
  stale server-rendered "bookmarked" icon.
- **Browser storage can be evicted.** Call `navigator.storage.persist()` after the first bookmark.
  Anonymous unsynced data is the only thing that can really be lost.
- **The cost of anonymous owners.** Every visitor who syncs creates an `owners` row. Only create it
  when the first write is synced, not on page view.

### Still open

Resolved:
- Memorize uses a learned flag plus progress, and the user sets the progress.
- Un-ticking is allowed, and `reset_gen` is included.
- Unsynced data is kept for 30 days after sign-out.
- Audio is not hosted by this app and not available offline.
- Audio is hidden when offline and shown disabled when no source works.

1. **Progress input:** a free 0 to 100 slider, or fixed steps (0 / 25 / 50 / 75 / 100)?
   Steps are easier to tap on mobile and give fewer meaningless conflicts. (UI only.)
2. **Confirm the audio UI reading** in "Offline content": hidden when offline, disabled with "Audio unavailable" when online but broken.

## 12. Audio fallback provider

_Added 2026-11-25._

### Requirement

If a dua's original audio is not found, find a similar provider whose audio matches **that
exact dua**, and play from it. The audio is still not hosted by this app (see section 11).

### Why matching can't happen at play time

"Search a provider when the file 404s" sounds simple, but for this content it is the wrong place
to decide. **Playing the wrong recitation for a dua is a content error, not a cosmetic one.**
A runtime search would also be slow and would depend on network calls to the provider.
And nobody would review its guesses.

So matching happens **at data-preparation time**. A script proposes matches, a person reviews
them, and the app ships a fixed list of candidate URLs for each dua. At play time the app only
**tries the candidates in order**.

```
 DATA PREP (offline, once, re-run when needed)            RUNTIME (browser, online)
 +-----------------------------------------------+        +------------------------------+
 | 1. normalize dua_arabic (strip diacritics,    |        | candidates for this dua:     |
 |    unify alef/ya/ta marbuta, drop marks)      |        |   [original https url,       |
 | 2. compare with provider texts                |        |    fallback 1, fallback 2]   |
 | 3. score: exact / strong / weak / none        |        |          |                   |
 | 4. a person reviews strong and weak matches   |        |   try next on 'error' --+    |
 | 5. health-check URLs (HEAD, 200 audio/mpeg)   |        |          |              |    |
 | 6. write audio_sources table                  | -----> |   all failed? -> disabled|   |
 +-----------------------------------------------+        |   "Audio unavailable"    |   |
                                                          +------------------------------+
```

### Candidate providers (checked 2026-11-25)

| Provider | What it covers | Access | Status found |
|---|---|---|---|
| **Hisn al-Muslim API** (hisnmuslim.com) | ~266 adhkar from the Fortress of the Muslim, each with `ARABIC_TEXT` and its own `AUDIO` URL | `https://www.hisnmuslim.com/api/en/husn_en.json` lists 132 chapters. Each chapter's JSON lists items. Audio is at `/audio/ar/<id>.mp3`. | Audio for one item returns **200 `audio/mpeg`** over HTTPS with **`Access-Control-Allow-Origin: *`**. One chapter's JSON (id 126) is malformed. The API's URLs are `http://` and need rewriting to `https://`. |
| **Quran.com API** (Quran Foundation) | Verse-by-verse recitations by many reciters | Content API v4 through OAuth2 client credentials, **server-side only**. See "Quran.com as the first provider for Quran verse duas" below. | Published developer terms (updated 2026-11-20). **Chosen as the first provider for duas that are Quran verses.** |
| ~~EveryAyah~~ (everyayah.com) | Recitations of Quran verses, one file per verse | `https://everyayah.com/data/<reciter>/<SSSAAA>.mp3` | Works (200 `audio/mpeg`), but its usage terms are unknown. **Dropped** in favor of Quran.com. |
| Original ihadis.com | All 114 `audio` values | `http://www.ihadis.com/duaaudiofinal/<n>.mp3` redirects to an HTTPS address that **404s** | Dead. No Wayback Machine snapshot either. Keep it as candidate #1 in case it comes back, behind a health check. |

### How well Hisn al-Muslim matches

The text match ran from a throwaway script in the scratchpad, not in the repo. It compared our
153 duas that have Arabic text against all 266 Hisn al-Muslim items, after normalizing the Arabic:

| Match quality | Duas | Handling |
|---|---|---|
| Exact or contained (score 0.95 or higher) | **56** | Accept automatically, then spot-check |
| Strong (0.85 to 0.95) | **17** | A person reviews each one. Usually small wording or spelling differences. |
| Weak (0.6 to 0.85) | 43 | Review needed. Many will be partial overlaps, and the audio could include extra or missing text. Reject by default. |
| None (below 0.6) | 37 | No fallback |

Strong or better matches by category (matched / total with Arabic text):

```
 1 Dua's Importance   6/18     6 Sleep             20/31
 2 Dua's Excellence   3/14     7 Cloths             5/8
 3 Time of Dua        8/15     8 Home               3/6
 4 Dua Acceptance     4/5      9 Toilet             2/2
 5 Morning & Evening 19/50    10 Adhaan & Iqamah    3/4
```

**Realistic coverage: about 73 of 153 duas (about 48%) from Hisn al-Muslim, plus the Quran verse
duas from Quran.com.** Six duas cite a surah, and likely more, such as Ayat al-Kursi and the three
Quls, which are cited by hadith. Categories 1 and 2 are mostly hadith about dua rather than recited adhkar, so
they will stay mostly without audio. The other 37 duas have no Arabic text, so they never had audio to match.

### Data model (content side, read-only, built during data prep)

```
 audio_sources            (in dua_main.sqlite, or a JSON file shipped with the content)
 +-------------------------------------------------------------+
 | dua_id       --> dua.id                                     |
 | priority     1 = original, 2 = first fallback, ...          |
 | provider     ihadis | quran.com | hisnmuslim                 |
 | url          always https. NULL for quran.com (see below)    |
 | verse_keys   JSON list, quran.com only, e.g. ["2:285","2:286"]
 | coverage     full | partial  (quran.com only)                |
 | match_score  0..1 (null for the original)                   |
 | reviewed     0|1  (only reviewed or exact rows are shipped)  |
 | checked_at   last successful health check                   |
 +-------------------------------------------------------------+
```

This is content data, so it ships with the content DB and changes only when data prep runs again.
It never goes in Turso.

Provider order per dua:
- A Quran verse dua: `ihadis` (dead for now, behind a health check), then `quran.com`, then `hisnmuslim`.
- Any other dua: `ihadis`, then `hisnmuslim`.

**For Quran.com rows, no URL is stored.** Only our own references are stored: verse keys,
coverage, and review state. A verse key like `1:5` is a citation, not Quran Foundation content.
The real audio URL is resolved at runtime (see the next subsection).

### Quran.com as the first provider for Quran verse duas

_Added 2026-11-25. Based on the Quran Foundation Developer Terms (last updated 2026-11-20) and the
Content API v4 audio docs._

**Rules from the terms, and what each one means here:**

| Rule (from the terms) | Consequence |
|---|---|
| Needs `client_id` and `client_secret`, and "Content API credentials must stay on your backend" | The browser never calls Quran.com. A Next.js route does, and returns only the audio URLs. |
| Direct audio URLs are allowed if you "credit Quran Foundation and the reciter … and do not rehost them" | Stream from their hosts (`verses.quran.foundation` and the like). Never copy the MP3s. Always show the credit. |
| Don't "cache or store Quran Foundation Content longer than 1 week" | **Resolve audio URLs at runtime** and cache them for **at most 7 days** (1 day recommended). Never bake them into `dua_main.sqlite`. |
| Including their content or raw API data "in a public source-code repository … is redistribution" | **Never commit** API responses, audio URLs or reciter lists to the repo. |
| The app needs "a publicly reachable Privacy Policy and Terms of Use" | The "Privacy Policy" item in `MenuCom` must become a real page, plus a Terms of Use page, **before launch**. |
| "The text of the Quran is not modified in any way" | Show the IRD Arabic text as-is. Our text isn't Quran Foundation content, but don't alter it to fit their recitation. |
| Offline recitation downloads are allowed only under strict conditions | Not used. Offline audio stays off (section 11). |
| Credentials can be revoked "immediately and without liability", and APIs can change with about 30 days' notice | The fallback chain (`hisnmuslim`, then "Audio unavailable") covers this. |

**Runtime flow:**

```
 browser                                   Next.js route (server)
   |  GET /api/audio/<dua_id>?reciter=<id>    |
   |----------------------------------------->|
   |                                          | 1. read audio_sources (our data)
   |                                          | 2. OAuth token, cached until it expires
   |                                          | 3. for each verse key:
   |                                          |      verseRecitation.byKey(key, reciter)
   |                                          | 4. cache per (dua_id, reciter) for 7 days or less
   |  { urls: [...], coverage,                |
   |    credit: { reciter, source } }         |
   |<-----------------------------------------|
   | play the urls in order (multi-verse duas)|
   | stream from Quran Foundation hosts       |
```

- **Multi-verse duas** (for example 2:285 to 2:286 before sleep) play one verse file after another.
- **Partial-verse duas (decided): play the full verse,** labeled **"Full verse recitation"** next to the
  play control, so the user knows the audio includes words beyond the dua text shown.
- The matching script must tell `full` coverage from `partial`, because that's what sets the label.

**Finding which duas are Quran verses (data prep):** only 6 references say "Surah". Others, such as Ayat
al-Kursi and the three Quls in Morning & Evening, are cited by hadith. Match the Arabic text against a
**Quran text source with its own open license, such as Tanzil**. Pulling Quran.com text into the repo for
matching would break both the 1-week rule and the redistribution rule.

**Reciter selection (decided: a user setting):**
- The reciter list comes from a server route (`/api/reciters`), which wraps the API's list of recitations.
  It's Quran Foundation content, so it's cached for **7 days or less** and never committed.
- Only **verse-by-verse** recitations can appear in the list. The API's reciter IDs for whole surahs
  don't work with the verse endpoint.
- **Default** for users who haven't chosen one: recitation ID 7, the docs' example. It's believed to
  be Mishary Rashid Alafasy, which needs checking against the list.
- The setting is a **per-user preference that syncs through Turso**. See `preferences` in section 11.
- It **only affects Quran.com audio.** Hisn al-Muslim has one recording per dua. The credit label
  always shows which source and reciter is playing.
- UI: an "Audio / Reciter" entry in the existing `RightBar` Settings panel, next to Language.
- If the chosen reciter has no recording of a verse, fall back to the default reciter, then to the
  next provider in the chain.

**Setup still needed:**
- Register the app in the **Quran Foundation Developer Console** to get credentials. The docs pages
  read don't give the token endpoint, the API base URL, or the differences between the test and
  production environments.
- Rate limits aren't published. The route's caching keeps the number of calls low, and it should
  handle `429` by falling back to the next provider.
- The official SDK (`@quranjs/api`, with `createServerClient`) needs checking against the
  Next.js version in use (Next 16.4.6 since 2026-11-25).
- Credentials go in server-only environment variables, never in anything with the
  `NEXT_PUBLIC_*` prefix.

### Runtime behavior

1. Online, with candidates: play candidate 1. If the `<audio>` element fires `error`, try the next one.
2. All candidates fail, or there are none: show a disabled control labeled **"Audio unavailable"**.
3. Offline: hide the controls (from section 11).
4. Remember failures for the session, so a dead URL isn't retried on every render.
5. **Show the source.** For example, "Recitation: Hisn al-Muslim", or "Recitation: <reciter> ·
   Quran Foundation". Credit is **required** for Quran.com audio, and it tells the user why the
   voice differs between duas.
6. For Quran.com rows, the candidate URLs come from `/api/audio/<dua_id>?reciter=<id>`, not from
   `audio_sources.url`.
7. When a recording is a full verse but the dua is only part of it, add the label "Full verse recitation".

### Risks

- **Wrong-match risk** is the main one. Mitigation: only ship rows that are exact or reviewed by a
  person, and reject weak matches by default.
- **Hotlinking** means depending on a third party staying online, which is exactly what broke
  ihadis. Mitigations: a scheduled health-check script, and the fallback chain.
- **Permission** to use the recordings has **not been checked**. Hisn al-Muslim's terms for
  embedding its audio in another app need confirming before launch.
- **Recitation consistency:** different reciters for different duas. That's acceptable, but worth
  crediting in the UI (runtime behavior, step 5).

### Still open

1. **Who reviews the strong and weak matches**, and does a reviewed list need sign-off from
   someone with religious knowledge before release?
2. **Is about 50% audio coverage acceptable for launch,** or should more providers be searched
   (for example other adhkar apps or datasets) for the remaining duas?
3. **The Hisn al-Muslim usage terms** need checking before relying on it.
4. **Confirm the default reciter.** Is recitation ID 7 really Alafasy, and is that the default you want?

Resolved:
- Quran.com is the first provider for duas that are Quran verses, and EveryAyah is dropped.
- Partial-verse duas play the full verse, labeled "Full verse recitation".
- The reciter is a per-user setting that syncs.
