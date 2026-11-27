# Proposal

## Why

The interface still copies duaruqyah.com, and it only works on a large desktop screen. Below 1440px there is no
navigation, and the Settings panel exists only from 1536px. Arabic and Bangla text use whatever fonts the device has,
and about a dozen controls look usable but do nothing. Each page is also styled on its own, with no shared buttons,
cards or headings, so pages don't look like one app. Most readers open a dua app on a phone, at a prayer time or before
sleep. The app needs its own consistent look and has to work on every screen size before the Raka'ah page (phase 6)
adds more to it.

## What Changes

- **A new look that follows the supplied style guide** ("Calm, clear, rooted in place"):
  - **Colors:** Emerald 900 `#0A2B25` and Emerald 800 `#0E3B33`, Sand 50 `#FBF8F2` and Sand 100 `#F4EDE0`, Gold
    `#C9A34E`, and Gold text `#7A5B12` for gold-colored text.
  - **Pattern:** a gold eight-pointed-star lattice on emerald.
  - **Shapes:** pill-shaped buttons and tags.
  - **Dark theme:** follows the same palette, with an emerald night background and sand text.
- **Typefaces from the style guide:**
  - Fraunces for headings and Inter for interface and body text.
  - Scheherazade New for Arabic dua text, because Reem Kufi is a display Kufi that can't carry full vowel marks.
  - Noto Sans Bengali for Bangla, paired with Inter.
  - The Arabic part of the wordmark is drawn as SVG, so Reem Kufi is not loaded.
  - All fonts are self-hosted and available offline. Inter's current unused setup is replaced.
- **One shared component library that every page is built from:**
  - Layout: site header, bottom bar, footer, page intro, sections with background bands, section heading with its gold
    ornament.
  - Controls: buttons, tags, icon circles, cards and their tinted variants, tiles, list cards, checklists, sheets,
    segmented controls and empty states.
  - Card styles, placement and spacing follow the supplied reference page:
    - tinted feature cards with a tag in the corner and a pill button;
    - icon tiles in a row;
    - compact "special" list cards with an icon circle;
    - a dark emerald call-to-action card;
    - alternating section bands, and an emerald footer.
  - The same role always uses the same component.
- **A layout that works from 320px to wide desktop screens.** The page scrolls normally at every width; the fixed
  frame with its own scroll areas goes away.
  - Below 1024px there is a slim top bar, and a bottom bar with Home, Duas, Saved, Memorize and Settings.
  - From 1024px one top header holds the logo, the same five entries as text links with an underline on the current
    one, and the account control.
  - From 1280px the duas pages show the category list as a column of list cards beside the content. Below that it opens
    from a "Categories" button.
- **Settings open at every width**: a bottom sheet on phones, a side sheet on larger screens, replacing the right bar
  that only appeared from 1536px.
- **Every page gets the same page intro**: a Fraunces `h1` with the gold ornament and an optional short description.
  This replaces the hard-coded "Duas Page" heading. Interface labels are in Bangla on Bangla pages, including the
  navigation (today it is English only).
- **The home page's prayer band.** The place, today, prayer times and countdown sections sit together in one band
  whose colors follow the current waqt, from the same palette: pale dawn at Fajr, sand and gold through the day, amber
  at Maghrib, emerald night at Isha. Below the band, using the reference page's patterns:
  - today's duas as tinted feature cards;
  - categories as a row of icon tiles;
  - the hadith in a sand card beside a dark emerald donation card.

  The eight sections keep their order.
- **Redesigned dua card**: a white card whose Arabic text is the largest thing on it, a category tag, quiet labels,
  and one row of 44px controls (audio, bookmark, memorize).
- **Every page is restyled on the shared components**:
  - home (`/`, `/bn`)
  - the duas landing pages and every category page, in both languages
  - bookmark, memorize and account pages, in both languages
  - support, offline, not-found and error pages

  The 404 page links to Home and Duas, and the error page offers to try again.
- **Removed until they work:**
  - the search box and the category filter input;
  - the copy, share and report icons;
  - the General and Font Settings headings that do nothing;
  - the links to pages that don't exist (`/alldua`, `/rakaah`, `/dua-info`, `/books`);
  - the profile menu items with no link.

  No page anywhere keeps a link with an empty or `#` address. "Support us" stays and links to `/support`. Raka'ah
  returns to the navigation when phase 6 builds `/rakaah`.
- **A quality floor applied throughout**: text contrast of at least 4.5:1 in both themes, visible keyboard focus, a
  skip link, touch targets of at least 44px, reduced motion respected, and no sideways scrolling at 320px.

## Capabilities

### New Capabilities
- `app-navigation`: the primary navigation at every screen width: which destinations it lists, how it shows the current
  page, how it follows the page language, and how the Settings panel and account are reached from it.
- `visual-theme`: the app's palette and typefaces in both themes, the shared components every page is built from, and
  the accessibility floor every page meets: contrast, focus, touch targets, reduced motion.

### Modified Capabilities
- `site-shell`: adds the responsive page frame: normal page scrolling, the layouts by width, the page intro with the
  page's one `h1`, the footer, the skip link, the 404 and error pages, no sideways scrolling and no dead links on any
  page.
- `home-page`: the first four cards become sections of one prayer band, in the same order; adds the band's waqt colors.
- `dua-categories`: the category list is beside the content from 1280px, and opens from a "Categories" button below
  that, with the current category marked.
- `preferences`: the Settings panel opens at every width. The requirement that the General Settings entry "stay as it
  is" is dropped, because that entry does nothing and is removed.
- `content-localization`: Bangla labels now cover the navigation, header, footer, Settings panel and page intros.
  "Sidebar home icon" becomes the navigation's Home entry.
- `bookmarks`: the bookmark page is reached from the navigation's Saved entry instead of the sidebar.
- `memorize`: the memorize page is reached from the navigation's Memorize entry instead of the sidebar.

## Impact

- **Code:**
  - `app/layout.js` and `app/globals.css`.
  - A new `app/components/ui/` folder for the shared components.
  - Every component in `app/components/`. `LeftBar`, `RightBar`, `Topbar`, `MenuCom`, `Search`, `AccountLink` and
    `Category` are replaced by the header, bottom bar, footer, settings sheet and category list.
  - `app/components/home/*` and `app/components/content/*`.
  - Every page file, including `support`, `offline`, `not-found` and `error`.
  - `lib/i18n.js` gains labels for the navigation, footer, page intros and the 404 and error pages, in both languages.
- **Assets:**
  - The app's own logo mark and favicon (`public/icons/dua-logo.svg`) and an SVG wordmark.
  - An inline SVG icon set, in place of the `public/icons/*.svg` files the app uses today.
  - The star-lattice pattern, at the existing `home-pattern.svg` path.

  The category images in `public/images/` stay. The style guide's own mark and name ("Talbiya") are not copied: the
  app keeps its own name and mark.
- **Dependencies:** none added. Fonts come through `next/font/google`, which serves them from the app's own origin,
  as Inter does today.
- **Tests:** `scripts/smoke.mjs` counts dua parts by a Tailwind class string. It will use a `data-dua-part` attribute
  instead, and gains checks for:
  - the navigation links;
  - no empty or `#` links;
  - one `h1` per page;
  - the band sections' order.

  New unit tests check the theme's color pairs for contrast, the navigation's current section and the band's period.
- **No change** to data, sync, audio, routes, URLs, the service worker's rules or the offline page list.
