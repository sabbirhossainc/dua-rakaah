# Tasks

## 1. Tokens, fonts and the theme test

- [x] 1.1 Replace the colors in `app/globals.css` with the D2 tokens for both themes, expose them through `@theme`, and map the old names (`primary`, `dua-bg`, `icon-bg`, `page`, `surface`, `ink`, `line`, `muted`, `pattern`, `accent-text`, `subtle`) onto them for now; verify `npm run build` passes, every existing page renders in light and dark, and `#1fa45b` no longer appears in the built CSS.
- [x] 1.2 Add the D2 spacing, radius and shadow tokens (side margin, section padding, card gap, tile gap, card padding, heading gap, by width); verify a throwaway page at 390, 768 and 1280px shows the D2 values in DevTools' computed styles, then delete the page.
- [x] 1.3 Add `lib/theme.test.js`: the D2 contrast pairs for both themes (4.5:1 for text, 3:1 for `focus`), and the scan of `app/` for hex values and fixed palette classes outside `globals.css` and `app/components/ui/icons.js`; mark the scan as a known failure until task 7.1 removes the last raw colors; verify `npm test` runs the contrast checks green, and that setting `muted` to `#9AA1A9` in the light theme makes them fail.
- [x] 1.4 Load Fraunces, Inter, Noto Sans Bengali and Scheherazade New with `next/font/google` in `app/layout.js` with the D3 subsets and axes, apply them by `:lang()` and a `font-heading` utility, and remove the unused Inter variable and `style-Kalpurush`; verify in the browser that on `/bn/duas/sleep?cat=6` and `/duas/sleep?cat=6` each script and role uses its own font (DevTools "Rendered fonts"), and that the network panel shows no request to `fonts.googleapis.com` or `fonts.gstatic.com`.
- [x] 1.5 Set the D3 type scale as utilities, and raise the Arabic line height to 2.0 in `ARABIC_LINE_RATIO`, the inline script and the card classes; update `lib/preferences.test.js` to expect 56px at the medium size; verify `npm test` passes, and in the browser dua 123 at "xlarge" shows no vowel mark touching the line above or below.
- [x] 1.6 Reset the breakpoints in `@theme` to `sm` 480, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 (D5); verify `npm run build` passes (the old layout may look off until group 3 replaces it).

## 2. Shared component library (`app/components/ui/`)

- [x] 2.1 Add the icon set `icons.js`, the app's mark (`public/icons/dua-logo.svg`, the gold eight-pointed star on emerald, also the favicon) and the wordmark (D12); verify the favicon loads from the app's origin, and the icons follow both themes without `dark:invert`.
- [x] 2.2 Add `Ornament` (`rule`, `star`, `lattice`) and redraw `public/images/home-pattern.svg` as the star lattice at the same path; verify `npm run check:precache` still finds the pattern after a build.
- [x] 2.3 Add `Button` (`primary`, `gold`, `outline`, `ghost`, `danger`; `md` 44px and `lg` 52px; link or button; optional icon), `Tag` (`tint`, `gold`, `sand`, `text`) and `IconCircle` (40, 48, 56px; `tint` or `gold-tint`); verify on a throwaway page in both themes that every variant meets the D2 contrast pairs and shows a 3:1 focus ring, including on an emerald background.
- [x] 2.4 Add `Card` (`surface`, `tint`, `sand`, `gold-tint`, `emerald` with the lattice; `tag`, `action` and `art` slots), `Tile` and `ListCard` (with the `current` state, marked by `aria-current` and a visible marker); verify on the throwaway page that radii, borders and padding match D2 at 390 and 1280px, and that `ListCard` and `Tile` targets are at least 44px tall.
- [x] 2.5 Add `Section` (`plain`, `sand`, `tint`, `emerald` bands with the container and section padding), `SectionHeading` (Fraunces `h2` with `Ornament rule`, `start` or `center`, optional description and action) and `PageIntro` (the page's `h1`, ornament, lead, optional action); verify on the throwaway page that Bangla headings switch to Noto Sans Bengali 600, and the spacing between heading and content matches D2.
- [x] 2.6 Add `Sheet` (native `<dialog>` with `showModal()`: bottom below 768px, side from 768px, focus returned to the opener by `Sheet` itself, no slide with reduced motion), `SegmentedControl` (native radios), `Select`, `Checklist`, `Steps`, `EmptyState` and `Notice`; verify in the browser that Tab stays inside an open sheet, Escape and the close button close it and focus returns to the opener, arrow keys move within a segmented control, and with reduced motion the sheet appears without sliding.
- [x] 2.7 Delete the throwaway page, and record in `design.md` D4 any variant or prop that changed while building; verify the D4 table matches `app/components/ui/`.

## 3. Shell: header, bottom bar, footer, settings

- [x] 3.1 Add `lib/nav.js` (`navEntries(pathname)`: the five entries, their localized hrefs and the current one) with `lib/nav.test.js`; verify the tests cover `/`, `/bn`, `/duas/sleep?cat=6`, `/bn/bookmark`, `/memorize`, `/account` (no current entry) and `/support`.
- [x] 3.2 Add the new labels to `lib/i18n.js` for the navigation, skip link, header, footer (with the Arabic line's meaning), Settings panel and page intros, in both languages; verify `i18n.test.js` passes with every key in both languages.
- [x] 3.3 Add `SiteHeader` (mark and wordmark, the entries as text links with the gold underline from 1024px, Settings button, `AccountControl`) and `BottomNav` (the entries with icons and labels below 1024px, the `tint` current marker), both from `navEntries`; verify every "Navigation at every width", "Current page marked" and "Labelled entries in the page language" scenario at 320, 390, 768 and 1280px, and that only one navigation landmark is exposed at each width.
- [x] 3.4 Add `SettingsPanel` in a `Sheet` (language, appearance and Arabic size as `SegmentedControl`, reciter as `Select`, then "Your data" and "Support us" `ListCard`s; content mounts on first open) opened by the Settings entries; verify every scenario of "The Settings panel opens at every width" and "The Settings panel changes appearance and text size", and that the reciter list is fetched only after the first open (network panel).
- [x] 3.5 Add `SkipLink` and `SiteFooter` (emerald `Section` with the lattice, wordmark, the Arabic line and its meaning, links to Support and Your data); move `AccountControl`'s confirmation onto `Sheet` and drop its portal; verify the first Tab on `/bn` focuses a Bangla skip link that moves focus to `#main`, the footer scenario holds in Bangla, and sign-in, sign-out and the unsynced-changes warning still work.
- [x] 3.6 Rebuild `app/layout.js` on D5 and D6 (document scroll, sticky header, `<main id="main">`, safe-area padding, `viewport-fit=cover`) and delete `LeftBar`, `RightBar`, `Topbar`, `MenuCom`, `Search`, `AccountLink` and the `:has([data-home])` rules; verify `npm run lint` and `npm run build` pass, and in the browser no page scrolls sideways at 320px and the footer scrolls clear of the bottom bar.
- [x] 3.7 Rebuild `UpdateBar` and the "data deleted" notice on `Notice`, placed above the bottom bar on phones; verify by triggering the update prompt on a production build that it is readable in both themes and doesn't cover the navigation.
- [x] 3.8 Extend `scripts/smoke.mjs`: the five navigation entries with localized hrefs on `/` and `/bn`; no `href=""` or `href="#"` on any page; no `/rakaah`, `/alldua`, `/dua-info` or `/books` link; no "Duas Page"; exactly one `<h1>` per page; the skip link to `#main`; the footer present; no third-party font URL; verify `npm start` then `npm run smoke` passes.

## 4. Duas pages

- [x] 4.1 Replace `Category` with `CategoryList` (server HTML of `ListCard`s in `cat_id` order with the same counts): a sticky column from 1280px, and inside a `Sheet` opened by the `PageIntro` "Categories" button below that, closed by choosing a category; delete the category filter input; verify every "Category list beside the content" scenario at 390, 768 and 1280px in both languages.
- [x] 4.2 Add the `CurrentCategory` client island that marks the current `ListCard` and scrolls it into view in the column; verify on `/duas/sleep?cat=6` and on the last category's page at 1280px, and that `/duas` marks none.
- [x] 4.3 Rebuild `CategoryGrid` on `Tile` (image in an `IconCircle`, name, "N duas" `Tag`, `data-category-card` kept; 2, 3 and 5 across) and give `/duas` and `/bn/duas` their `PageIntro`; verify the smoke grid checks still pass and the grid reflows at 390, 768 and 1280px.
- [x] 4.4 Rebuild `DuaCard` and `SubcategorySection` on D8 (`Card surface`, category `Tag`, quiet labels, `Ornament star` between parts, `data-dua-part` on each part, no `text-justify`, `scroll-margin-top` for the header, `SectionHeading` for subcategories, `h1` category, `h2` subcategory, `h3` title) and give category pages their `PageIntro` with the "N duas in M sections" lead; switch the smoke part counts to `data-dua-part`; verify `npm run smoke` passes, and in the browser `/duas/sleep?cat=6#dua-200` lands below the header at 390 and 1440px.
- [x] 4.5 Reduce `DuaIcons` to audio, bookmark and memorize, and rebuild `DuaAudio`, `BookmarkButton`, `MemorizeButton` and `MemorizePanel` on `Button` (`outline` and `ghost`), `Tag` and `SegmentedControl`, keeping their behavior; verify bookmark, memorize (inline panel and Escape) and audio play and pause still work, and each target is at least 44 by 44px at 360px.

## 5. Other pages

- [x] 5.1 Rebuild `/bookmark` and `/memorize` and their Bangla versions (`BookmarkPage`, `BookmarkList`, `MemorizePage`, `MemorizeList`) as `PageIntro` plus `ListCard` rows with a trailing `Tag`, and an `EmptyState` with "Browse duas" when empty, keeping `noindex`; verify in both languages and themes that saved duas and memorize progress list and link as before, offline included.
- [x] 5.2 Rebuild `/account` and `/bn/account` (`AccountPage`, `DeleteData`) as `PageIntro` plus `Card`s with a `danger` `Button` for "Delete my data"; verify that sign-in state and deletion work as before in both languages.
- [x] 5.3 Rebuild `/support` as `PageIntro` plus an `emerald` `Card`, and `/offline` as an `EmptyState` per language with "Go to duas"; verify both at 390 and 1280px in both themes, and that the offline page still shows both languages.
- [x] 5.4 Rebuild `not-found` and `error` as `EmptyState`s (404: "Go home" and "Browse duas"; error: "Try again" calling `reset`, and "Go home"), with English and Bangla copy chosen by the path prefix and added to `lib/i18n.js`; verify `/no-such-page` returns 404 with links to `/` and `/duas`, `/bn/no-such-page` shows Bangla with links to `/bn` and `/bn/duas`, and a forced render error offers a working "Try again"; add the 404 checks to `scripts/smoke.mjs`.

## 6. Home page

- [x] 6.1 Add `lib/prayer/band.js` (`bandPeriod(waqt)`: neutral, fajr, forenoon, dhuhr, asr, maghrib, isha) with `lib/prayer/band.test.js`; verify the tests cover null, each waqt and the gap between sunrise and Dhuhr.
- [x] 6.2 Add the D9 band tokens for both themes to `globals.css` and the band pairs to `lib/theme.test.js`; verify `npm test` passes, adjusting any value that fails 4.5:1.
- [x] 6.3 Wrap the four live cards in `HomeLive` in the `data-home-band` element with `data-waqt`, lay them out as D9 at one column, `lg` and `xl`, rebuild their controls on `Button`, `Select`, `SegmentedControl` and `Tag` on a translucent `surface`, and set the countdown in the 60px Fraunces numerals; keep every `data-home-card` and heading; verify the smoke card-order check passes, and the band reads correctly at 320, 390, 1024 and 1440px.
- [x] 6.4 Add the band's color transition (`@property` variables, 1.2 seconds, none with reduced motion) and the lattice over the Isha band; verify in the browser that the band settles once on load, changes from Asr to Maghrib with the page open (clock overridden), and appears without a transition with reduced motion on.
- [x] 6.5 Rebuild the sections below the band on D9: today's duas as `Card` feature cards (`tint`, `gold-tint`, `sand` in turn, category `Tag`, "Read dua" `Button outline`, `art` star, `data-home-dua` kept), categories through the shared `CategoryGrid`, hadith as `Card sand`, donation as `Card emerald` with `Button gold`, under `SectionHeading`s with the D9 bands; make the home `h1` the visually hidden page heading; verify the home smoke checks pass, the document order is the spec order, and the layout matches D9 at 390 and 1280px.
- [x] 6.6 Add smoke checks that the band is served with `data-waqt="neutral"` and holds the first four cards; verify `npm run smoke` passes.

## 7. Clean-up and integration

- [x] 7.1 Remove the old token aliases, the `home-*` classes, every remaining raw color in `app/`, and the `public/icons/*.svg` files nothing references; lift the known-failure mark from the raw-color scan; verify `npm test`, `npm run lint`, `npm run build` and `npm run check:precache` pass.
- [x] 7.2 Measure the `.woff2` total in `.next/static/media` after the build and record it in `design.md` (D3 and the risk entry); if it is over about 900 KB, apply the fallback the risk entry names; verify the recorded number matches the build output.
- [x] 7.3 Consistency and visual pass in the browser:
  - Widths: 320, 360, 390, 768, 1024, 1280, 1440 and 2560px.
  - Variations: light and dark, English and Bangla.
  - Pages: every page in D7, and a category page at the "xlarge" Arabic size.
  - Prayer band: the clock set to each period.

  Verify there is no sideways scrolling, nothing hidden under the bars, and visible focus on every control. Also verify
  that each shared component (button, tag, card, tile, list card, section heading, page intro, empty state) looks the
  same on every page it appears on.
- [x] 7.4 Test offline on a production build (`npm start -- -p 3100`): open `/duas`, wait for the install, stop the server, then open `/bn/duas/sleep?cat=6`, `/` and `/bn`; verify every page is drawn in the app's fonts and the "Pages look the same offline" and "Fonts from the app's own origin" scenarios hold.
- [x] 7.5 Update `README.md` (the style guide's palette and fonts with their licenses, the component library, the navigation) and `plan.md` ("Not done yet": search, copy, share, report and the hidden links are removed rather than placeholders; the UI is no longer modeled on duaruqyah.com; the narrow-screen settings gap is closed); verify the text matches the code.
- [x] 7.6 Run `npm run lint`, `npm test`, `npm run build`, `npm run check:precache` and `npm run smoke`; verify all pass.
- [ ] 7.7 Have a Bangla speaker review the new Bangla labels and the Bangla typeface on a real phone, and the Hafez review the footer's Arabic line and its meanings; verify their decisions are recorded in this file or in `plan.md`.

## Workflow follow-up

- Archive the change once the reviews in 7.7 are done.
- Phase 6 (Raka'ah) adds its navigation entry, uses `Steps` for the prayer positions, and decides how six entries fit
  the bottom bar.
