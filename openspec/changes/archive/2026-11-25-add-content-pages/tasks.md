# Tasks

## 1. Content module and data access

- [x] 1.1 Add `"test": "node --test"` to `package.json` and create `lib/content.js` with `LANGS`, `langPrefix`, `pick`, `categorySlug`, `categoryHref` and `parseCat` (design D3). Add `lib/content.test.js` covering: the slugs for all 10 category names (for example `duas-importance`, `morning-evening`, `adhaan-iqamah`), `parseCat` for `"5"`, `"0"`, `"abc"`, `"5.0"`, `""`, `undefined` and `["6","5"]`, and `pick` returning `null` for `NULL` and whitespace without falling back to the other language. Verify with `npm test`.
- [x] 1.2 Add `groupDuas` and `groupBySubcategory` to `lib/content.js`, with tests using fixture rows shaped like ids 4 (one part), 40 (two parts, reference on the second) and 123 (five parts, title on the first). Check that parts keep input order, the title comes from the named part, and there's one group per `id`. Verify with `npm test`.
- [x] 1.3 Add `switchLanguageHref` to `lib/content.js`, with tests for `/duas/sleep?cat=6#dua-200` to Bangla and back, `/duas` to `/bn/duas`, and `/support` to Bangla (giving `/bn/duas`). Verify with `npm test`.
- [x] 1.4 Update `lib/db.js`: order `getDuasByCategory` by `subcat_id, dua_id, rowid`; add `dua_count` and `subcat_count` to `getCategories()`; make `getDua(id)` return all parts ordered by `rowid`; add `getCategoryBySlug(slug)`. Verify with a one-off `node` script run against the DB (not committed) that the counts are 21, 13, 29, 14, 45, 31, 8, 6, 2, 7 and add up to 176, and that `getDuasByCategory(5)` returns dua 123's five rows in the same order as `SELECT rowid ... WHERE id = 123 ORDER BY rowid`.

## 2. UI labels and shared content components

- [x] 2.1 Create `lib/i18n.js` with `t(lang, key)` and the English and Bangla values in design D6. Add a test that every key has a non-empty value in both languages. Verify with `npm test`.
- [x] 2.2 Create `app/components/content/DuaCard.js` and `SubcategorySection.js` (design D5): the field order from the `dua-display` spec, `whitespace-pre-line`, an Arabic block with `lang="ar" dir="rtl"`, IDs `dua-<id>` and `subcat-<subcat_id>`, and no `<audio>`. Verify with `npm run lint`. The rendering is checked in 3.4.
- [x] 2.3 Make `Category.js` take `lang`: it uses `categoryHref`, localized names and labels, `dua_count` and `subcat_count`, and `id="cat-<cat_id>"`. Create `ContentFrame.js` from the body of today's `app/duas/layout.js`, dropping the `blogs` array and setting `lang` on the content wrapper. Verify with `npm run lint`.
- [x] 2.4 Create `CategoryGrid.js`: 10 cards with icon, localized name, subcategory and dua counts, each linking with `categoryHref`. Verify with `npm run lint`. The rendering is checked in 3.4.

## 3. Routes

- [x] 3.1 Create `app/components/content/CategoryPage.js` with the resolution flow from design D4 (`parseCat`, `getCategoryBySlug`, `permanentRedirect`, `notFound`) and a `generateCategoryMetadata` helper that sets the localized title. Verify with `npm run lint`.
- [x] 3.2 Rewrite `app/duas/layout.js` and `app/duas/page.js` as thin wrappers (`ContentFrame` and `CategoryGrid` with `lang="en"`), and add `app/duas/[slug]/page.js`, which awaits `params` and `searchParams` and exports `generateMetadata`. Verify that `npm run build` passes and lists `/duas` as static and `/duas/[slug]` as dynamic.
- [x] 3.3 Add `app/bn/duas/layout.js`, `page.js` and `[slug]/page.js`, mirroring 3.2 with `lang="bn"`. Verify that `npm run build` lists `/bn/duas` as static and `/bn/duas/[slug]` as dynamic.
- [x] 3.4 Add `scripts/smoke.mjs` and `"smoke"` to `package.json` (design D11). Cover every scenario URL in the `dua-categories`, `dua-display` and `content-localization` specs: 200 pages, 308 `Location` values (including `morning-&-evening` and its `%26` form), 404s for `cat=99`, `cat=abc`, a repeated `cat` and an unknown slug, 10 grid cards, 45 cards on cat 5, one `dua-123` card with five parts, `lang="ar"` and `dir="rtl"` on the Arabic, no `<audio>`, no "Section: Sections", no "null" or "undefined" text, unique `id` attributes, the Bangla title and reference for dua 4, `lang="bn"` on Bangla pages, and the document title "Sleep | All Duas Collection". Verify that `npm run build && npm start` followed by `npm run smoke` passes.

## 4. Language switch

- [x] 4.1 Create the client component `app/components/LanguageToggle.js` (design D7), using `switchLanguageHref` and the active state from the path prefix, and use it in `RightBar.js` inside `<Suspense>` with a fallback that has the same markup. Verify that `npm run build` passes with no missing-Suspense error, and that in a browser window at least 1536px wide, "à¦¬à¦¾à¦‚à¦²à¦¾" on `/duas/sleep?cat=6#dua-200` goes to `/bn/duas/sleep?cat=6#dua-200` and "English" goes back, and that "à¦¬à¦¾à¦‚à¦²à¦¾" on `/support` goes to `/bn/duas`.

## 5. Shell cleanups

- [x] 5.1 Rename the `LeftBar.js` export to `LeftBar` and update its import in `app/layout.js`. In `app/layout.js`, remove `className="p-10"` and the `false` class token, replace the description with one about the dua collection, and set the favicon to `/icons/dua-logo.svg`. Verify with `npm run lint`, then add smoke checks for the `site-shell` spec (a meta description without "Generated by", a same-origin favicon, no `duaruqyah.com` in the HTML, and `<html>` without `p-10`) and run `npm run smoke`.
- [x] 5.2 Remove the undefined Tailwind classes listed in design D10 from every file under `app/`, without mapping any of them to other variants. Verify that a search with `grep -rEn "(^|[\" ])(xs|3xl|sm-max|md-max|lg-min|xl-min|2xl-min):|text-mss|mute-grey|-dark-" app` finds nothing, that `npm run build` passes, and that `/duas` and `/duas/sleep?cat=6` look the same before and after at 1536px.

## 6. Content database and deployment

- [x] 6.1 Add `scripts/vacuum-content-db.mjs` and `"db:vacuum"` to `package.json` (design D8). Verify that it refuses a deliberately changed copy: run it on a scratch copy where one `dua` value was edited after the `VACUUM INTO` step (or with a test flag that injects the difference), and check that it exits non-zero and leaves the original file untouched.
- [x] 6.2 With the dev server stopped, run `npm run db:vacuum` on `data/dua_main.sqlite`. Verify that the script reports every check passing, that the file is under 1 MB with `PRAGMA freelist_count` = 0, and that `npm test` and `npm run smoke` (after a rebuild) still pass.
- [x] 6.3 Add `outputFileTracingIncludes` to `next.config.mjs` (design D9). Verify that after `npm run build`, `.next/server/app/duas/[slug]/page.js.nft.json` and `.next/server/app/bn/duas/[slug]/page.js.nft.json` both list `data/dua_main.sqlite`, and that `npm start` followed by `npm run smoke` passes.

## 7. Documentation and integration

- [x] 7.1 Rewrite `README.md`: what the app is, the one-app layout (`app/`, `lib/`, `data/`, `public/`), `npm install`, `npm run dev`, `npm test`, `npm run smoke`, `npm run db:vacuum`, the English and Bangla URL scheme, and the note that hosting needs a Node server because category pages render per request. Verify that every command in it runs as written from a clean checkout.
- [x] 7.2 Final integration check: verify that `npm run lint`, `npm test`, `npm run build`, and then `npm start` with `npm run smoke` all pass, and that the browser console shows no errors on `/duas`, `/duas/morning-evening?cat=5`, `/bn/duas/sleep?cat=6` and `/support`.

## Workflow follow-up

- Update `plan.md` after this change: the category URL and `/duas` decisions (open questions 1 and 2), the move
  away from "SSG by default" for category pages, and the effect on phase 2 precaching (design, Risks).
- Have a Bangla speaker review the labels in design D6.
- Archive the change after review.
