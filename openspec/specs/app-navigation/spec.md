# app-navigation Specification

## Purpose

Defines the app's primary navigation at every screen width: which destinations it offers, how it marks the current page,
how it follows the page language, and how the Settings panel, the account and the support page are reached.

## Requirements

### Requirement: Navigation at every width
Every page SHALL offer the primary navigation at every viewport width from 320px. Below 1024px it SHALL be a bar fixed to
the bottom of the screen. From 1024px it SHALL be a row of text links in the site header, and no bottom bar SHALL be
shown. The page content SHALL NOT be hidden behind the bottom bar.

#### Scenario: Phone
- **WHEN** a reader opens `/duas/sleep?cat=6` on a 390px-wide screen
- **THEN** a navigation bar is shown at the bottom of the screen, and stays there while the page scrolls
- **AND** the footer can be scrolled fully above the bar

#### Scenario: Tablet
- **WHEN** a reader opens `/` on a 768px-wide screen
- **THEN** the navigation is the bottom bar

#### Scenario: Desktop
- **WHEN** a reader opens `/` on a 1280px-wide screen
- **THEN** the navigation entries are text links in the site header, and no bottom bar is shown

#### Scenario: Narrowest supported screen
- **WHEN** a reader opens any page on a 320px-wide screen
- **THEN** every navigation entry is visible without sideways scrolling

### Requirement: Only working destinations
The navigation SHALL list Home, Duas, Saved (the bookmark page), Memorize and Settings, in that order. It SHALL NOT list
a destination whose page doesn't exist.

#### Scenario: Entries
- **WHEN** a reader looks at the navigation on `/`
- **THEN** it shows exactly Home, Duas, Saved, Memorize and Settings, in that order

#### Scenario: Pages not built yet
- **GIVEN** `/rakaah`, `/alldua`, `/dua-info` and `/books` don't exist
- **WHEN** any page is served
- **THEN** its HTML has no link to any of them

### Requirement: Destinations follow the page language
The Home, Duas, Saved and Memorize entries SHALL link to the page in the current page's language: `/`, `/duas`,
`/bookmark` and `/memorize` from English pages, and `/bn`, `/bn/duas`, `/bn/bookmark` and `/bn/memorize` from Bangla pages.

#### Scenario: From a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` activates Saved
- **THEN** the browser goes to `/bn/bookmark`

#### Scenario: From an English page
- **WHEN** a reader on `/memorize` activates Duas
- **THEN** the browser goes to `/duas`

### Requirement: Current page marked
The entry for the section the reader is in SHALL be marked as the current page for screen readers and shown as current
by more than color alone. Every page under `/duas` or `/bn/duas` SHALL mark Duas. No other entry SHALL be marked.

#### Scenario: Category page
- **WHEN** a reader opens `/bn/duas/sleep?cat=6`
- **THEN** the Duas entry carries `aria-current="page"` and has a visible marker besides its color, an underline in the
  header or a filled shape behind the icon in the bottom bar
- **AND** no other entry carries `aria-current`

#### Scenario: Account page
- **WHEN** a reader opens `/account`
- **THEN** no navigation entry is marked as current

### Requirement: Labelled entries in the page language
Every navigation entry SHALL show a visible text label, at every width, in the page's language. In the bottom bar the
label SHALL be shown with an icon. The navigation SHALL be a landmark with an accessible name in the page's language,
and only one navigation landmark SHALL be exposed at a time.

#### Scenario: Bangla labels
- **WHEN** a reader opens `/bn` on a 390px-wide screen
- **THEN** each entry of the bottom bar shows an icon and its label in Bangla

#### Scenario: Landmark
- **WHEN** a screen reader lists the landmarks of `/duas` on a 1280px-wide screen
- **THEN** one primary navigation is listed, with an English name

### Requirement: Settings entry opens the Settings panel
The Settings entry SHALL open the Settings panel on the current page, without leaving it. Its expanded state SHALL be
exposed to screen readers.

#### Scenario: Open from the bottom bar
- **WHEN** a reader on `/duas/sleep?cat=6#dua-200` on a 390px-wide screen activates Settings
- **THEN** the Settings panel opens, and the address is still `/duas/sleep?cat=6#dua-200`

#### Scenario: Open from the header
- **WHEN** a reader on `/` on a 1280px-wide screen activates Settings in the header
- **THEN** the Settings panel opens, and the entry reports itself as expanded

### Requirement: Account and support reachable at every width
The site header SHALL show the sign-in or account control at every width. While support is paused, the Settings panel,
the header, the bottom bar and the footer SHALL NOT link to `/support`.

#### Scenario: Account on a phone
- **WHEN** a reader opens `/` on a 360px-wide screen
- **THEN** the site header shows the sign-in control, or the account control when signed in

#### Scenario: Support link
- **WHEN** a reader on `/bn` on a 390px-wide screen opens the Settings panel
- **THEN** it holds no link to `/support`
- **AND** neither does the footer

### Requirement: Navigation usable with the keyboard
Every navigation entry SHALL be reachable with the Tab key in on-screen order and SHALL show a visible focus indicator.

#### Scenario: Tabbing through the header
- **WHEN** a keyboard user on a 1280px-wide screen tabs from the skip link
- **THEN** focus moves through the header's logo link and navigation entries in order, each visibly focused
