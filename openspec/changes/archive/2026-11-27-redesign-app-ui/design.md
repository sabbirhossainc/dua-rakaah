# Design

## Context

See `proposal.md` (Why) for the motivation. The facts below shape the approach.

- **Frame.** `app/layout.js` builds one grid: `LeftBar` (from 1440px), `Topbar` (the full version from 1440px, below
  that only an "account" link), the page, and `RightBar` (Settings, from 1536px). From 976px the frame is
  `position: fixed`, and the category list and dua column scroll inside it. `globals.css` has three `:has([data-home])`
  rules that work around that frame for the home page. Stacking uses negative `z-index`, and `AccountControl` has to
  portal its dialog to `<body>` because of it.
- **Breakpoints.** `@theme` redefines them as `sm` 480, `md` 768, `lg` 976, `xl` 1440 and `2xl` 1536 pixels, and
  nearly every layout class depends on them.
- **No shared components.** Every page and card sets its own classes: radii, paddings, button styles and heading
  styles differ from file to file, and raw palette classes (`text-gray-400`, `bg-green-600`, `text-red-500`) sit next to
  the theme tokens.
- **Fonts.** `next/font/google` loads only Inter, through a CSS variable nothing reads. Arabic and Bangla fall back to
  system fonts, and the `style-Kalpurush` class has no font. `.woff2` files under `.next/static` are precached by the
  glob in `app/serwist/[path]/route.js`, so any font served by `next/font` is available offline with no change to the
  service worker.
- **Icons.** The `public/icons/*.svg` images are dark-on-transparent, recolored for dark mode with `dark:invert`.
  Category images in `public/images/` are content, named by `cat_icon` in the database.
- **Tests that depend on markup.**
  - `scripts/smoke.mjs` counts dua parts by the class string `flex flex-col justify-start items-start`.
  - It finds category cards by `data-category-card`.
  - It checks the home order through `data-home-card`, the duas through `data-home-dua` and the quotes through
    `data-home-quote`.
  - `lib/preferences.test.js` asserts a 48px Arabic line height at the medium size.
- **Client boundaries.** `Category` and `CategoryGrid` are server components (they read the database). Anything that
  depends on the path (`LocalizedLink`, `LanguageToggle`) is client code, and `LanguageToggle` needs a `Suspense`
  boundary because it uses `useSearchParams`.
- **Inputs from the owner.**
  - A style guide: an emerald, sand and gold palette, Fraunces, Inter and Reem Kufi, pill buttons, tags and a star
    lattice.
  - A reference page whose cards, placement, spacing and "special" cards the app should follow.

## Goals / Non-Goals

**Goals:**
- One shared component library in `app/components/ui/`. Every page is composed from it, so the same role (a primary
  action, a section heading, a list row) looks and behaves the same everywhere.
- Design tokens in `globals.css`, checked by a unit test for contrast and for no raw colors outside the tokens.
- One shell (skip link, header, bottom bar, footer, Settings sheet) that adapts by CSS, with a single copy of each
  control in the DOM.
- Every existing page restyled on the library, keeping its behavior, IDs and data attributes.

**Non-Goals:**
- Search, the category filter, copy, share, report, and the pages behind the hidden links. Each needs its own change.
- The Raka'ah page (phase 6). The `Steps` component is built for it, and the navigation leaves room for its entry.
- New content for `/support`, privacy, credits or about pages.
- Photographs or illustrations like the reference page's hero. The app has no image content to put there, and the
  prayer band takes that place (D9).
- Replacing the category images in `public/images/`.

## Decisions

### D1. Where the direction comes from, and what is adapted

The owner's style guide and reference page set the direction, and they are followed exactly where they speak. Six
points are adapted, each for a reason:

| From the inputs | In the app | Why |
|---|---|---|
| The "Talbiya" name and its arch-and-star mark | The app keeps its own name, "Dua & Raka'ah", and its own mark (D12) | The mark is another product's identity. The palette, type and component language are what the guide gives us. |
| Reem Kufi for the Arabic wordmark | The wordmark's Arabic is drawn once as SVG; Reem Kufi is not loaded | A font file for two words is wasted weight offline. Kufi can't carry the full vowel marks of dua text, so it is never used for content. |
| Inter for "interface and text" | Inter for Latin; Noto Sans Bengali for Bangla; Scheherazade New for Arabic | Inter has no Bangla or Arabic. Noto Sans Bengali is drawn to sit with Inter, and Scheherazade New carries full vowel marks (D3). |
| Lilac "For women" card on the reference page | Feature cards use the palette's tints: emerald tint, sand, gold tint | Stays inside the style guide's palette. |
| All-caps labels in the guide's own layout ("MARK", "COLOUR") | Sentence case everywhere | Those labels belong to the guide document, not to its components. Bangla has no capitals. |
| The reference page's photo hero and WhatsApp call to action | The prayer band is the hero, and the dark call-to-action card is the donation card | The app's subject is prayer time and duas. It has no photo or chat feature. |

**The one bold element** is still the home page's prayer band, whose colors follow the waqt. Its colors now come from
the same palette (D9), so it reads as part of the guide, not beside it.

### D2. Tokens

Tokens are CSS custom properties in `globals.css`, redefined under `:root[data-theme="dark"]` as today, and exposed to
Tailwind through `@theme`. Classes then read as roles (`bg-surface`, `text-muted`, `bg-primary`), never as raw colors.
The old token names are mapped onto the new ones while the change lands, and removed in its last task.

**Colors**

| Token | Role | Light | Dark |
|---|---|---|---|
| `page` | Page background | Sand 50 `#FBF8F2` | Emerald 900 `#0A2B25` |
| `surface` | Cards, sheets, header | `#FFFFFF` | Emerald 800 `#0E3B33` |
| `sand` | Alternate section band, hadith card, neutral tags | Sand 100 `#F4EDE0` | `#123F37` |
| `tint` | Emerald tint: icon circles, feature card, tag, hover | `#E8F1EC` | `#123F37` |
| `gold-tint` | Gold-tinted feature card | `#F7EEDA` | `#2B2A17` |
| `raised` | Current row, pressed state | `#EEE7D8` | `#14493F` |
| `ink` | Headings | Emerald 900 `#0A2B25` | Sand 100 `#F4EDE0` |
| `body` | Body text | `#1E2B28` | `#E9E3D6` |
| `muted` | Secondary text | `#56655F` | `#B5C2BC` |
| `line` | Card borders, dividers | `#E6DFD1` | `#1F5248` |
| `primary` | Filled buttons, current nav entry, links | Emerald 800 `#0E3B33` | Gold `#C9A34E` |
| `on-primary` | Text on `primary` | Sand 50 `#FBF8F2` | Emerald 900 `#0A2B25` |
| `gold` | Gold buttons and tags, ornaments, the lattice | Gold `#C9A34E` | Gold `#C9A34E` |
| `on-gold` | Text on `gold` | Emerald 900 `#0A2B25` | Emerald 900 `#0A2B25` |
| `gold-text` | Gold-colored text: references, verse markers | Gold text `#7A5B12` | `#D9B970` |
| `focus` | Focus ring | Emerald 800 `#0E3B33` | Gold `#C9A34E` |
| `danger` | Destructive actions ("Delete my data") | `#9B2C1F` | `#F0A898` |
| `emerald` | Footer and call-to-action card | Emerald 800 `#0E3B33` | `#06201B` |
| `on-emerald` | Text on `emerald` | Sand 50 `#FBF8F2` | Sand 100 `#F4EDE0` |

Measured ratios:
- Light: `muted` on `sand` is 5.3:1; `gold-text` on `sand` 5.4:1; `on-gold` on `gold` 6.4:1; `on-primary` on `primary`
  11.7:1.
- Dark: `primary` (gold) is 4.3:1 on `raised`, so in the dark theme gold is used there only as a fill or for text of
  24px and larger. `gold-text` covers the small sizes.
- Inside emerald sections (the footer, the donation card, the Isha band) the focus ring switches to `gold`. One class,
  `on-emerald`, points the theme's names at colors that read on emerald, so every component works inside it unchanged:
  text becomes `on-emerald`, `primary` and `focus` become `gold`, the tinted surfaces become `on-gold` (the deeper
  green), and `danger` becomes its light red.

**Contrast and color use are tested.** `lib/theme.test.js` does two things:
1. It reads both themes from `app/globals.css` and checks a fixed list of pairs:
   - `ink`, `body`, `muted`, `primary` and `gold-text` on `page`, `surface`, `sand`, `tint`, `gold-tint` and `raised`;
   - `on-primary` on `primary`, and `on-gold` on `gold`;
   - `focus` on `page` and `surface`, at 3:1;
   - `danger` on `page` and `surface`, and the text, gold and danger colors on `emerald` and on its tinted surface;
   - each waqt's ink on both of its band stops (D9).

   The required ratio is 4.5:1 unless noted.
2. It scans `app/` for raw colors: hex values outside `globals.css` and the icon file, and Tailwind palette classes such
   as `gray-400` or `green-600`. Any hit fails `npm test`, which keeps every page on the tokens.

**Spacing.** The unit is 4px. These are the reference page's rhythms, as tokens:

| Token | Phone | 768px+ | 1280px+ |
|---|---|---|---|
| Page side margin | 16px | 24px | 32px |
| Section padding (top and bottom) | 40px | 56px | 72px |
| Gap between cards | 16px | 20px | 24px |
| Gap between tiles | 12px | 12px | 16px |
| Card padding | 20px | 24px | 24px |
| Heading to content | 20px | 24px | 28px |

Content width is 1200px at most. Reading text is capped at 720px, about 72 characters of 18px Inter.

**Shape and depth**

| Element | Radius | Depth |
|---|---|---|
| Buttons, tags, chips, segmented control | Pill (9999px) | None |
| Icon circle | Circle | None |
| Tile, list card, input, select | 14px | 1px `line` border |
| Card, feature card, call-to-action card | 16px | 1px `line` border, plus the shadow `0 1px 2px rgb(10 43 37 / .06)` |
| Sheet | 24px on its open edges | `0 -8px 32px rgb(10 43 37 / .18)` |
| Prayer band | 24px, square at the screen edge on phones | None |

Hover changes the fill or border color only. Cards do not lift.

### D3. Typography

| Role | Typeface | Notes |
|---|---|---|
| Latin headings | **Fraunces** (variable, `opsz` and `wght`) | Page titles, section headings, card titles, the countdown numerals. Weight 500 to 600; optical size follows the font size. |
| Latin interface and text | **Inter** (variable, with italic) | Navigation, buttons, tags, translations, labels. Transliteration is in Inter italic. |
| Bangla, everything | **Noto Sans Bengali** (variable) | Drawn to sit with Inter. Bangla headings use it at weight 600, because Fraunces has no Bangla. |
| Arabic dua text | **Scheherazade New** 400 | A traditional naskh drawn for full vowel marks, which stay clear at 22px, the smallest setting. Amiri sets the marks tighter, and Reem Kufi can't carry them. |
| Arabic in the wordmark | SVG (drawn after Reem Kufi's style) | Not a font load. |

The fonts are loaded with `next/font/google` in `app/layout.js` as `--font-heading`, `--font-sans`, `--font-bangla` and
`--font-arabic`, with `display: "swap"`, and only the subsets each needs: `latin` and `latin-ext`; `bengali`;
`arabic`. They are chosen by language:

```css
html              { font-family: var(--font-sans), system-ui, sans-serif; }
:lang(bn)         { font-family: var(--font-bangla), var(--font-sans), sans-serif; }
:lang(ar)         { font-family: var(--font-arabic), serif; }
.font-heading     { font-family: var(--font-heading), serif; }
:lang(bn) .font-heading { font-family: var(--font-bangla), sans-serif; font-weight: 600; }
```

**Scale**, from *The Elements of Typographic Style*: 12, 14, 16, 18, 21, 24, 30, 36, 48, 60px.

| Use | Size | Font | Line height |
|---|---|---|---|
| Page title (`h1`) | 36px (30px on phones) | Fraunces | 1.15 |
| Section heading (`h2`) | 30px (24px on phones) | Fraunces | 1.2 |
| Card title (`h3`) | 21px | Fraunces | 1.3 |
| Body, translation | 18px | Inter | 1.6 (Bangla: 1.8, because Bangla vowel signs need the room) |
| Interface | 16px | Inter | 1.5 |
| Labels, meta, tags | 14px | Inter (Bangla: 15px minimum) | 1.4 |
| Countdown time left | 60px, tabular figures | Fraunces, display optical size | 1 |
| Arabic | `var(--arabic-size)`: 22, 28, 34 or 40px | Scheherazade New | 2.0 |

**Measured after the build:** 23 `.woff2` files, 842 KB (822 KiB), all precached. `next/font` downloads every subset a
family has (`subsets` only chooses which are preloaded), so Cyrillic, Greek and Vietnamese files are among them. A
page requests only the files whose characters it shows. For the same reason Noto Sans Bengali also supplies the Latin
letters inside Bangla text; an element marked `lang="en"` there uses Inter.

The four Arabic sizes in `ARABIC_PX` stay, so the `dua-display` default-size requirement holds. The Arabic line height
rises from 48/28 (about 1.71) to 2.0 so stacked vowel marks don't collide. `ARABIC_LINE_RATIO`, the card CSS and
`lib/preferences.test.js` change together.

### D4. The shared component library

All shared components live in `app/components/ui/`. Pages and domain components (dua card, prayer band, lists) are
composed only from these, plus layout utilities. A component takes a `variant` and never a color class from its
caller.

| Component | Variants and parts | Used on |
|---|---|---|
| `Button` | `primary` (emerald fill), `gold` (gold fill), `outline` (1px `ink` border), `ghost`, `danger` (1px `danger` border); sizes `md` (44px) and `lg` (52px); renders `<a>` (with `href`) or `<button>`; optional leading `icon` (`iconFilled`, `iconClassName`); with an icon and no text it is square | Every page: "Use my location", "Support us", empty states, the 404 page, the account page, the sheets |
| `Tag` | `tint`, `gold`, `sand`, `text` (icon plus text, no fill); optional `icon` | Category on dua cards and feature cards, "Now" in the times list, memorize progress, counts |
| `IconCircle` | 40, 48 or 56px; `tint` or `gold-tint` fill; icon or category image | Tiles, list cards, empty states, settings links |
| `Card` | `surface`, `tint`, `sand`, `gold-tint`, `emerald` (dark call to action, with the gold lattice); optional `tag` slot top left, `action` slot at the bottom, `art` slot bottom right; `as` sets the element | Dua card, home feature cards, hadith, donation, account sections, support page |
| `Tile` | Bordered, centered `IconCircle` with a `label` and a `meta` line under it | Category grid on `/duas` and on home |
| `ListCard` (the "special card") | Horizontal: `IconCircle`, `title`, `meta`, optional `trailing` tag or `chevron`; `current` state; `action` slot for a control of its own, beside the link and never inside it (the memorize control) | Category list column and sheet, bookmark list, memorize list, settings links |
| `Checklist` | Check icon in `primary` and text rows | Support page reasons; later Raka'ah |
| `Steps` | Numbered circles (in the page's numerals) with arrows between them; vertical on phones | Built and tested now; first used by Raka'ah (phase 6) |
| `Section` | Background band `plain`, `sand`, `tint` or `emerald`; the content container; the section padding tokens | Every page body |
| `SectionHeading` | Fraunces `h2` with the gold ornament under it (a short rule, a dot and a rule); `start` or `center` alignment; optional description and action; `id` for the `h2` | Every titled section |
| `PageIntro` | The page's `h1` with the ornament, an optional lead sentence, and an optional action (the "Categories" button) | Every page |
| `Ornament` | `rule` (line, dot, line), `star` (the eight-pointed star), `lattice` (pattern fill) | Headings, between dua parts, footer, emerald cards |
| `Sheet` | Native `<dialog>`: from the bottom below 768px, from the side from 768px; `open`, `onClose`, `title`, `closeLabel`, `lang`; a child marked `data-autofocus` takes the focus; `className="sheet-column"` makes it a column from 1280px (the category list) | Settings, category list, the sign-out confirmation |
| `SegmentedControl` | Native radios drawn as a pill group; an option may have a spoken `name` and its own `lang` | Language, appearance, Arabic size, Hijri adjustment |
| `Select` | Styled native `<select>` with its `label` | Town list, reciter |
| `EmptyState` | `IconCircle`, heading (`level` 1 or 2), text, actions | Empty bookmarks and memorize lists, offline, 404, error |
| `Notice` | `info` or `success`, as a floating bar above the bottom bar, with actions | Update prompt, "data deleted" notice |
| `Wordmark`, `Mark` | The app's name with its drawn Arabic word, and its star mark (D12) | Header, footer |
| `Icon` (`icons.js`) | The icon set (D12), by `name` | Every page |

Two rules keep the pages consistent:
- **One component per role.** A primary action is always `Button primary`. A list of things to open is always
  `ListCard`. A titled block is always `Section` with `SectionHeading`.
- **No one-off styling in pages.** Page files hold layout (grid, gap, order) and components. The raw-color scan in
  `lib/theme.test.js` enforces the color half of this. Review enforces the rest.

### D5. Layout by width

`@theme` goes back to Tailwind's default breakpoints, except `sm`: `sm` 480, `md` 768, `lg` 1024, `xl` 1280, `2xl`
1536. The fixed frame is removed: `<body>` scrolls, the header is `position: sticky`, and the bottom bar is
`position: fixed`. This removes the `:has([data-home])` rules, the negative `z-index` stack and the portal workaround.

```
Phone and tablet, below 1024px              Desktop, 1024px and up
+---------------------------------+         +------------------------------------------------------------+
| (mark) Dua & Raka'ah     [acct] | header  | (mark) Dua & Raka'ah   Home  Duas  Saved  Memorize  (gear)  [acct] |
+---------------------------------+         |                        ----                                 |
| Page title                      | intro   +------------------------------------------------------------+
| --o--  lead sentence            |         | Page title                                                 |
|                                 |         | --o--  lead sentence                         [action]      |
| sections, one column            |         |                                                            |
|                                 |         | sections, container 1200px                                 |
+---------------------------------+         +------------------------------------------------------------+
| footer (emerald, lattice)       |         | footer (emerald, lattice)                                  |
+---------------------------------+         +------------------------------------------------------------+
| Home  Duas  Saved  Memo  Sett   | bottom bar, fixed, safe-area padding
+---------------------------------+

Duas pages, 1280px and up
+------------------------------------------------------------------------+
| header                                                                 |
+-------------------------+----------------------------------------------+
| Categories              | Sleep                                        |
| [o] Dua's importance  > | --o--  31 duas in 3 sections                 |
| [o] Sleep   (current) > |                                              |
| [o] Toilet            > | Section heading                              |
|  ... list cards,        | [ dua card ]                                 |
|  sticky, own scroll     | [ dua card ]                                 |
+-------------------------+----------------------------------------------+
   340px                     reading column, max 760px
```

The 760px cap is the category page's: its column is 760px at most at every width. The landing page's grid uses the
whole column beside the category list.

Text is left-aligned, and Arabic is right-aligned. Translations are never justified; the cards' current
`text-justify` goes. The bottom bar sets `padding-bottom: env(safe-area-inset-bottom)`, and `<main>` gets matching
padding below 1024px so the last content scrolls clear of it. The viewport gains `viewport-fit=cover` through Next's
`viewport` export.

### D6. Shell

```
app/layout.js
  <SkipLink />          first focusable element, labelled in the page language, goes to #main
  <SiteHeader />        client: mark and wordmark, the five entries as text links (from 1024px), account control
  <main id="main" tabIndex={-1}> {children} </main>
  <SiteFooter />        emerald band with the lattice: wordmark, an Arabic line and its meaning, links
  <BottomNav />         client: the same five entries, below 1024px
  (Settings) ──> <Sheet> <SettingsPanel/> </Sheet>
```

- **Navigation entries.** One pure function, `navEntries(pathname)` in `lib/nav.js` (unit-tested), gives the five
  entries, their localized hrefs and the current one. `SiteHeader` shows them from 1024px, and `BottomNav` below.
  - Each bar is hidden at the other width with `display: none`, which also removes it from the accessibility tree and
    the tab order.
  - The smoke checks read the header's copy, and both copies come from the same function.
  - Current entry: `aria-current="page"`. In the header it gets a 2px gold underline and weight 600, as on the
    reference page. In the bottom bar it gets a `tint` pill behind the icon and a heavier label. Both are more than
    color alone.
  - Settings is a button, not a link. It opens the Settings sheet and exposes `aria-expanded`.
- **Page intro, not a header title.** Each page renders `PageIntro` with its own title as its only `h1`, in the served
  HTML. The header shows the app's mark and name, as the reference does, not the page title. The "Duas Page" text
  disappears. The home page's `h1` ("Home") stays visually hidden, because the prayer band opens the page.
- **Settings sheet.** `Sheet` wraps the native `<dialog>` with `showModal()`, which gives the focus trap, the inert
  background and Escape to close. It also records the opener and focuses it again on close, so focus return works in
  older Safari.
  - Content mounts on first open, so the reciter list is fetched when Settings is opened, not on every page.
  - Order: language (`SegmentedControl`), appearance, Arabic size, reciter (`Select`), then two `ListCard` links:
    "Your data" (`/account` or `/bn/account`) and "Support us" (`/support`).
- **Footer.** An `emerald` section with the gold lattice. It holds the wordmark, one short Arabic line with its meaning
  in the page language, and links to Support and Your data. The Arabic line is رَبِّ زِدْنِي عِلْمًا ("My Lord,
  increase me in knowledge", Ta-Ha 20:114), and it joins the content the Hafez reviews. Below 1024px the footer sits
  above the bottom bar's padding.
- **Category list.** On `/duas` pages, `ContentFrame` renders `CategoryList` (server HTML, `ListCard`s) once. From
  1280px it is a sticky column; below that, the same element sits in a `Sheet` opened by the "Categories" button in
  `PageIntro`. A small `CurrentCategory` client island reads `cat` from the search params, marks the matching
  `ListCard` as current, and on desktop scrolls it into view. Choosing a category closes the sheet.

- **Account.** The header and the account page each show an `AccountControl` (the button and the sign-out warning).
  What keeps the device in step with the server, and the "data deleted" notice, is `AccountWatcher`, mounted once in
  the layout, so that two buttons on a page don't check the account twice at once.

**Removed components:** `LeftBar`, `RightBar`, `Topbar`, `MenuCom`, `Search`, `AccountLink` (moved into the sheet),
and `Category` (replaced by `CategoryList`). `DuaIcons` keeps only the working controls.

### D7. Page compositions

Every page is `PageIntro` plus one or more `Section`s. Section bands alternate (`plain`, then `sand` or `tint`) where
a page has more than one section, as on the reference page.

| Page | Composition |
|---|---|
| `/`, `/bn` | Prayer band. Then the sections in D9. |
| `/duas`, `/bn/duas` | `PageIntro` ("Duas", with the number of categories as the lead). One `Section` with a `Tile` grid: 2 across on phones, 3 at 768px, 5 at 1280px. Each tile is a `data-category-card` link with its image in an `IconCircle`, the name, "N duas" as a `Tag` and the subcategory count under it (the dua-categories spec requires both counts). |
| Category pages | `PageIntro` (category name; lead "N duas in M sections"; "Categories" button below 1280px). For each subcategory, a `SectionHeading` (`h2`, with `subcat-<id>`), then its dua cards (D8) with a 20px gap. |
| `/bookmark`, `/memorize` and Bangla | `PageIntro`. A column of `ListCard`s: dua title, category as meta, trailing `Tag` (memorize progress, or a saved mark), linking to the dua. Empty: `EmptyState` with "Browse duas" (`Button primary`). |
| `/account`, `/bn/account` | `PageIntro`. A `surface` `Card` for sign-in state (with `AccountControl`), then a `Card` for "Delete my data" with a `danger` button, both from today's behavior. |
| `/support` | `PageIntro`. An `emerald` `Card` with the current placeholder text, and no action: there is nowhere for a "Support us" button to go yet, and the site-shell spec forbids controls that do nothing. The real content comes later (plan question 13). |
| `/offline` | `EmptyState` in both languages, as today, each with "Go to duas". The English heading is the page's one `h1`. |
| 404 | `EmptyState`: "This page doesn't exist", with "Go home" (`primary`) and "Browse duas" (`outline`). |
| Error | `EmptyState`: "Something went wrong loading this page", with "Try again" (calls Next's `retry`, which fetches the page again; `reset` would not recover from a failure on the server) and "Go home". |

The 404 and error copy is written in both languages and chosen by the path prefix. The error page chooses on the
client. The 404 page is chosen by the route: `app/not-found.js` is English, and `app/bn/not-found.js` is reached for
unknown `/bn` addresses through `app/bn/[...rest]`, which calls `notFound()`. Choosing on the client would not match
the prebuilt English page during hydration. As with an unknown category, Next sends the status 404 and leaves the
drawing of that page to the browser, so the smoke script reads its text from the page data.

### D8. Dua card

```
+---------------------------------------------------------------+
| [Sleep]                                         (star)        |  category Tag (tint) top left
| Title of the dua                                              |  Fraunces 21px, h3
|                                                               |
| Intro text (top)                                              |  Inter 18px, body
|                                                               |
|                  بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا            |  Arabic, var(--arabic-size), line height 2.0
|                                                               |
| ( > Play )  Recitation: ...                                   |  audio: Button outline sm, credit muted 14px
|                                                               |
| Transliteration                                               |  label: muted 14px
| Bismika Allahumma amutu wa ahya                               |  Inter italic 18px
| Translation                                                   |
| In Your name, O Allah, I die and I live.                      |
| Reference                                                     |
| Bukhari 6324                                                  |  gold-text
| ------------------------------------------------------------- |
|                                     (bookmark)  (memorize)    |  44px icon buttons, ghost
+---------------------------------------------------------------+
```

- The card is a `surface` `Card`. Field labels stay, as quiet `muted` 14px text: the localization spec relies on them.
- Parts of a multi-part dua are separated by `Ornament star` between two rules, so the five-part Tasbeeh reads as one
  dua.
- Each part's wrapper gets `data-dua-part`, and the smoke script counts that instead of the Tailwind class string.
  IDs (`dua-<id>`, `subcat-<id>`) don't change. The root's `scroll-padding-top` is the header's height and 8px, so
  fragment links, and controls reached with Shift+Tab, land below the sticky header.
- The heading outline is: `h1` category, `h2` subcategory, `h3` dua title.
- Bookmark and memorize keep their behavior and become `ghost` icon buttons. The memorize panel still opens inline as a
  full-width row, styled as a `tint` panel with a `SegmentedControl` for the progress steps.

### D9. Home page

```
Phone                                     Desktop (1280px and up)
+-------------------------------------+   +----------------------------------------------------------------+
| PRAYER BAND (waqt colors)           |   | PRAYER BAND (waqt colors, 24px radius)                         |
|  Dhaka                              |   |  Dhaka               Thursday               Asr                 |
|  15:42:10                           |   |  15:42:10            16 Jumada II 1448      1:12:08  (ring)     |
|  (Use my location) [Town      v]    |   |  (Use my location)   26 November 2026       until Maghrib       |
|  Thursday, 16 Jumada II 1448        |   |  [Town v]            (-1 | 0 | +1)                              |
|  ( -1 | 0 | +1 )                    |   |  Fajr    Sunrise    Dhuhr   [Asr Now]   Maghrib   Isha          |
|  Fajr 4:58 ... [Asr Now] ... Isha   |   +----------------------------------------------------------------+
|  Asr  1:12:08  until Maghrib (ring) |   | Today's duas  --o--                        (All duas)           |
+-------------------------------------+   | [tint card][gold-tint card][sand card]   feature cards, 3 across|
| Today's duas  --o--                 |   +----------------------------------------------------------------+  band: sand
| [feature card]                      |   | Categories  --o--                                               |
| [feature card]                      |   | [tile][tile][tile][tile][tile]                                  |
| [feature card]                      |   | [tile][tile][tile][tile][tile]                                  |
| (All duas)                          |   +--------------------------------------+-------------------------+
| Categories (tiles, 2 across)        |   | Hadith of the day (sand card, quote) | Support us (emerald     |
| Hadith (sand card)                  |   |   reference in gold-text             |  card, lattice, gold    |
| Support us (emerald card)           |   |                                      |  button)                |
+-------------------------------------+   +--------------------------------------+-------------------------+
```

- **Order.** Visual order equals document order, so tab order follows it:
  1. The band: place, today, times, countdown.
  2. Today's duas.
  3. Categories.
  4. Hadith and donation, side by side from 1024px (two thirds and one third).

  Each card keeps its `data-home-card` and its own `h2` (visually hidden inside the band, where the content explains
  itself).
- **In the band**, text sits on the band in its ink, and every control sits on a panel, so no focus ring is drawn on
  the gradient. The countdown's ring holds the prayer's name, with the 60px numerals under it, so that they fit at
  320px. "All duas" is beside the heading from 768px and after the cards below that.
- **Feature cards** (today's duas): `Card` in the `tint`, `gold-tint` and `sand` variants, in turn. Each has a
  category `Tag` top left, a Fraunces title, the Arabic text, and a "Read dua" `Button outline` at the bottom linking
  to the dua. A faint `Ornament star` sits bottom right, in the `art` slot, as the reference page's illustration does.
  `data-home-dua` stays on each item.
- **Categories:** the same `Tile` grid as `/duas`, through the same `CategoryGrid` component.
- **Hadith:** `Card sand` with the quote in 21px Fraunces italic and the reference in `gold-text`. **Donation:**
  `Card emerald` with the lattice, sand text, and `Button gold` "Support us" to `/support`, like the reference page's
  "Have questions?" card.
- **Prayer band.** `HomeLive` renders `<div data-home-band data-waqt="...">` around the four live cards. Inside the
  band:
  - Controls sit on `surface` at 85% opacity, so they keep their contrast on any period's colors.
  - The current prayer gets a `Tag gold` "Now", bold text and `aria-current`.
  - The countdown uses the 60px Fraunces numerals.
- **Waqt colors.** `bandPeriod(waqt)` in `lib/prayer/band.js` (unit-tested) maps the `waqt` object `HomeLive` already
  computes to one of `neutral`, `fajr`, `forenoon` (after sunrise, no current waqt), `dhuhr`, `asr`, `maghrib` or
  `isha`. It returns `neutral` when `waqt` is null, which covers both before scripts run and times unavailable. Each
  period sets `--band-from`, `--band-to` (a vertical gradient that stands for the sky) and `--band-ink`. All are taken
  from or next to the style guide's palette:

| Period | Light from, to / ink | Dark from, to / ink | Measured (light / dark) |
|---|---|---|---|
| neutral | `#F4EDE0`, `#FBF8F2` / `#0A2B25` | `#0E3B33`, `#0A2B25` / `#F4EDE0` | 13.0 / 10.7 |
| fajr | `#E6E1EC`, `#F6E9E1` / `#0A2B25` | `#262B45`, `#3A2F42` / `#F4EDE0` | 11.8 / 10.8 |
| forenoon | `#E8F1EC`, `#FBF8F2` / `#0A2B25` | `#123F37`, `#0E3B33` / `#F4EDE0` | 13.2 / 10.1 |
| dhuhr | `#DCEBE4`, `#F8F4E9` / `#0A2B25` | `#17504A`, `#0E3B33` / `#F4EDE0` | 12.3 / 7.9 |
| asr | `#EAD7A4`, `#F4EDE0` / `#3B2C06` | `#3D3216`, `#2B2510` / `#F4EDE0` | 9.5 / 10.8 |
| maghrib | `#E3A97C`, `#CC8A6A` / `#2B130C` | `#4A2620`, `#38201B` / `#F4EDE0` | 6.2 / 11.4 |
| isha | Emerald 800, Emerald 900 / Sand 100 | `#06201B`, `#041611` / `#F4EDE0` | 10.7 / 14.7 |

  The "measured" column is the lower of the two stops. Isha is the style guide's emerald with the gold lattice faintly
  over it: night in the app's own colors.
- **Pattern.** `home-pattern.svg` is redrawn as the guide's eight-pointed-star lattice and keeps its path, so
  `check-precache.mjs` still finds it. It is used as a mask:
  - very faint behind the home page, in a `--pattern` token (emerald at low alpha on sand in light, gold at low alpha
    in dark);
  - stronger, in gold, inside `emerald` cards, the footer and the Isha band.

### D10. Motion

The only animation nobody starts is the band: when the scripts first set a period, its colors move from neutral over
1.2 seconds, through custom properties registered with `@property` so the gradient can interpolate. A later change of
period uses the same transition. The ink turns over halfway (0.2 seconds after 0.5), so text never sits for long on a
sky of its own shade. The reader's own actions are answered with motion:
- the sheets slide in (from below, or from the right; 200ms, ease-out) and fade their backdrop;
- the memorize panel expands.

A `prefers-reduced-motion: reduce` block switches all of it off. The countdown ring keeps `motion-reduce:transition-none`.

### D11. Removing controls that don't work

The controls are deleted, not hidden with CSS, so the HTML carries no dead links. A smoke check rejects `href=""` and
`href="#"` on every page. The list:
- `Search` and the category filter input;
- the copy, share and report icons in `DuaIcons`;
- the four placeholder `LeftBar` entries;
- all `MenuCom` items, with "Support us" moving into the sheet and the footer;
- the "General Settings" and "Font Settings" headings.

The unused `searchCategories` label stays in `lib/i18n.js` for when search is built.

### D12. Icons, mark and wordmark

- **Icons.** An inline SVG set in `app/components/ui/icons.js` covers:
  - navigation: home, duas, saved, memorize, settings;
  - controls: close, categories, chevron, check, play, pause, spinner, bookmark, location, arrow;
  - states: offline, warning.

  They are drawn on a 24px grid with a 1.75px stroke and round joins, like the reference page's line icons, and use
  `currentColor`, so they follow the theme without `dark:invert`.
- **The app's mark.** An eight-pointed star (two overlapping squares) in gold, set inside a rounded emerald square, in
  `public/icons/dua-logo.svg`. It is also the favicon. The style guide's arch-around-star mark is not used.
- **Wordmark.** "Dua & Raka'ah" in Fraunces 600, followed by the Arabic «دعاء» drawn as SVG in gold.
- The `public/icons/*.svg` files no longer referenced are deleted, so the precache doesn't carry them.

### D13. Verification

- **Unit tests** (`npm test`):
  - `lib/nav.test.js`: the entries, their localized hrefs and the current one, per route.
  - `lib/prayer/band.test.js`: each waqt, null, and the gap after sunrise.
  - `lib/theme.test.js`: the contrast pairs and the raw-color scan (D2).
  - `lib/preferences.test.js`: the new Arabic line height.
  - A test for `Steps` and `SegmentedControl` markup, if they hold logic beyond layout.
- **Smoke** (`npm run smoke`):
  - Parts are counted by `data-dua-part`.
  - The five entries with localized hrefs on `/` and `/bn`, and Duas marked current on a category page.
  - No `href=""` or `href="#"` on any page, and no `/rakaah`, `/alldua`, `/dua-info` or `/books` link.
  - No "Duas Page", and exactly one `<h1>` per page.
  - The skip link targets `#main`, and the footer is present.
  - The band starts as `data-waqt="neutral"` and holds the first four cards.
  - No `fonts.googleapis.com` or `fonts.gstatic.com` in the HTML.
- **Visual checks** in the browser:
  - **Widths:** 320, 360, 390, 768, 1024, 1280, 1440 and 2560px.
  - **Variations:** light and dark, English and Bangla.
  - **Pages:** every page in D7, plus a category page at the `xlarge` Arabic size.
  - **Prayer band:** the clock set to each period.
  - **Pass criteria:** no sideways scrolling, nothing hidden under the bars, visible focus on every control, and the
    same component looking the same on every page where it appears.
- `npm run check:precache` after a build confirms the font files are in the precache.

## Risks / Trade-offs

- **[Font weight offline]** Four families add to the precache. → Mitigations:
  - Only the needed subsets and weights are loaded: Scheherazade New 400 only, and the variable fonts once each.
  - The wordmark's Arabic is SVG.
  - Measure the `.woff2` total after building; today's Inter files are about 224 KB. Above about 900 KB, drop Inter's
    italic (the transliteration then uses `muted` roman) and limit Fraunces to its `wght` axis.
  - Measured: 842 KB, under the limit, so neither fallback was applied.
- **[Inter and Fraunces are common choices]** → They are the owner's choice, from the style guide, and the brief's own
  words win. What makes the app distinct is the waqt band, the Arabic setting and the lattice, not the Latin fonts.
- **[Bangla headings lose the serif]** Fraunces has no Bangla, so Bangla pages set headings in Noto Sans Bengali 600.
  → The ornament, colors and spacing carry the style on Bangla pages. A Bangla speaker reviews it on a real phone.
- **[A big diff touching every page]** → The tasks land in order: tokens, fonts and the component library, then the
  shell, then the pages. The old token names stay mapped until the last task, so each step builds and passes lint,
  tests and smoke on its own.
- **[Native `<dialog>` quirks]** → `Sheet` restores focus itself and doesn't rely on the browser.
- **[`@property` support]** Without it the band changes color without a transition. → The colors are still right.
- **[The category images]** They keep their own look. → They sit inside a `tint` `IconCircle`, so they read as
  content in a consistent frame.

## Migration Plan

Nothing to migrate: no data, URL or storage changes. Deploy as a normal build. The service worker serves the new
version after the reader chooses "Reload", as with any build. Rollback is redeploying the previous build.

## Open Questions

- Exact band and token values may shift slightly when the contrast test runs. The tables are the intent; the test is
  the rule.
- When Raka'ah (phase 6) adds a sixth navigation entry, phase 6 decides whether the bottom bar takes six entries or
  moves Memorize under a "More" entry. Nothing here depends on it.
