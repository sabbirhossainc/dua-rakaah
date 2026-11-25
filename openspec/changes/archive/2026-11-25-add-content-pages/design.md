# Design

## Context

See `proposal.md` for why. The facts below were checked against the code and `data/dua_main.sqlite` on 2026-11-25,
and they shape the approach:

- **The app shell.** `app/layout.js` is the only root layout. It renders `LeftBar`, `Topbar` and `RightBar` around
  every page. `app/duas/layout.js` adds the `Category` sidebar. Everything is a Server Component except `MenuCom`.
  `next.config.mjs` is empty, so Cache Components is off and the classic static/dynamic rules apply.
- **Multi-part duas.** `dua` has 190 rows but only 176 distinct `id` values. Eight duas (ids 30, 32, 40, 123, 126,
  127, 200 and 205) span 2 to 5 rows each. In every group, the first row in stored (`rowid`) order is the only one
  with `dua_name_*`, and the reference is usually on the last row. No column records the part order, so **`rowid`
  order is the only part order there is**. `getDuasByCategory()` orders by `subcat_id, dua_id` with no
  tie-breaker, and `getDua()` returns only the first row.
- **Stale counts.** `category.no_of_dua` counts rows, and is wrong for category 5 (53 stored, 52 rows, 45 duas).
- **Missing values** are real SQL `NULL`s (for example, 65 `top_en`), never the string "null". Ten `dua_arabic` values
  and eight `refference_en` values contain line breaks.
- **Next 16 rules** (from `node_modules/next/dist/docs`): `params` and `searchParams` are Promises, and reading
  `searchParams` makes the page render at request time. Files read with `fs` or a native driver aren't traced
  automatically, so they need `outputFileTracingIncludes` (route-glob keys, project-relative values). A client
  component that calls `useSearchParams()` on a prerendered route needs a `<Suspense>` boundary.
- **No test runner** is set up. Node is 24.

## Goals / Non-Goals

**Goals:**
- Keep the existing `?cat=N` URL shape as the address of a category, as you decided, and keep old sidebar links working.
- Hold all content shaping (grouping parts, choosing language columns, slugs, parsing `cat`) in one pure module
  that can be unit-tested without a database or Next.js.
- Keep English and Bangla as two route trees that share every component, with the language passed in explicitly.

**Non-Goals:**
- Prerendering category pages. That isn't possible while `cat` decides the page (see D1).
- Translating the global chrome (`LeftBar`, `Topbar`, `MenuCom`, the other Settings panels) or the not-found page.
- Arabic font selection, search, `DuaIcons` behavior and audio. These are later phases.
- Changing any content value or adding columns to the content DB.

## Decisions

### D1. Category pages render per request

The page awaits `searchParams.cat`, so Next.js renders it at request time. `generateStaticParams()` (plan item 1.1)
is left out because it can't prerender a page that depends on the query string. The landing pages (`/duas`,
`/bn/duas`) don't read `searchParams`, so they stay prerendered.

- *Alternative: resolve the category from the slug and ignore `cat`.* The URLs would look the same and the pages
  would be static, but `cat` would be decorative. That contradicts the decision that `cat` picks the page, so it
  was rejected. It stays the easiest way back to static pages if phase 2 needs one (see Risks).
- *Alternative: an ID in the path* (`/duas/5-morning-evening`). This was offered and declined.

### D2. Two route trees, one root layout

```
app/
  layout.js                  root layout (unchanged structure, html lang="en")
  duas/layout.js             <ContentFrame lang="en">  (Category sidebar + content)
  duas/page.js               <CategoryGrid lang="en" />
  duas/[slug]/page.js        <CategoryPage lang="en" params searchParams />
  bn/duas/layout.js          <ContentFrame lang="bn">  (wrapper carries lang="bn")
  bn/duas/page.js            <CategoryGrid lang="bn" />
  bn/duas/[slug]/page.js     <CategoryPage lang="bn" params searchParams />
  components/content/        ContentFrame, CategoryGrid, CategoryPage, SubcategorySection, DuaCard
```

Each route file is a few lines that pass `lang` to a shared component. `ContentFrame` replaces the body of today's
`app/duas/layout.js` (and drops its unused `blogs` array). It renders `Category` with `lang` and sets `lang="bn"`
on the Bangla content wrapper, so screen readers and fonts treat it as Bangla.

- *Alternative: `app/[lang]/...` with `next.config` rewrites* from unprefixed paths to `/en/...`. That needs a
  regex that excludes `bn`, `_next`, `api` and static folders, plus a redirect so `/en/...` doesn't become a second
  copy of every URL. It's more moving parts for two languages.
- *Alternative: two root layouts in route groups,* which would allow `<html lang="bn">`. Switching language would
  then force a full page load, and the app would need the experimental `global-not-found.js`, because there would
  be no single root layout for unmatched URLs.

### D3. A pure content module

`lib/content.js` imports neither the DB nor `server-only`, so `node --test` can load it:

| Function | Behavior |
|---|---|
| `LANGS`, `langPrefix(lang)` | `"en"` maps to `""`, and `"bn"` maps to `"/bn"` |
| `pick(row, field, lang)` | `row[field + "_" + lang]`, and `null` for `NULL` or whitespace. Never falls back to the other language. |
| `categorySlug(nameEn)` | Lowercase, strip `'` and `’`, turn each run of `[^a-z0-9]` into `-`, and trim hyphens |
| `categoryHref(cat, lang)` | `` `${prefix}/duas/${slug}?cat=${cat_id}` `` |
| `parseCat(value)` | Returns a positive integer for a single `^[1-9]\d*$` string. Returns `null` for an array, an empty value or anything else. |
| `groupDuas(rows, lang)` | Groups rows by `id`, in first-seen order. The title comes from the part with a name. Each part keeps `top, arabic, transliteration, translation, bottom, reference`. |
| `groupBySubcategory(subcats, duas)` | Builds `[{ subcat, duas }]` in `subcat_id` order |
| `switchLanguageHref(pathname, search, hash, target)` | Adds or removes the `/bn` prefix on `/duas...`. Any other path goes to `/bn/duas` (for Bangla) or stays as it is (for English). |

`lib/db.js` changes:
- `getDuasByCategory()` orders by `subcat_id, dua_id, rowid`. `rowid` keeps parts in stored order.
- `getCategories()` adds computed `dua_count` (`COUNT(DISTINCT dua.id)`) and `subcat_count` through a joined query.
  The UI uses these counts, not `no_of_dua` or `no_of_subcat`.
- `getDua(id)` returns all the parts of a dua, ordered by `rowid`, so it agrees with the grouping.
- New `getCategoryBySlug(slug)` handles the redirect for URLs without `cat`. It compares `categorySlug(cat_name_en)`
  across the 10 rows.

### D4. Resolving and canonicalizing the URL in `CategoryPage`

```
cat = parseCat(searchParams.cat)
if searchParams.cat is absent:
    c = getCategoryBySlug(decodeURIComponent(slug))   -> permanentRedirect(categoryHref(c, lang)) | notFound()
if cat is null or getCategory(cat) is null:  notFound()
if decodeURIComponent(slug) != categorySlug(c.cat_name_en):  permanentRedirect(categoryHref(c, lang))
render
```

`permanentRedirect()` sends a 308, and `notFound()` renders `app/not-found.js` with a 404. The redirect keeps
only `cat`, which is the only query parameter the page uses. `generateMetadata()` repeats the same lookup, which is
cheap because the statements are prepared and synchronous, so it can set the title from the localized category
name. The page builds its sections from `getSubcategories()`, `getDuasByCategory()` and the two grouping helpers.

### D5. Dua card rendering

`DuaCard` renders `id="dua-<id>"`, the title, then each part's fields in the order the spec gives. Each field is
skipped when `pick()` returns `null`. Text blocks use `whitespace-pre-line`, so stored line breaks show. The Arabic
block uses `lang="ar" dir="rtl"` with right-aligned text and the stored `dua_arabic` value as is. The
`<audio>` element is removed. `DuaIcons` stays as it is. `SubcategorySection` renders
`id="subcat-<subcat_id>"` and replaces the "Section: Sections" bar, keeping its styling.

### D6. UI labels

`lib/i18n.js` exports `t(lang, key)` over a small dictionary for these keys: `categories`, `searchCategories`,
`subcategory`, `duas`, `reference`, `transliteration` and `translation`. The Bangla values are
"ক্যাটাগরি", "ক্যাটাগরি খুঁজুন", "সাবক্যাটাগরি", "দোয়া", "রেফারেন্স", "উচ্চারণ" and "অনুবাদ". Field labels are shown only
for transliteration, translation and reference, which matches today's single "Reference:" label. The intro,
Arabic and closing text have no label.

### D7. Language switch

`RightBar` stays a Server Component. Its two buttons are replaced by a client `LanguageToggle` that reads
`usePathname()` and `useSearchParams()`, adds `window.location.hash` when clicked, and navigates to
`switchLanguageHref(...)`. It shows the active button from the path prefix. `RightBar` wraps it in `<Suspense>`
with a static fallback that has the same markup, because `/`, `/support` and the landing pages are prerendered. The
panel is visible only at the `2xl` breakpoint (1536px and wider), as it is today.

### D8. Compaction script

`scripts/vacuum-content-db.mjs` (`npm run db:vacuum`):

1. Open the DB read-only and run `VACUUM INTO` to a temporary file next to it.
2. Compare the two files. The `sqlite_master` SQL must be equal. For each table, every row read as
   `SELECT * ... ORDER BY rowid` must be equal, which compares values and order but not `rowid` numbers, because
   SQLite may renumber them in tables with no `INTEGER PRIMARY KEY`. `freelist_count` must be 0 in the new file.
3. Only if every check passes, replace the original file. Otherwise delete the temp file and exit non-zero.

The dev server holds the file open, and on Windows the replace fails while it does. The script reports that and
leaves the original in place. The compacted file is committed in place of the old one.

### D9. Deployment trace

`next.config.mjs` gets `outputFileTracingIncludes: { '/duas/**': ['./data/dua_main.sqlite'], '/bn/duas/**':
['./data/dua_main.sqlite'] }`. Explicit keys are used rather than `'/*'`, because it isn't clear whether `*`
matches nested routes in picomatch. The check is that `.next/server/app/duas/[slug]/page.js.nft.json` and its
Bangla twin list the file.

### D10. Rendering-neutral cleanups

- Tailwind classes with no definition produce no CSS today, so **removing** them leaves the rendering unchanged:
  `xs:*`, `3xl:*`, `sm-max:*`, `md-max:*`, `lg-min:*`, `xl-min:*`, `2xl-min:*`, `text-mss`, `*mute-grey*` and
  `dark:*-dark-*`. The literal `false` and `undefined` class tokens go too. Mapping them to v4 variants, such as
  `max-sm:`, would switch on styles that have never applied, so that's left to a separate design pass.
  The `dark:` variant itself is valid and stays (for example `dark:invert`).
- `LeftBar.js` renames its export to `LeftBar`. `Category` uses `id="cat-<cat_id>"`.
- `app/layout.js` drops `className="p-10"` and the "Generated by Sabbir" text, and points `icons.icon` at
  `/icons/dua-logo.svg`.

### D12. No loading.js above the category pages

A `loading.js` fallback starts streaming, and streaming fixes the response status at 200, so `notFound()` and
`permanentRedirect()` could not return 404 or 308 (confirmed by the smoke run, and by the Next docs on status codes).
`app/loading.js` and `app/duas/loading.js` are therefore deleted. The pages read local SQLite synchronously, so
the skeletons would only flash for milliseconds. The cost is that client-side navigation no longer shows the
spinner instantly. This was decided with the user during apply.

- *Alternatives:* keep the skeletons and accept status 200 with a noindex tag (rejected: the specs require real
  statuses), or enforce the URL rules in `proxy.js` (rejected: the rules would live in two places).

### D11. Verification tooling

- `npm test` runs `node --test`, which covers `lib/content.test.js`. Node 24 detects the ES module syntax, so no
  `"type"` change is needed.
- `scripts/smoke.mjs` (`npm run smoke`, `BASE_URL` defaulting to `http://localhost:3000`) requests the URLs from
  the specs with `redirect: "manual"` and checks the status codes, the `Location` headers and a few strings in the
  HTML. It runs against `npm run build && npm start`.

## Risks / Trade-offs

- **Phase 2 has to precache pages that render per request.** → Serwist can precache them as extra entries, revised
  per build, and the 20 category URLs (10 categories × 2 languages) are known when the app builds. The rule that
  matches cached URLs must not ignore the `cat` query parameter. `plan.md`'s "SSG by default" decision and its
  phase 2 and item 1.9 text should be updated when this change is archived. If request-time rendering becomes a
  problem, D1's first alternative restores static pages and keeps the URLs.
- **The app needs a Node server.** `output: 'export'` and static-only hosting are no longer possible. → Note this in the README.
- **Part order depends on `rowid`.** → D8's check compares the order of rows, so a compaction that reorders them is
  refused. A future content DB import must keep rows in order, or add an explicit part column.
- **Next.js may decode slugs differently in `params`.** For example, `&` may arrive as `%26`. → D4 decodes the slug
  before comparing it, and the smoke test covers `/duas/morning-&-evening?cat=5` and its percent-encoded form.
- **Bangla pages that call `notFound()` show the English 404 page.** → This is accepted for now, because the global
  chrome isn't translated yet.
- **Machine-chosen Bangla labels.** → Listed in D6 for review by a Bangla speaker. Changing them is a one-line edit.

## Migration Plan

There's no data migration. Old sidebar links (`/duas/morning-&-evening?cat=5`) redirect to the new slugs. To roll
back, revert the commit. The old database file stays in git history.

## Open Questions

- Do the Bangla labels in D6 read naturally? They can be changed without touching the specs or the tasks.
