# Spec Delta

## Purpose

Lets a reader save duas to come back to, see which are saved, and list them in a page that works offline and in
both languages.

## ADDED Requirements

### Requirement: The bookmark icon toggles a bookmark
Every dua card SHALL have a bookmark control that adds the dua to the reader's bookmarks, or removes it if it is
already there. It SHALL show whether the dua is bookmarked, SHALL be usable with the keyboard, and SHALL have an
accessible name in the page's language. Bookmarking SHALL apply to the whole dua, not to one part of it.

#### Scenario: Add a bookmark
- **GIVEN** a dua is not bookmarked
- **WHEN** the reader activates its bookmark control
- **THEN** the control shows "bookmarked" at once, and the dua appears on the bookmark page

#### Scenario: Remove a bookmark
- **GIVEN** a dua is bookmarked
- **WHEN** the reader activates its bookmark control
- **THEN** the control shows "not bookmarked" and the dua leaves the bookmark page

#### Scenario: Dua with several parts
- **GIVEN** a dua stored as several rows and shown as one card
- **WHEN** the reader bookmarks it
- **THEN** one bookmark is saved for the dua

#### Scenario: Saved state shown on load
- **GIVEN** a dua is bookmarked
- **WHEN** the reader opens its category page
- **THEN** its card shows "bookmarked" once the local data is read, and the page content never waits for it

### Requirement: Bookmarks work the same offline
Adding, removing and listing bookmarks SHALL work with no network, and SHALL take effect on other devices the next
time the device syncs.

#### Scenario: Offline bookmark
- **GIVEN** the device is offline
- **WHEN** the reader bookmarks a dua and later goes online
- **THEN** the bookmark is on the reader's other devices after they sync

### Requirement: The bookmark page lists saved duas
`/bookmark` and `/bn/bookmark` SHALL list the reader's bookmarked duas in the page's language, each with its title
and category, newest bookmark first, and each linking to the dua's card in its category page. A dua with no title in
that language SHALL show a label that says which dua it is rather than a blank.

#### Scenario: List
- **GIVEN** the reader bookmarked 3 duas in this order: X, Y, Z
- **WHEN** they open `/bookmark`
- **THEN** the page lists Z, Y, X, each linking to `/duas/<slug>?cat=N#dua-<id>` for its category

#### Scenario: Bangla
- **WHEN** the reader opens `/bn/bookmark`
- **THEN** the page text, the dua titles and the links are in Bangla and use `/bn/duas/...`

#### Scenario: No bookmarks
- **WHEN** the reader has no bookmarks
- **THEN** the page says so and links to `/duas`

#### Scenario: A bookmark for a dua that no longer exists
- **GIVEN** a saved bookmark names a dua identifier the content no longer has
- **WHEN** the bookmark page is shown
- **THEN** that bookmark is left out of the list and the page still works

### Requirement: The bookmark page works offline
After one online visit, `/bookmark` and `/bn/bookmark` SHALL load with no network and list the reader's bookmarks
with their titles and working links, because the page carries a small index of every dua's title and category.

#### Scenario: Offline list
- **GIVEN** the reader has visited the app online and has 2 bookmarks
- **WHEN** the device is offline and they open `/bookmark`
- **THEN** both bookmarks are listed with their titles

#### Scenario: Link from the offline list
- **WHEN** the reader follows a link from the offline list to a category page they have not opened before
- **THEN** the category page loads from the saved copy

### Requirement: Bookmark pages are in the sidebar and in the saved pages
The bookmark entry in the sidebar SHALL open the page for the reader's language, and both bookmark pages SHALL be
in the list of pages saved for offline use.

#### Scenario: Sidebar link
- **WHEN** the reader is on a Bangla page and uses the bookmark entry in the sidebar
- **THEN** `/bn/bookmark` opens

#### Scenario: Saved pages list
- **WHEN** the list of saved pages is built
- **THEN** it includes `/bookmark` and `/bn/bookmark` and still has no duplicates

### Requirement: Bookmark pages are not indexed
`/bookmark` and `/bn/bookmark` SHALL tell search engines not to index them, since they show per-reader data.

#### Scenario: Robots
- **WHEN** the page is fetched
- **THEN** it carries a `noindex` instruction
