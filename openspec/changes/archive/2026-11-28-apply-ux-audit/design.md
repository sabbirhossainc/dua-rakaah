# Design

## Context

See proposal.md for motivation. Facts that shape the approach:

- `/` and `/bn` are built once. Time and place are filled in by the browser (`HomeLive`, `useNow`, `useSavedHome`).
- `lib/prayer/place.js` saves `{ place: town | device | null, hijriOffset }` in `localStorage["dua-home"]`;
  `resolvePlace` turns it and the device's zone into coordinates and a display zone.
- `DailyDuas` sits outside `HomeLive`; every listed dua is in the served HTML and the others are `hidden`.
- Colors come only from the theme, and `lib/theme.test.js` checks contrast pairs, including `ink`, `body` and `muted`
  on a band panel. `muted` on the bare band gradient is not checked.
- Category pages resolve by `cat`; a wrong slug redirects, but an unknown slug without `cat` is a 404.
- The audit's countdown clipping has no `overflow: hidden` behind it. The likely cause is `line-height: 1` on
  `text-countdown`; it was not reproduced during planning.

## Goals / Non-Goals

**Goals:** keep the home page static and the same for every reader; keep all place and period logic pure and tested
under `lib/`; add no runtime dependency and no network request.

**Non-Goals:** asking for the position anywhere but the home page; watching the position while the page is open;
naming the position more precisely than a district or state; any network lookup of a name; mirroring the interface right to left.

## Decisions

### 1. Position flow

`HomeLive` calls `getCurrentPosition` in an effect, once per page load, with `enableHighAccuracy: false`, a one hour
`maximumAge` and a 10 s timeout. The saved position, if any, is used while it runs.

| Result | Saved position | Shown | Status line |
|---|---|---|---|
| Given | replaced (rounded to 3 decimals, as now) | its name (decision 9), else "My location" | none |
| Refused (`PERMISSION_DENIED`) | removed | capital | not allowed; allow it in browser settings |
| Other error, saved exists | kept | saved position | none |
| Other error, none saved | none | capital | could not be found |
| No API or insecure context | removed | capital | not available |

"Finding your location…" is shown only while there is no saved position. The decision table goes in a pure function in
`lib/prayer/` that takes the outcome and the saved value, so it is unit tested without a browser.

*Alternatives:* check `navigator.permissions` first — more states, and uneven across browsers; `getCurrentPosition`
already answers without a prompt once the browser has a decision. Ask once and never again — a reader who travels would
keep the old place.

### 2. Capital by time zone

A script, `scripts/build-capitals.mjs`, writes `data/capitals.json`: `capitals` (id, `name_en`, `name_bn`, `lat`,
`lng`, `tz`) and `zones` (IANA zone name → capital id). Sources: `zone.tab` and `backward` from IANA tzdata for the
zone → country mapping; GeoNames capitals (feature code `PPLC`) for coordinates and the capital's own zone; GeoNames
alternate names tagged `bn` for Bangla names, with missing ones drafted by hand in a small override file. The output is
committed; the build does not download anything.

- Resolve a zone in `zone.tab` first, and follow a `backward` link only for names that are not there: newer tzdata
  links some countries' zones to another country's.
- Browsers report older names (`Asia/Calcutta`, `Asia/Saigon`), so those must be keys too.
- Anything unresolved (`UTC`, `Etc/*`, a country with no capital row) is Dhaka. Bangladesh's entry keeps today's
  coordinates, so Dhaka's times do not change.

`resolvePlace(place, deviceZone)` returns `{ kind: "device" | "capital", city, lat, lng, timeZone }`. With a capital,
`timeZone` is the capital's, so the name, the clock and the times agree. In a country with several zones, a reader far
from the capital sees the capital's clock; allowing location fixes it. Before the scripts run `deviceZone` is unknown
and the card shows a placeholder.

*Alternatives:* `Intl` has no zone-to-country lookup. IP lookup needs a network and a server and was rejected by the
owner. Always Dhaka was rejected by the owner.

`data/bd-districts.json`, the town branch of `validPlace` and the town labels are removed. A saved town parses to
`null`; `hijriOffset` survives.

### 3. 12-hour formatting

`formatTime` and `formatClock` use `hourCycle: "h12"` with a numeric hour, and upper-case the day period for English
(`en-GB` gives "pm"). Bangla uses what `Intl` gives for `bn-BD` ("৩:৪৪ PM"). `formatDuration` is unchanged.

### 4. Daily duas by period

`data/home-picks.json` changes `duas` from one array to four named arrays. Starting picks, all checked to exist with
Arabic text and both titles:

| List | Period (`waqt.current`) | Dua ids |
|---|---|---|
| `morning` | `fajr`, none after sunrise | 102, 103, 104, 105, 106, 115 |
| `day` | `dhuhr`, unknown | 4, 24, 8, 29, 15, 23, 139, 140 |
| `evening` | `asr`, `maghrib` | 109, 110, 111, 112, 113, 115 |
| `night` | `isha` | 207, 208, 209, 210, 201, 202 |

`buildHomePicks` returns the union of the duas, each once, plus the ids of each list; the component renders all and
unhides `takeFrom(list, dayIndex(date, list.length), 3)`. A `useDayPeriod` hook gives `{ date, period }` as one string
snapshot, caching the day's computed times by place and date so that nothing is recalculated every second. The date is
the place's calendar date, so night picks move on at midnight.

*Alternative:* sorting one list by tags — more machinery for the same result.

### 5. Prayer times list

A pure `timeState(key, time, now, current)` gives `current`, `passed` or `upcoming`. The whole list sits in one
`band-panel`, so passed entries can use `text-muted` on a tested background; they also get the `check` icon and a
screen-reader word. The current entry has a `bg-tint` fill, a 2px `primary` border (at least 3:1), bold text and the
"Now" tag, and keeps `aria-current`. Below 640px it is a two-column grid with each entry stacked; from 640px to 1279px
the list stays, and from 1280px the six-column row stays.

*Alternative:* lowering opacity on passed entries — breaks the contrast guarantee.

### 6. Countdown, announcements and numbers

- The ring keeps the waqt name. The visible time and "until X" become `aria-hidden`; one `sr-only` paragraph says
  "{time} left until {name}". The `countdownSentence` label goes.
- A separate `sr-only` `aria-live="polite"` element in the card gets text only when `waqt.current` changes while the
  place is unchanged, never on the first value. The comparison is a pure function.
- `text-countdown` gets `line-height: 1.15`. A `numeric` utility (`tabular-nums`, `direction: ltr`,
  `unicode-bidi: isolate`) goes on the countdown, clock and times. If Fraunces as served has no tabular figures (check
  digit widths in the browser), the countdown uses the Latin sans face, which does.

### 7. Content edits

Two `UPDATE`s on `data/dua_main.sqlite` (category 7 `cat_name_en`; dua 15 `dua_name_en`), then `npm run db:vacuum`,
then a comparison with the committed file showing exactly those two values changed. `lib/content.js` gets a legacy slug
map (`cloths` → category 7) used by the no-`cat` branch. The database is part of the build revision, so installed apps
pick the change up through the normal update prompt.

### 9. Naming the position

`scripts/build-places.mjs` (which also writes `data/capitals.json`) writes `public/places.json`: the 64 Bangladesh
district towns from `data/bd-districts.json`, named by district in both scripts, and every other GeoNames town of more
than 15,000 people, named by its state or province (GeoNames `admin1`), or by its country where it has none. Bangla
names come from GeoNames alternate names; a state with none shows its English name on `/bn`. Coordinates are stored as
whole hundredths of a degree, and names once each, so the file is a few hundred KB.

A pure `nearestName(table, lat, lng)` in `lib/prayer/` returns `{ en, bn }` of the nearest point by equirectangular
distance. Near a district border the nearest town can be the neighbor's: accepted for now.

- The table is fetched only when the given position has no name, or a name found for other coordinates.
  It is not in the precache list and no worker route matches `.json`, so it is never saved on the device.
- The name found is saved with the position (`place.name`), with the coordinates it was found for. A position whose
  name was found elsewhere (it moved offline) is looked up again once the table can be fetched. Until a lookup succeeds (offline, or the fetch fails) the
  saved name stays, so an offline reader sees the last name found online; with none, "My location".
- The lookup runs on the device: the request carries no coordinates.

*Alternatives:* bundling the table — over the 30 KB budget; precaching it — the owner chose to keep only the last
name; a reverse-geocoding service — sends the position away.

### 8. Layout details

- Category grid: `grid-cols-1`, two from 640px, then the current three and five.
- Subcategory counts use `subcategoryOne` / `subcategoryMany` labels, with digits formatted like `duaCount`.
- Logical utilities (`text-start`, `start-*`, `end-*`, `me-*`) and `inset-inline` for `.notice`. The side sheet and
  inset shadows stay physical: their animation and shadow offsets have no logical form.

## Risks / Trade-offs

- [A prompt on page load is easy to dismiss, and some browsers mute it] → the capital is shown at once and the status
  line says how to allow location.
- [With no button, a reader who refused has only browser settings] → accepted by the owner; the status line says so.
- [Time zone is a weak sign of country, and multi-zone countries share one capital] → the place is named, so the reader
  can see what the times are for.
- [The capitals table adds to the home page's script] → capitals only, short fields; compare the built size and keep
  the addition under 30 KB before compression.
- [More hidden duas, some long, enlarge the home page's HTML] → six to eight per list.
- [Two-column prayer cells are narrow at 360px, and Bangla 12-hour strings are long] → verify at 360px in both
  languages.

## Migration Plan

Deploy as a normal build. Saved towns are ignored without a data migration. To roll back, revert the commit: the old
code reads a saved device position and ignores nothing new.

- [The places table is large] → fetched only when the position changes, from the HTTP cache otherwise.
- [An offline reader who moved sees the old name with new times] → accepted by the owner; it is replaced once online.

## Open Questions

- Review by the Hafez of the four dua lists, and by a Bangla speaker of the capital names, new labels and the "AM"/"PM"
  markers. Each is a data or label edit.
