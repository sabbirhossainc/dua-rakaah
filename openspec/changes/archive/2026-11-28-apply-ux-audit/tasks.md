# Tasks

Read the relevant guides in `node_modules/next/dist/docs/` before changing code (see `AGENTS.md`).

## 1. Content and category grid

- [x] 1.1 Update category 7 `cat_name_en` to "Clothing" and dua 15 `dua_name_en` to "To get stability in religion and good results in all deeds", then run `npm run db:vacuum`; verify a row-by-row comparison with the committed database shows exactly those two values changed and zero free pages
- [x] 1.2 Add the `cloths` legacy slug (design 7) and update the category name lists in `lib/content.test.js` and `lib/precache.test.js`; verify with a unit test for the legacy lookup, `npm test`, and smoke checks that all four old `cloths` addresses (both languages, with and without `cat=7`) redirect permanently
- [x] 1.3 Replace "Subcategory: N" in `CategoryGrid` and `CategoryList` with singular and plural labels in both languages; verify with an i18n test for 1 and 7 and by reading `/duas` and `/bn/duas`
- [x] 1.4 Make the category grid one column below 640px and two from 640px; verify at 390px, 700px, 1024px and 1440px on `/` and `/duas` with no sideways scrolling

## 2. Capital and location detection

- [x] 2.1 Write `scripts/build-capitals.mjs` and the Bangla override file, and generate `data/capitals.json` (design 2); verify with a test that every zone key points to a capital, every capital has valid coordinates, a valid zone and names in both scripts, and that `Europe/London`, `Asia/Calcutta`, `America/Los_Angeles`, `Asia/Dhaka` and `UTC` give London, New Delhi, Washington, Dhaka and Dhaka
- [x] 2.2 Rewrite `resolvePlace` and `parseHome` for device-or-capital places, remove the town data and `data/bd-districts.json`; verify updated `place.test.js` and `times.test.js` pass, including that a saved town is ignored while its Hijri adjustment is kept
- [x] 2.3 Add the pure function for the position outcomes in design 1; verify a unit test covers every row of its table
- [x] 2.4 Request the position from `HomeLive` on load, and reduce `LocationCard` to name, clock and status line, with a placeholder name before the scripts run; remove the town and button labels and the unused icon, and add the new status labels in both languages; verify `npm test` and `npm run lint` pass
- [x] 2.5 Check in a browser: allow, refuse, dismiss, later visit, permission withdrawn, `/duas` showing no prompt, a non-Dhaka device zone, and "Delete my data"; verify each matches the `prayer-times` scenarios and that no request carries coordinates

## 3. Clock, prayer times and countdown

- [x] 3.1 Switch `formatTime` and `formatClock` to the 12-hour format (design 3); verify updated `dates.test.js` and `times.test.js` cover afternoon, five past midnight, and Bangla digits
- [x] 3.2 Add the pure `timeState` function and mark passed, current and upcoming entries (design 5), with the two-column grid below 640px; verify unit tests for Dhuhr, forenoon and after midnight, and that `lib/theme.test.js` passes
- [x] 3.3 Make the countdown read as one sentence to screen readers and remove the unused label; verify the accessibility tree reads the waqt name and then one "left until" sentence
- [x] 3.4 Add the one-time period announcement (design 6); verify a unit test covers a period change, the first value and a place change
- [x] 3.5 Give the countdown more line height and apply the `numeric` utility to countdown, clock and times; verify in a browser at 360px, 768px and 1440px in both languages and themes that no digit is clipped, nothing shifts as seconds change, and the prayer grid holds every name, "Now" tag and time

## 4. Time-of-day duas

- [x] 4.1 Reshape `data/home-picks.json` into the four lists, and update `buildHomePicks` and add the period function in `lib/home/picks.js`; verify `picks.test.js` checks every list has at least three existing duas with Arabic and both titles, each waqt maps to its list, and same date and period give the same duas
- [x] 4.2 Add `useDayPeriod` and show the period's three duas in `DailyDuas`, defaulting to the daytime list; verify in a browser with a faked clock that the duas change at Asr without a reload and that the served HTML shows daytime duas

## 5. Logical properties and documentation

- [x] 5.1 Convert the direction-dependent utilities and `.notice` to logical properties (design 8); verify a search of `app/` finds no `text-left`, `text-right`, `ml-`, `mr-`, `left-*` or `right-*` utilities, and the Arabic blocks, skip link, card art, memorize list and notice look unchanged
- [x] 5.2 Update `README.md` (data files, place behavior, 12-hour clock, capital data sources and licenses, the build script) and the `data/home-picks.json` note; verify the documented command runs as written and no mention of town selection remains

## 6. Integration checks

- [x] 6.1 Update the home page checks in `scripts/smoke.mjs` for no served place name, the 12-hour time pattern and the four dua lists; verify `npm run build`, `npm run check:precache` and `npm run smoke` against `npm start` all pass
- [x] 6.2 Run `npm test`, `npm run lint` and `openspec validate apply-ux-audit --strict`; verify all pass, and that the home page's script grew by less than 30 KB before compression
- [x] 6.3 Check `/` and `/bn` offline after installing the app; verify the capital or saved position, times, countdown and duas all show

## 7. Naming the position

- [x] 7.1 Restore `data/bd-districts.json`, rename the generator to `scripts/build-places.mjs` and make it also write `public/places.json` (design 9); verify a test that Sylhet, Munich and London coordinates give Sylhet / সিলেট, Bavaria and England, and a country with no states gives its country
- [x] 7.2 Save the name with the position, fetch the table only for a new or unnamed position, and show the saved name, else "My location"; verify unit tests for parsing a saved name and for when to look up, and `npm test` and `npm run lint` pass
- [x] 7.3 Keep the table out of the saved set; verify a `sw-rules` test, `npm run check:precache` and a smoke check that `/places.json` is served and not precached
- [x] 7.4 Check in a browser: named in Bangladesh and abroad in both languages, offline after moving keeps the old name, no coordinates in any request; update `README.md`

## Workflow follow-up

- Ask the Hafez to review the four dua lists, and a Bangla speaker the capital names and new labels.
- Archive the change after review.
