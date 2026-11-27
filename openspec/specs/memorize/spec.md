# memorize Specification

## Purpose

Lets a reader track which duas they are learning by heart: mark a dua as learned, record how far along they are, and
see everything they have started in one page that works offline and in both languages.

## Requirements

### Requirement: A dua has a learned flag and a progress value
For every dua a reader SHALL be able to set a learned flag and a progress value. Progress is a whole number from 0 to
100. The reader chooses progress from five steps: 0, 25, 50, 75 and 100. A dua the reader has never touched SHALL
count as not learned with progress 0. The learned flag and the progress value SHALL apply to the whole dua, not to one
of its parts, and SHALL be set only by the reader.

#### Scenario: Start a dua
- **GIVEN** a dua the reader has never touched
- **WHEN** the reader sets its progress to 25
- **THEN** the dua shows progress 25 and not learned, and it appears on the memorize page under "in progress"

#### Scenario: Mark as learned
- **GIVEN** a dua at progress 50
- **WHEN** the reader ticks "learned"
- **THEN** the dua shows learned with progress 100, and it moves to the "learned" group on the memorize page

#### Scenario: Dua with several parts
- **GIVEN** a dua stored as several rows and shown as one card
- **WHEN** the reader sets its progress
- **THEN** one progress value is saved for the dua

#### Scenario: Untouched dua
- **WHEN** the reader has never set anything for a dua
- **THEN** the dua shows not learned with progress 0 and is not on the memorize page

### Requirement: The reader can go backwards on purpose
The reader SHALL be able to un-tick "learned", lower the progress, or start over (progress 0 and not learned). Such a
change SHALL be kept, on this device and on every other device of the reader, even though an earlier, higher value was
already saved or synced. Starting over SHALL take the dua off the memorize page.

#### Scenario: Lower the progress
- **GIVEN** a dua at progress 75 that has synced to the reader's other device
- **WHEN** the reader sets it to 25
- **THEN** both devices show progress 25 after they sync

#### Scenario: Un-tick learned
- **GIVEN** a dua marked learned
- **WHEN** the reader un-ticks "learned"
- **THEN** the dua shows not learned, and its progress is not changed by that action

#### Scenario: Start over
- **GIVEN** a dua at progress 50
- **WHEN** the reader starts over
- **THEN** the dua shows progress 0 and not learned, and it is no longer on the memorize page

### Requirement: Every dua card has a memorize control
Every dua card SHALL have a memorize control that shows the dua's state (not started, a progress value, or learned)
and opens a panel where the reader sets the learned flag and the progress. The control SHALL be usable with the
keyboard, SHALL have an accessible name and state in the page's language, and SHALL replace the placeholder `plan`
icon. The page content SHALL NOT wait for the reader's data to load.

#### Scenario: Open the panel
- **WHEN** the reader activates the control on a card
- **THEN** a panel opens with a "learned" checkbox and the five progress steps, with the current state selected

#### Scenario: State shown on load
- **GIVEN** a dua at progress 50
- **WHEN** the reader opens its category page
- **THEN** the card's control shows progress 50 once the local data is read

#### Scenario: Keyboard
- **WHEN** the reader uses only the keyboard
- **THEN** they can open the panel, choose a progress step, tick or un-tick "learned", and close the panel

### Requirement: Memorize works offline
Setting and reading the learned flag and progress SHALL work with no network, and SHALL reach the reader's other
devices the next time the device syncs.

#### Scenario: Offline change
- **GIVEN** the device is offline
- **WHEN** the reader sets a dua to progress 75 and later goes online
- **THEN** the reader's other devices show progress 75 after they sync

### Requirement: The memorize page lists what the reader has started
`/memorize` and `/bn/memorize` SHALL list every dua with progress above 0 or marked learned, in the page's language,
in two groups: "in progress" (highest progress first) and "learned". Each entry SHALL show the dua's title, its
category, its progress, and a link to the dua's card in its category page, and SHALL have the same control as the
card so the reader can change it there. A dua with no title in that language SHALL show a label that says which dua it
is rather than a blank.

#### Scenario: List
- **GIVEN** the reader has X at progress 25, Y at progress 75 and Z learned
- **WHEN** they open `/memorize`
- **THEN** "in progress" lists Y then X, "learned" lists Z, and each links to `/duas/<slug>?cat=N#dua-<id>` for its category

#### Scenario: Bangla
- **WHEN** the reader opens `/bn/memorize`
- **THEN** the page text, the dua titles and the links are in Bangla and use `/bn/duas/...`

#### Scenario: Nothing started
- **WHEN** the reader has not started any dua
- **THEN** the page says so and links to `/duas`

#### Scenario: A record for a dua that no longer exists
- **GIVEN** a saved record names a dua identifier the content no longer has
- **WHEN** the memorize page is shown
- **THEN** that record is left out of the list and the page still works

#### Scenario: Change from the list
- **WHEN** the reader starts over on a dua in the list
- **THEN** the dua leaves the list

### Requirement: The memorize pages work offline
After one online visit, `/memorize` and `/bn/memorize` SHALL load with no network and list the reader's started duas
with their titles and working links, because the page carries a small index of every dua's title and category.

#### Scenario: Offline list
- **GIVEN** the reader has visited the app online and has 2 duas in progress
- **WHEN** the device is offline and they open `/memorize`
- **THEN** both are listed with their titles and progress

### Requirement: Memorize pages are in the navigation and in the saved pages
The navigation's Memorize entry SHALL open the memorize page for the reader's language at every screen width, and both
memorize pages SHALL be in the list of pages saved for offline use.

#### Scenario: Sidebar link
- **WHEN** the reader is on a Bangla page and uses the Memorize entry in the navigation
- **THEN** `/bn/memorize` opens

#### Scenario: Navigation link on a phone
- **WHEN** the reader on `/duas` on a 390px-wide screen uses the Memorize entry in the bottom bar
- **THEN** `/memorize` opens

#### Scenario: Saved pages list
- **WHEN** the list of saved pages is built
- **THEN** it includes `/memorize` and `/bn/memorize` and still has no duplicates

### Requirement: Memorize pages are not indexed
`/memorize` and `/bn/memorize` SHALL tell search engines not to index them, since they show per-reader data.

#### Scenario: Robots
- **WHEN** the page is fetched
- **THEN** it carries a `noindex` instruction
