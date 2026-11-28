# Proposal

## Why

A UX and accessibility audit (`audit.md`) found friction on the home page and category grid. Checked against the code,
many of its items are already met; this change fixes the gaps that remain and applies the owner's decisions on
location, the clock, daily duas and phone layouts.

## What Changes

- **BREAKING**: The district town list and the "Use my location" button are removed. The home page asks the browser for
  the position when it is opened, and uses it if allowed.
- **BREAKING**: Without a position, the page shows the capital of the visitor's country, worked out on the device from
  its time zone, in the capital's time zone. An unknown zone gives Dhaka. Today it always gives Dhaka, in the device's
  zone.
- With a position, the place is named on the device: the nearest district in Bangladesh, and elsewhere the state or
  province (the country where there is none). The name is looked up from a table fetched only after the position is
  given, never saved for offline use; the last name found is kept with the position and shown until a new one is found.
- The live clock and all prayer times use a 12-hour clock. The countdown stays hours:minutes:seconds.
- The prayer times list marks passed, current and upcoming times differently, and is a two-column grid below 640px.
- The category grid is one column below 640px, on the home page and the duas landing pages.
- "Duas for today" follows the time of day: morning, daytime, evening and night lists, instead of one list by date.
- The countdown digits get more line height; clocks and times keep left-to-right order and equal-width digits.
- Screen readers hear one countdown sentence instead of two, and are told once when the prayer period changes.
- The category "Cloths" becomes "Clothing" and one dua title reads "stability" in lower case. The category's address
  becomes `/duas/clothing`; old `cloths` addresses redirect.
- Category counts read "7 subcategories" / "1 subcategory" instead of "Subcategory: 7".
- Direction-dependent styles use logical properties, with no visible change.

Not included:

- Already met in the code: the Hijri control's fieldset, legend and button names; `lang="ar"` and `dir="rtl"` on Arabic
  text; the Arabic typeface, size and line height; 44px targets; tested 4.5:1 text contrast; no per-second
  announcements; one-column dua cards on phones.
- The Next.js development badge, which production builds do not show.
- Not chosen: translation previews, and save and copy buttons, on the daily dua cards.
- Sentence-casing other titles.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `prayer-times`: how the place is chosen (asked on opening, capital fallback, no town list), its time zone, and the
  12-hour clock.
- `home-page`: the location and time card, prayer times card, countdown card, duas card and served placeholder.
- `dua-categories`: grid columns, subcategory count wording, and redirects for the renamed category.
- `offline-content`: what of the home page works offline once the town list is gone.
- `visual-theme`: a shared-button example that names the removed "Use my location" button.

## Impact

- Code: `app/components/home/*`, `CategoryGrid`, `CategoryList`, `CategoryPage`, `lib/prayer/*`, `lib/home/picks.js`,
  `lib/content.js`, `lib/i18n.js`, `app/globals.css`, unit tests and `scripts/smoke.mjs`.
- Data: `data/dua_main.sqlite` (two text values), `data/home-picks.json` (new shape), a new generated table of capitals
  by time zone (from IANA tzdata and GeoNames), and a generated table of place names, `public/places.json` (GeoNames,
  with `data/bd-districts.json` as the source for Bangladesh).
- Readers: a saved town is ignored from now on; the browser shows a location prompt on the home page.
- Review: the new dua lists and the Bangla capital names and labels need review by the Hafez or a Bangla speaker.
- No new runtime dependency, and no location leaves the device.
