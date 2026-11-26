# Design

## Context

- `app/page.js` renders only "Home Page". There is no `app/bn/page.js`. `/` is already in the precache list
  (`FIXED_PAGE_URLS` in `lib/precache.js`) and in `scripts/smoke.mjs`.
- Pages sit inside the shared layout (`app/layout.js`: left bar, top bar, right bar from 1536px). The language comes
  from the URL (`langFromPathname` in `lib/content.js`). `switchLanguageHref` pairs `/duas...` and `/bookmark` with
  their `/bn` versions and sends every other page's Bangla button to `/bn/duas`. `LeftBar` links home to `/` with a plain
  `Link`. `LocalizedLink` already picks a link by the page's language.
- The category cards are `CategoryGrid` (`app/components/content/CategoryGrid.js`), a server component that reads
  `getCategories()`. Dua cards have the anchor `#dua-<id>` (`DuaCard.js`), and `categoryHref(cat, lang)` builds a
  category URL.
- Theme: `data-theme="dark"` on `<html>`, set before the first paint by an inline script from
  `localStorage["dua-prefs"]`. Colors are CSS variables in `app/globals.css` (`--color-surface`, `--color-page`, ...).
- The content database has no separate hadith table. Hadith text sits in the `top_*` and `bottom_*` fields of dua rows,
  with the reference in `refference_*` (categories 1 and 2 hold most of it; for example dua 24, "Bukhari: 6406").
- "Delete my data" ends in `deleteLocal` (`lib/local/account.js`), which clears IndexedDB. It does not touch
  `localStorage`.
- Checked on 2026-11-26: `adhan` 4.4.6 is MIT, computes offline from coordinates and a date, and exports
  `CalculationMethod.Karachi()`, `Madhab.Hanafi`, `PrayerTimes` with `currentPrayer()`, `nextPrayer()` and
  `timeForPrayer()`, and `isValid`-style checks near the poles. Node 24's `Intl.DateTimeFormat` formats the
  `islamic-umalqura` calendar in English and in Bangla with Bangla digits (`bn-BD-u-nu-beng`).

## Goals / Non-Goals

**Goals:**
- All reader-specific work (place, clock, times, countdown, the day's picks) happens in the browser. The server
  renders the same HTML for everyone, so `/` and `/bn` stay prerendered and precached.
- The waqt logic is a pure module with unit tests, separate from React.
- No new request leaves the browser because of this page.

**Non-Goals:**
- No server route, no change to `POST /api/sync`, no new setting type, no change to either database.
- No custom calculation method or high-latitude rule beyond adhan's defaults for Karachi.

## Decisions

### D1. Compute times with adhan in the browser, not with an API

adhan runs offline, needs no key, and the coordinates never leave the device (spec "Location stays on the device").
Alternatives: AlAdhan's API (free, no key) would see every reader's position and fail offline; a server route would put
the position on our server. Both break the privacy and offline requirements.

Method `CalculationMethod.Karachi()` with `madhab = Madhab.Hanafi`, fixed in this change (`plan.md` question 14).

### D2. One client provider drives four cards

A client component, `HomeLive`, owns the place, the current time and the computed times, and renders the location and
time, today, prayer times and countdown cards. One `setInterval` of 1 second updates "now". On `visibilitychange` to
visible it recomputes at once, so a hidden tab never shows stale values (spec "Tab hidden and shown again"). When the
date in the place's time zone changes, it recomputes the day's times.

Alternative: one timer per card. Rejected: four timers drift apart and recompute the same values.

### D3. The waqt logic is a pure module

`lib/prayer/waqt.js` takes the day's times (and the previous and next day's Fajr and Isha) and a `now`, and returns
`{ current, next, startedAt, endsAt, progress, remainingMs }`. `current` is `null` between sunrise and Dhuhr. Isha
after midnight uses the previous day's Isha and today's Fajr. During Fajr the period ends at sunrise, so `next` is
sunrise and the countdown says "until Sunrise" (decided 2026-11-26: counting to Dhuhr could be read as Fajr lasting
until then). The module takes all six times of the three days, because a reader abroad who never chose a place can be
on a different date from Dhaka. adhan is only called in `lib/prayer/times.js`, which
builds those inputs for a place and a date, and returns an "invalid" result when adhan cannot compute a time.

This keeps the rules in the spec testable with fixed dates, without a browser.

### D4. Time zones through Intl, not the device

Each list town carries `Asia/Dhaka`. "Use my location" and the default use the device's zone
(`Intl.DateTimeFormat().resolvedOptions().timeZone`). Times and the clock are formatted with
`Intl.DateTimeFormat(locale, { timeZone, hour, minute })`. The "date in the place" (for the day's times, the Hijri date
and the day index) is the `year-month-day` of `now` in that zone. adhan's README warns against formatting in the device
zone without saying which; this follows its advice.

The default place is Dhaka, but in the device's zone (spec "Times shown in the place's time zone"): a reader abroad who
never chose sees Dhaka's times in their own clock. Alternative: always `Asia/Dhaka` for the default. Rejected as the
spec is written; easy to change if wanted.

### D5. Place and Hijri adjustment in localStorage

Key `dua-home`, value `{ place: { kind: "town", id } | { kind: "device", lat, lng } | null, hijriOffset: -1|0|1 }`. Read
on mount, written on change, validated on read (a malformed part falls back to the default place or to 0).

`deleteLocal` also removes `dua-home` (guarded for a non-browser runtime), so "Delete my data" clears the place, as
the spec requires, also when the deletion arrives from another device (`410`).

Alternatives: a `preference` record synced through Turso. Rejected: it would send the reader's position to our server,
and the adjustment is a per-place matter. IndexedDB: possible, but the value is tiny and must be read before the first
render of the cards.

Coordinates from geolocation are rounded to 3 decimals (about 100 m) before saving, which is far more than prayer times
need and keeps less of a fingerprint on the device. `enableHighAccuracy: false`, `maximumAge` of a day, timeout 10 s.

### D6. Bangladesh district towns as shipped JSON

`data/bd-districts.json`: 64 entries `{ id, name_en, name_bn, lat, lng, tz }`, sorted by English name, with Dhaka's id
as the default. Coordinates come from GeoNames (CC BY 4.0, credited in the README) or another source whose license
allows it, and are checked against a map by a person. Bangla names are reviewed by a Bangla speaker. A unit test checks
64 unique ids, both names present, latitudes 20 to 27 and longitudes 88 to 93.

The list is imported by the client bundle (a few KB), so it works offline with the page.

### D7. Hijri date with Intl and an offset

Format `date + hijriOffset days` with `calendar: "islamic-umalqura"`: English `en-GB` (for example "Thursday
16 Jumada II 1448 AH"), Bangla `bn-BD-u-nu-beng`. The Gregorian date and weekday use the same locale without the
calendar option. The weekday shown is the real day, not the shifted one.

Alternative: a Hijri library. Rejected: Intl covers both languages in every supported browser and in Node.

Bangladesh's announced dates follow local moon sighting and are often a day behind Umm al-Qura, which is why the
offset exists. A later change could default it per country.

### D8. Hand-picked duas and hadith in a committed JSON

`data/home-picks.json`:

```json
{ "duas": [4, 24, 125, 202],
  "hadith": [ { "dua_id": 24, "part": 1, "field": "top" } ] }
```

The server reads it with the content database at build time and renders every listed dua and quote into the page
(titles, Arabic, quote text and reference, per language). The browser shows today's one by a day index:
`daysSinceEpoch(date in the place) mod length`. Duas show 3 at a time (index, index+1, index+2). On `/bn`, quotes with
no Bangla text are dropped from the list at build time, so the index runs over the shown ones (spec "Missing Bangla
text").

Before hydration the first entries are shown; the client then swaps to today's. Picking on the server is not possible:
the page is prerendered once per build, not once a day.

The initial list is chosen during implementation from short, clearly referenced items, and has to be reviewed by the
Hafez before launch, like the audio matches. A unit test checks that every listed id and part exists and has English
text in the chosen field.

Alternative: pick automatically from all rows. Rejected: many `top_*` texts are long introductions, not quotes.

### D9. Countdown as an SVG ring

One `<circle>` with `stroke-dasharray` set from `progress`, drawn in `--color-primary` over a `--color-line` track.
The time left is plain text inside the ring (`HH:MM:SS`, Bangla digits on `/bn`), and the card has a visually hidden
sentence such as "Asr, 1 hour 12 minutes left" that updates once a minute, with `aria-live="off"` so screen readers are
not interrupted every second. The CSS transition on the ring is removed under `prefers-reduced-motion: reduce`.

### D10. Background pattern through a CSS mask

One original SVG tile (`public/images/home-pattern.svg`, an eight-point star lattice drawn for this app), applied as a
`mask-image` on a full-page layer whose `background-color` is a new variable `--color-pattern`: a faint green in light,
a faint grey in dark. One file serves both themes and follows `data-theme` with no flash, because the theme is set
before the first paint. The cards keep `--color-surface`, so text contrast is the same as on other pages.

Alternative: two images, one per theme. Rejected: two files and a theme switch in CSS for no gain.

### D11. Routes and language

- `app/page.js` and `app/bn/page.js` render one server component, `HomePage({ lang })`. `/bn` gets
  `metadata.title` from `lib/i18n.js` ("হোম" or similar, reviewed with the other Bangla labels).
- `switchLanguageHref`: `/` ↔ `/bn`, before the existing rules.
- `LeftBar`'s home item gets `hrefs: { en: "/", bn: "/bn" }`, which makes it use `LocalizedLink` like bookmark and
  memorize.
- `FIXED_PAGE_URLS` gains `/bn`. The pattern is under `public/images/`, so the precache list already picks it up; the
  precache check is extended to expect it.

### D12. Layout

Inside the existing content column: one column under 1280px. From 1280px a two-column grid: location and time beside
today; prayer times beside the countdown; duas across; categories across (reusing `CategoryGrid` unchanged); hadith
beside donation. The DOM order is the spec's order in every width, so keyboard and screen-reader order match.

## Risks / Trade-offs

- [The Karachi method and Hanafi Asr may not match a reader's mosque, especially outside Bangladesh] → The card names
  the method and says to check with the local mosque. A setting is `plan.md` question 14.
- [Umm al-Qura differs from Bangladesh's announced Hijri date] → The −1/0/+1 adjustment; the default stays 0 until a
  per-country default is decided.
- [A reader abroad who never chose a place sees Dhaka's times] → The place name is always shown, and "Use my location"
  is one press away.
- [Devices with a wrong clock or time zone show wrong times] → Nothing to fix without a network time; out of scope.
- [The first paint shows the first list entries, then swaps to today's] → Small, text-only shift inside two cards.
  Accepted, because the page must be the same HTML for everyone.
- [adhan adds to the client bundle] → It is loaded only by the home page's client component. Check the size after
  `npm run build` and note it in the tasks.
- [GeoNames attribution or the district coordinates are wrong] → Credit in the README; a person checks the list.
- [Hadith quotes taken out of a longer text could change their meaning] → Hand-picked and reviewed by the Hafez before
  launch.

## Notes from implementation (2026-11-26)

**Bundle size** (task 5.1), from the scripts that the prerendered HTML in `.next/server/app/` loads, in two builds:
the real one, and one with `lib/prayer/times.js` stubbed so that adhan was not bundled.

| `/` and `/bn` | Raw | Gzip |
|---|---|---|
| With adhan | 671,760 B (656.0 KiB) | 205,485 B (200.7 KiB) |
| Without adhan | 659,163 B (643.7 KiB) | 201,343 B (196.6 KiB) |
| adhan's cost | 12,597 B (12.3 KiB) | 4,142 B (4.0 KiB) |

For comparison, `/duas` loads 638,948 B (194,362 B gzip) and no adhan.

**Layout.** Two rules of the shared layout broke a long page, and `app/globals.css` overrides both for the home page
only. From 976px the frame is `position: fixed`, so nothing scrolls: the home page keeps it in the document. From
1440px to 1535px page content gets only the 350px column: the home page spans the rest too. Other pages are unchanged.

**Default place.** The saved value has `place: null` until the reader chooses, because the default (Dhaka in the
device's zone) differs from a picked Dhaka (Asia/Dhaka). The town list starts on "Choose a town", so that picking
Dhaka counts as a choice.

## Migration Plan

No data migration. The new page and files ship in one build. Rollback is deploying the previous build: `/bn` then
returns 404 online, and saved copies on devices are replaced by the old build's list at the next update. A `dua-home`
key left in `localStorage` is harmless to the old build.

Before launch: the Privacy Policy states that the position from "Use my location" stays on the device.

## Open Questions

- Where the donation card should finally point and which methods to list (`plan.md` question 13). The card links to
  `/support` either way, so this does not change the specs.
- The exact Bangla wording of the new labels, reviewed with the other Bangla labels.
