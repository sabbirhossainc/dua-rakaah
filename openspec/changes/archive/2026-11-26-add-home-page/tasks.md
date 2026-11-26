# Tasks

No credentials or outside services are needed. Before writing page code, read the relevant guides in
`node_modules/next/dist/docs/` (pages, metadata, client components), as `AGENTS.md` asks.

## 1. Prayer time logic

- [x] 1.1 Add `adhan` (4.4.6) as a dependency; verify `npm install` succeeds and `import { PrayerTimes, CalculationMethod, Madhab } from "adhan"` works in a Node test on Node 24.
- [x] 1.2 Add `lib/prayer/times.js` (D1, D3, D4): the day's times for a place and a date in its time zone with Karachi and Hanafi Asr, the neighbouring days' Fajr and Isha, and an invalid result when a time cannot be computed; verify unit tests for Dhaka on 2026-11-26 against adhan's own output, a date-line case where the place's date differs from UTC, and a high-latitude position that returns invalid.
- [x] 1.3 Add `lib/prayer/waqt.js` (D3): current and next waqt, start, end, progress and time left; verify unit tests for every scenario of "Current waqt" and "Time left" in the `prayer-times` spec, including Isha after midnight, the sunrise-to-Dhuhr gap, the instant a waqt starts, and the day change.
- [x] 1.4 Add `data/bd-districts.json` (D6) with the coordinates' source and license noted, and credit it in `README.md`; verify a unit test for 64 unique ids, both names, Dhaka present as the default, and coordinates inside Bangladesh's bounds, and have a person check a sample of 10 towns on a map.
- [x] 1.5 Add `lib/prayer/place.js` (D5): read, validate and write `dua-home`, round device coordinates to 3 decimals, default to Dhaka and offset 0; verify unit tests for a malformed value, an unknown town id, an offset out of range, and rounding.
- [x] 1.6 Make `deleteLocal` also remove `dua-home` (D5); verify `lib/local/delete.test.js` (or a new test) shows the key removed after a deletion and after a `410`-driven deletion, and no failure when `localStorage` does not exist.

  - Map check (2026-11-26): done by Claude at the owner's request, in place of a person, on OpenStreetMap: Dhaka,
    Chattogram, Sylhet, Rajshahi, Khulna, Barishal, Rangpur, Cox's Bazar, Noakhali (Maijdi) and Jhalokati. Nine were
    on their town centres. Cox's Bazar was about 3 km east, so its coordinates now come from GeoNames record 11287013
    (the municipality) instead of 1336134, and were checked again.

## 2. Dates and picks

- [x] 2.1 Add `lib/prayer/dates.js` (D7): weekday, Gregorian and Hijri (Umm al-Qura) strings per language with the offset; verify unit tests that 2026-11-26 gives 16 Jumada II 1448 in English, the Bangla string uses Bangla digits ("১৬", "১৪৪৮"), an offset of −1 gives the 15th, and the weekday is not shifted.
- [x] 2.2 Add `data/home-picks.json` and its loader (D8): choose short, clearly referenced duas and hadith quotes from the content database, and drop quotes without Bangla text for `/bn`; verify a unit test that every listed dua id and part exists and has English text in its field, and the day-index function wraps and is the same for every reader on a date.
- [x] 2.3 Add the new English and Bangla labels to `lib/i18n.js` (card titles, prayer names, "Use my location" and its error messages, the guide note, "no obligatory prayer is due", donation text, the `/bn` title); verify `i18n.test.js` passes with every key present in both languages.

## 3. Home page

- [x] 3.1 Add `HomePage({ lang })` as a server component with `app/page.js` and the new `app/bn/page.js`, rendering the duas, categories (`CategoryGrid` unchanged), hadith and donation cards and the placeholders for the live cards in the spec's order (D11, D12); verify `/` and `/bn` build as static pages and their served HTML matches "Useful before scripts run" and "Home page metadata".
- [x] 3.2 Add the `HomeLive` client component (D2) with the location and time, today, prayer times and countdown cards, wired to `lib/prayer/`; verify in the browser that the clock ticks, the current waqt is highlighted and marked current for screen readers, and a hidden tab shows correct values the moment it is shown again.
- [x] 3.3 Add "Use my location" and the town list (D5, D6); verify in the browser: no prompt on load, allowed, refused, and a non-HTTPS origin other than localhost each behave as the spec says, the town list works with the keyboard, the choice survives a reload, and the network panel shows no request carrying coordinates.
- [x] 3.4 Add the countdown ring (D9); verify in the browser that it is half full halfway through a waqt, the time left reads as text in both languages, the screen-reader sentence updates no more than once a minute, and with reduced motion the ring changes without a transition.
- [x] 3.5 Make the duas and hadith cards switch to today's entries after load (D8); verify in the browser with the clock moved to two consecutive dates that the entries change, links go to `#dua-<id>` on the right-language category page, and `/bn` never shows an English-only quote.
- [x] 3.6 Draw the background pattern and add `--color-pattern` for both themes (D10); verify in light and dark that there is no flash on load, and that text on every card keeps a contrast of at least 4.5:1 (checked with the browser's contrast tool).
- [x] 3.7 Check the layout at 390px, 768px, 1280px and 1536px; verify one column under 1280px, the D12 grid above, and that the tab order follows the spec's card order at every width.

## 4. Language and offline

- [x] 4.1 Pair `/` with `/bn` in `switchLanguageHref` and make the sidebar's home icon a `LocalizedLink` (D11); verify `lib/content.test.js` covers "Switch on the home page", "Active language shown" on `/bn`, and that `/support` still goes to `/bn/duas`, and in the browser that the home icon goes to `/bn` from a Bangla page.
- [x] 4.2 Add `/bn` to `FIXED_PAGE_URLS` and the pattern to what `npm run check:precache` expects; verify `npm run build` then `npm run check:precache` passes and lists both.
- [x] 4.3 Extend `scripts/smoke.mjs` for `/` and `/bn`: status 200, the category and donation links, no prayer time values in the HTML, the Bangla `lang` and title, and the pattern from the app's origin; verify `npm start` then `npm run smoke` passes.
- [x] 4.4 Test offline in Chrome on a production build (`npm start -- -p 3100`): open `/duas`, wait for the install, stop the server, then open `/` and `/bn` and pick another town; verify every scenario of "Home page readable offline".

## 5. Integration and docs

- [x] 5.1 Record the home page's client bundle size with and without `adhan` after `npm run build`, and note it in `design.md`; verify the numbers come from the build output.
- [x] 5.2 Update `README.md` (URLs table, the home page, where times come from, the `dua-home` key and the GeoNames credit) and `plan.md` (phase 5 state, "Works today", the `/` row); verify the text matches the code.
- [x] 5.3 Run `npm run lint`, `npm test`, `npm run build`, `npm run check:precache` and `npm run smoke`; verify all pass.
- [ ] 5.4 Have the Hafez review `data/home-picks.json`, and a Bangla speaker review the new Bangla labels and town names; verify their decisions are recorded in this file or in `plan.md`.

## Workflow follow-up

- Archive the change once the reviews in 5.4 are done.
- Before launch: the Privacy Policy states that the position from "Use my location" stays on the device.
