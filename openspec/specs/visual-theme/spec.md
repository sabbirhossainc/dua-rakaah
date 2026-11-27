# visual-theme Specification

## Purpose

Defines the app's visual identity from its style guide and the accessibility floor every page meets: the palette in the
light and dark themes, the typefaces for Arabic, Bangla and Latin text, the shared components pages are built from,
text contrast, focus, touch targets and motion.

## Requirements

### Requirement: The style guide's palette in both themes
The app SHALL use the style guide's palette: Emerald 900 `#0A2B25` and Emerald 800 `#0E3B33`, Sand 50 `#FBF8F2` and
Sand 100 `#F4EDE0`, Gold `#C9A34E` and Gold text `#7A5B12`. The light theme SHALL use sand pages with emerald text and
actions; the dark theme SHALL use emerald pages with sand text. Interface colors SHALL NOT include `#1fa45b`.

#### Scenario: Light theme
- **GIVEN** the reader has not changed the appearance
- **WHEN** any page is shown
- **THEN** the page background is Sand 50, headings are Emerald 900, primary buttons are filled with Emerald 800, and
  `#1fa45b` does not appear in the page's styles

#### Scenario: Dark theme
- **GIVEN** the reader chose the dark appearance
- **WHEN** any page is shown
- **THEN** the page background is Emerald 900, text is sand, and the header, sheets, footer and every card use the
  dark palette, with no light surface left

### Requirement: Colors come from the theme
Every color on every page SHALL come from the theme's named colors, so that one change to the theme changes it
everywhere and both themes cover every element. Pages and components SHALL NOT set colors of their own.

#### Scenario: Raw color in a page
- **WHEN** a page or component outside the theme sets a color by hex value or by a fixed palette class
- **THEN** the project's tests fail and name the file

### Requirement: Shared components for shared roles
Elements with the same role SHALL look and behave the same on every page: primary and secondary buttons, tags, cards
and their tinted and emerald variants, category tiles, list rows, section headings with the gold ornament, the page
intro, sheets, choice controls and empty states.

#### Scenario: Same button on two pages
- **WHEN** a reader sees the primary action on the 404 page and the "Use my location" button on the home page
- **THEN** both have the same shape, height, fill, text style and focus ring

#### Scenario: Same list row on two pages
- **WHEN** a reader compares a row of the bookmark list with a row of the category list
- **THEN** both show an icon circle, a title and a detail line, with the same size, border, radius and spacing

#### Scenario: Same section heading everywhere
- **WHEN** a reader compares section headings on `/`, a category page and `/account`
- **THEN** each is set in the heading typeface with the same gold ornament under it

### Requirement: Spacing scale
Gaps between cards, padding inside cards, padding between sections and page margins SHALL follow one spacing scale
that depends only on the screen width, so that equal elements are equally spaced on every page.

#### Scenario: Card gaps on two pages
- **WHEN** a reader views the home page's duas and a category page's dua cards on a 1280px-wide screen
- **THEN** the gap between cards is the same on both pages

#### Scenario: Phone margins
- **WHEN** any page is shown on a 390px-wide screen
- **THEN** its content starts 16px from each side of the screen

### Requirement: Text contrast
All text and its background SHALL have a contrast ratio of at least 4.5:1 in both themes, and at least 3:1 for text
of 24px and larger and for icons that carry meaning. Gold SHALL NOT be used for text smaller than 24px unless that text
meets 4.5:1.

#### Scenario: Reference text
- **WHEN** a dua card's reference is shown in either theme
- **THEN** its text has at least 4.5:1 contrast with the card behind it

#### Scenario: Text on a gold button
- **WHEN** a gold button or tag is shown in either theme
- **THEN** its text has at least 4.5:1 contrast with the gold behind it

#### Scenario: Prayer band text
- **WHEN** the home page's prayer band is shown for any waqt, in either theme
- **THEN** every text in the band has at least 4.5:1 contrast with the band behind it

### Requirement: A typeface for each script and role
Latin headings SHALL use Fraunces, and Latin interface and body text SHALL use Inter. Bangla text SHALL use a typeface
designed for Bangla. Arabic dua text SHALL use a naskh typeface that shows full vowel marks without collisions. Each
SHALL be chosen by the text's language.

#### Scenario: Bangla page with Arabic
- **WHEN** a reader opens `/bn/duas/sleep?cat=6`
- **THEN** the Arabic block is drawn in the Arabic typeface and the Bangla headings and text in the Bangla typeface,
  with no system fallback font for either

#### Scenario: English headings
- **WHEN** a reader opens `/duas/sleep?cat=6`
- **THEN** the page title and section headings are drawn in Fraunces, and the translations in Inter

#### Scenario: Vowel marks
- **WHEN** dua 123 ("Tasbeeh") is shown at the "xlarge" Arabic size
- **THEN** no vowel mark touches or overlaps a mark or letter of the line above or below

### Requirement: Fonts from the app's own origin
Every font file SHALL be served from the app's own origin, SHALL be available offline once the app is installed, and
SHALL NOT be requested from another origin. Text SHALL stay readable in a fallback font while a font file loads.

#### Scenario: No third-party font request
- **WHEN** any page loads
- **THEN** no request goes to `fonts.googleapis.com`, `fonts.gstatic.com` or any other origin for a font

#### Scenario: Offline
- **GIVEN** the app has finished installing
- **WHEN** the device is offline and the reader opens a saved category page in Bangla
- **THEN** the Arabic, Bangla and Latin text are drawn in the app's typefaces

### Requirement: Visible keyboard focus
Every interactive element SHALL show a visible focus indicator when it receives keyboard focus, with at least 3:1
contrast against the background next to it, in both themes and inside emerald sections.

#### Scenario: Focus on a dua card control
- **WHEN** a keyboard user tabs to the bookmark control of a dua card in the dark theme
- **THEN** a focus ring with at least 3:1 contrast is drawn around it

#### Scenario: Focus in the footer
- **WHEN** a keyboard user tabs to a link in the emerald footer
- **THEN** a focus ring with at least 3:1 contrast against the emerald is drawn around it

### Requirement: Touch targets
Every interactive element SHALL have a target area of at least 44 by 44 CSS pixels, except links inside running text.

#### Scenario: Dua card controls on a phone
- **WHEN** a reader views a dua card on a 360px-wide screen
- **THEN** the audio, bookmark and memorize controls each have a target area of at least 44 by 44 pixels, and do not
  overlap

### Requirement: Motion
Animation that the reader did not start SHALL be limited to the prayer band's colors settling after the page loads or
the period changes, and the countdown circle following the time. When the device asks for reduced motion, no element
SHALL animate its position, size or color, beyond updating a value.

#### Scenario: No hover lift
- **WHEN** a reader points at a card or tile
- **THEN** its color or border may change, and it does not move or grow

#### Scenario: Reduced motion
- **GIVEN** the device asks for reduced motion
- **WHEN** the reader opens the Settings panel and the home page loads
- **THEN** the panel appears without sliding, and the prayer band shows its waqt colors without a transition
