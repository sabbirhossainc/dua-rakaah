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
The navigation SHALL list the app's services: Home, Duas and Rakaah, in that order. The reader's own pages (Saved,
Memorize and the profile) SHALL be in the account menu, and Settings SHALL be a control in the site header, not
navigation entries. It SHALL NOT list a destination whose page doesn't exist.

#### Scenario: Entries
- **WHEN** a reader looks at the navigation on `/`
- **THEN** it shows exactly Home, Duas and Rakaah, in that order

#### Scenario: Pages not built yet
- **GIVEN** `/alldua`, `/dua-info` and `/books` don't exist
- **WHEN** any page is served
- **THEN** its HTML has no link to any of them

### Requirement: Destinations follow the page language
The Home, Duas and Rakaah entries SHALL link to the page in the current page's language: `/`, `/duas` and `/rakaah`
from English pages, and `/bn`, `/bn/duas` and `/bn/rakaah` from Bangla pages. The account menu's entries SHALL do the
same: `/bookmark`, `/memorize` and `/account`, or `/bn/bookmark`, `/bn/memorize` and `/bn/account`.

#### Scenario: From a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` activates Rakaah
- **THEN** the browser goes to `/bn/rakaah`

#### Scenario: Account menu from a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` opens the account menu and activates Saved
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

### Requirement: Settings control opens the Settings panel
Settings SHALL be an icon button in the site header, beside the account control, at every width, with an accessible
name in the page's language. It SHALL open the Settings panel on the current page, without leaving it. Its expanded
state SHALL be exposed to screen readers.

#### Scenario: Open on a phone
- **WHEN** a reader on `/duas/sleep?cat=6#dua-200` on a 390px-wide screen activates Settings in the header
- **THEN** the Settings panel opens, and the address is still `/duas/sleep?cat=6#dua-200`

#### Scenario: Open from the header
- **WHEN** a reader on `/` on a 1280px-wide screen activates Settings in the header
- **THEN** the Settings panel opens, and the entry reports itself as expanded

### Requirement: Account and support reachable at every width
The site header SHALL show the account control at every width. It SHALL open a menu with Saved and Memorize, the
profile (`/account`) when the reader is signed in, and the sign-in or sign-out action. While support is paused, the
Settings panel, the header, the bottom bar and the footer SHALL NOT link to `/support`.

#### Scenario: Account on a phone
- **WHEN** a reader who is not signed in opens `/` on a 360px-wide screen and activates the account control
- **THEN** a menu opens with Saved, Memorize and the sign-in action, and no profile entry

#### Scenario: Support link
- **WHEN** a reader on `/bn` on a 390px-wide screen opens the Settings panel
- **THEN** it holds no link to `/support`
- **AND** neither does the footer

### Requirement: Navigation usable with the keyboard
Every navigation entry SHALL be reachable with the Tab key in on-screen order and SHALL show a visible focus indicator.

#### Scenario: Tabbing through the header
- **WHEN** a keyboard user on a 1280px-wide screen tabs from the skip link
- **THEN** focus moves through the header's logo link, the navigation entries, Settings and the account control in
  order, each visibly focused
