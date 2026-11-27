# Spec Delta

## MODIFIED Requirements

### Requirement: Bangla interface labels
On Bangla pages, every interface label SHALL be in Bangla. This covers the navigation, the site header and footer, the
skip link, the page intros, the Settings panel, the category list and its "Categories" button, the subcategory and dua
count labels, the field labels on dua cards, and the not-found and error pages. The language button "English" keeps
its English name. The content area SHALL be marked with language `bn`.

#### Scenario: Reference label in Bangla
- **WHEN** a reader views a dua card on a `/bn/duas` page
- **THEN** its reference label is in Bangla, not "Reference:"
- **AND** the content area's `lang` attribute is `bn`

#### Scenario: Navigation and settings in Bangla
- **WHEN** a reader on `/bn/duas/sleep?cat=6` looks at the navigation and opens the Settings panel
- **THEN** the navigation labels, the panel's heading, its legends and its close button are in Bangla
- **AND** the "বাংলা" and "English" buttons keep their own names

#### Scenario: Footer and page intro in Bangla
- **WHEN** a reader opens `/bn/bookmark`
- **THEN** the page intro's heading, the footer's links and the meaning of its Arabic line are in Bangla

#### Scenario: English labels stay English
- **WHEN** a reader opens `/duas/sleep?cat=6`
- **THEN** the navigation, site header, footer and Settings panel labels are in English

### Requirement: Bangla home page
`/bn` SHALL be the Bangla version of the home page at `/`. Its links to dua and category pages SHALL go to their
`/bn/duas/...` versions, and the navigation's Home entry SHALL go to `/bn` from Bangla pages and to `/` from English
ones.

#### Scenario: Home icon on a Bangla page
- **WHEN** a reader on `/bn/duas/sleep?cat=6` activates the navigation's Home entry
- **THEN** the browser goes to `/bn`

#### Scenario: Home icon on an English page
- **WHEN** a reader on `/duas/sleep?cat=6` activates the navigation's Home entry
- **THEN** the browser goes to `/`
