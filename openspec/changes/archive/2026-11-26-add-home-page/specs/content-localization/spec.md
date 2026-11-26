# Spec Delta

## ADDED Requirements

### Requirement: Bangla home page
`/bn` SHALL be the Bangla version of the home page at `/`. Its links to dua and category pages SHALL go to their
`/bn/duas/...` versions, and the sidebar's home icon SHALL go to `/bn` from Bangla pages and to `/` from English ones.

#### Scenario: Home icon on a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` activates the sidebar's home icon
- **THEN** the browser goes to `/bn`

#### Scenario: Home icon on an English page
- **WHEN** a reader on `/duas/sleep?cat=6` activates the sidebar's home icon
- **THEN** the browser goes to `/`

## MODIFIED Requirements

### Requirement: Language switch
The language buttons in the Settings panel SHALL show which language is active and SHALL take the reader to the
same page in the other language, keeping the slug, the query string and the fragment. The home page `/` and `/bn` SHALL
be each other's other-language page. On a page that has no Bangla version, the Bangla button SHALL go to `/bn/duas`.

#### Scenario: Switch to Bangla on a category page
- **WHEN** a reader on `/duas/sleep?cat=6` selects "বাংলা"
- **THEN** the browser goes to `/bn/duas/sleep?cat=6`

#### Scenario: Switch back to English
- **WHEN** a reader on `/bn/duas/sleep?cat=6` selects "English"
- **THEN** the browser goes to `/duas/sleep?cat=6`

#### Scenario: Switch on the home page
- **WHEN** a reader on `/` selects "বাংলা"
- **THEN** the browser goes to `/bn`
- **AND** selecting "English" there goes back to `/`

#### Scenario: Page without a Bangla version
- **WHEN** a reader on `/support` selects "বাংলা"
- **THEN** the browser goes to `/bn/duas`

#### Scenario: Active language shown
- **WHEN** a reader is on `/bn` or any `/bn/duas` page
- **THEN** the "বাংলা" button is shown as the active one
