# offline-content Specification

## Purpose

Lets a reader open and browse every dua, in English and Bangla, with no network after one online visit, and
defines what they see for a page that was not saved.

## Requirements

### Requirement: All content readable offline
After the app has finished installing in a browser, every category page in both languages, both landing pages
(`/duas` and `/bn/duas`), and the existing `/` and `/support` pages SHALL load with no network and show the same content as when online, including every dua
card's Arabic text, transliteration, translation and reference.

#### Scenario: Category page offline
- **GIVEN** a reader opened `/duas` online and waited for the app to finish installing
- **WHEN** the network is turned off and the reader opens `/duas/sleep?cat=6`
- **THEN** the page loads, shows the same 31 duas as online, and has no broken images

#### Scenario: Bangla page offline
- **GIVEN** the same reader, offline
- **WHEN** the reader opens `/bn/duas/morning-evening?cat=5`
- **THEN** the page shows the Bangla titles, labels and text for category 5

#### Scenario: Not yet installed
- **WHEN** a reader opens the app for the very first time and goes offline before installation finishes
- **THEN** pages they did not load are not available, and the reader sees the offline page described below

### Requirement: Saved pages follow the database
The set of saved category pages SHALL be every category in the content database, in each language, at its
canonical URL (`/duas/<slug>?cat=<id>` and `/bn/duas/<slug>?cat=<id>`). Adding or removing a category in the
database and rebuilding SHALL change the saved set to match, with no other edit.

#### Scenario: Saved set matches the database
- **WHEN** the app is built from a database with 10 categories
- **THEN** the saved set contains 20 category page URLs, and each one is exactly the URL that the category list links to

#### Scenario: Category added
- **WHEN** a category is added to the database and the app is rebuilt
- **THEN** the saved set contains 22 category page URLs, including the two for the new category

### Requirement: Navigating offline
While offline, following any link in the category list, the category grid, or the language buttons to a saved
page SHALL show that page. It SHALL NOT show a blank screen or a browser error, whether or not the reader has
visited that page before.

#### Scenario: Link to a page not visited before
- **GIVEN** an offline reader on `/duas` who has never opened category 8
- **WHEN** the reader clicks the "Home" category
- **THEN** the page for category 8 is shown

#### Scenario: Language switch offline
- **GIVEN** an offline reader on `/duas/sleep?cat=6#dua-200`
- **WHEN** the reader clicks "বাংলা"
- **THEN** `/bn/duas/sleep?cat=6#dua-200` is shown in Bangla

### Requirement: Pages look the same offline
The scripts, styles, fonts, icons and category images that a saved page uses SHALL be available offline, so that
a saved page looks and behaves as it does online.

#### Scenario: Images and layout offline
- **WHEN** a saved page is opened offline
- **THEN** the category images, icons and fonts are shown, and the layout is the same as online

### Requirement: Page that was not saved
While offline, opening a page that is not saved SHALL show a short offline page that says the page isn't
available offline and links to `/duas`. While online, unknown URLs SHALL keep returning their normal 404 and
redirect responses.

#### Scenario: Unsaved page offline
- **WHEN** an offline reader opens `/duas/not-a-category?cat=99`
- **THEN** the offline page is shown, with a link to `/duas`

#### Scenario: Unknown category online
- **WHEN** an online reader opens `/duas/not-a-category?cat=99`
- **THEN** the response status is 404, as before this change

### Requirement: No service worker in development
The development server SHALL NOT register a service worker, and SHALL NOT serve saved copies of pages. A service
worker left on the same origin by an earlier production run SHALL be removed, together with its saved files.

#### Scenario: Development server
- **WHEN** the app runs with `npm run dev` and a page is opened
- **THEN** no service worker is registered, and an edit to a source file shows up on the next load

#### Scenario: Leftover production worker
- **GIVEN** a service worker from an earlier `npm start` run is still registered on the same origin
- **WHEN** a page is opened from the development server
- **THEN** that worker is unregistered and its saved files are deleted, and the development page is shown, not a saved one
