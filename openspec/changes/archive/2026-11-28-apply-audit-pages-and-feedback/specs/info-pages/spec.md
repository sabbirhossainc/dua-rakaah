## ADDED Requirements

### Requirement: About page
`/about` and `/bn/about` SHALL explain, in the page's language, what the app is for; that prayer times are computed on
the device and are a guide; how the hadith card changes five times a day with a new set each day; where the duas and
hadith come from and how they are reviewed; and that support is not being taken right now. Each page SHALL have its own
title and description in the page's language.

#### Scenario: English
- **WHEN** a reader opens `/about`
- **THEN** the page has sections on the app's purpose, prayer times, the daily hadith, sources, and the paused support

#### Scenario: Bangla
- **WHEN** a reader opens `/bn/about`
- **THEN** the same sections appear in Bangla, and the content area's `lang` is `bn`

### Requirement: Privacy policy page
`/privacy-policy` and `/bn/privacy-policy` SHALL say, in the page's language, what the app keeps and where: the location
or chosen place for prayer times and the settings, kept on the device; bookmarks and memorize lists, kept on the device
and, for signed-in readers, on the app's server; and feedback a reader chooses to send. It SHALL name the device storage
the app uses (local storage, IndexedDB, the offline cache and the sign-in cookie), say that feedback is delivered by
email through Resend and used only to reply and fix content, say how long feedback is kept, and link to `/account` for
deleting data. It SHALL show the date it was last updated.

#### Scenario: Location
- **WHEN** a reader reads `/privacy-policy`
- **THEN** it says the location used for prayer times stays on the device and is never sent to the app's server

#### Scenario: Feedback delivery
- **WHEN** a reader reads the feedback section
- **THEN** it names Resend as the email service that delivers feedback, and says what fields are sent

#### Scenario: Last updated
- **WHEN** either language's page is shown
- **THEN** it shows the date it was last updated, in that language's digits
