# Proposal

## Why

`/` shows only the words "Home Page" (`app/page.js`). It is the app's front door, yet it gives a reader nothing: not
the day's prayer times, not today's Hijri date, and no way into the duas. This is phase 5 in `plan.md`, before the
Raka'ah page (phase 6).

## What Changes

- `/` becomes a real home page, and a Bangla version is added at `/bn`. Each section is a separate card on a soft
  Islamic geometric background that works in the light and dark themes.
- **Location and time:** the place the prayer times are for, and a live clock.
- **Today:** a short header with the weekday, the Hijri date and the Gregorian date. The Hijri date can be moved one
  day back or forward, because local moon sighting can differ from the calculated calendar.
- **Prayer times:** Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, with the current waqt highlighted. They are computed
  in the browser, so no service learns where the reader is, and they work offline.
- **Countdown:** a circle that empties as the current waqt runs out, with the time left until the next waqt.
- **Location:** Dhaka until the reader chooses. A "Use my location" button asks the browser for the position only when
  it is pressed. The reader can also pick a Bangladesh district town from a list. The choice stays on the device.
- **Duas, categories, hadith and donation:** a few hand-picked duas and one hadith from the content database, which
  change with the date; the 10 category cards; and a donation card that links to `/support`.
- The language buttons switch between `/` and `/bn`. The sidebar's home icon goes to `/bn` on Bangla pages.
- `/bn` is saved for offline use like `/`.

duaruqyah.com's home page was a reference for which sections to have. Its design, text and images are not copied.

Out of scope: changing the calculation method or the Asr rule (Karachi and Hanafi are fixed in this change), syncing the
location or the Hijri adjustment across devices, Qibla, adhan sounds or notifications, prayer-time widgets for other
pages, cities outside Bangladesh in the list, a real donation flow or payment, and the Raka'ah page.

## Capabilities

### New Capabilities

- `prayer-times`: how the app works out the day's prayer times, the current and next waqt and the time left, for which
  place, with which method, and what it does with the reader's location.
- `home-page`: what `/` and `/bn` show, in which order, where each card's content comes from, and how it behaves
  offline and before the browser has run any script.

### Modified Capabilities

- `content-localization`: `/bn` is the Bangla home page, and the language switch pairs `/` with `/bn`.
- `offline-content`: `/bn` is saved and readable offline, and the home page's times work offline.

## Impact

- New dependency: `adhan` (4.4.6, MIT), used in the browser only.
- New data files: the Bangladesh district towns with coordinates (English and Bangla names), and the hand-picked
  dua and hadith list for the home page. Both are reviewed by a person and committed. No change to either database.
- New code: `app/page.js` (rewritten), `app/bn/page.js`, home card components, `lib/prayer/` (the waqt logic and its
  tests), the background pattern in `public/images/`.
- Changed code: `lib/content.js` (`switchLanguageHref`), `LeftBar`, `lib/precache.js`, `lib/i18n.js`,
  `scripts/smoke.mjs`, `scripts/check-precache.mjs` if needed, `README.md`, `plan.md`.
- Privacy: the position from "Use my location" is kept in the browser's storage and never sent to the server or any
  other service. The Privacy Policy (still to be written) should say so.
- Prayer times are a calculation, so the card says they are a guide and to check with the local mosque.
