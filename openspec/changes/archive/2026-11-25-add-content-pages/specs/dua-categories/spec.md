# Spec Delta

## Purpose

Lets readers find duas by category: a grid of all categories, a category list beside the content, and one page
per category that shows its duas grouped under subcategory headings.

## ADDED Requirements

### Requirement: Category grid at the duas landing page
`/duas` SHALL show one card for each of the 10 categories, in `cat_id` order. Each card SHALL show the category
icon, its name, its number of subcategories and its number of duas, and SHALL link to that category's page.
The page SHALL NOT render any dua content.

#### Scenario: Landing page lists every category
- **WHEN** a reader opens `/duas`
- **THEN** the page shows 10 category cards, starting with "Dua's Importance" and ending with "Adhaan & Iqamah"
- **AND** no dua card appears on the page

#### Scenario: Grid card opens its category
- **WHEN** a reader selects the "Sleep" card on `/duas`
- **THEN** the browser goes to `/duas/sleep?cat=6`

### Requirement: Dua counts come from the content
Every dua count shown for a category SHALL equal the number of distinct duas in that category, where rows that
share one `dua.id` count as one dua. The stored `category.no_of_dua` value SHALL NOT be shown.

#### Scenario: Category whose duas span several rows
- **WHEN** a reader views the count for "Morning & Evening" (cat 5, 52 rows, 45 distinct duas)
- **THEN** the count shown is 45

#### Scenario: Category with one row per dua
- **WHEN** a reader views the count for "Dua's Importance" (cat 1)
- **THEN** the count shown is 21

### Requirement: Category list beside the content
Every page under `/duas` SHALL show the category list, in `cat_id` order, with the same icon, name and counts as
the grid. Each entry SHALL link to that category's page in the current language.

#### Scenario: Sidebar links to a category
- **WHEN** a reader selects "Toilet" in the category list on any `/duas` page
- **THEN** the browser goes to `/duas/toilet?cat=9`

### Requirement: Category page URL
A category page SHALL be served at `/duas/<slug>?cat=<cat_id>`. The `cat` value SHALL decide which category is
shown. The canonical slug SHALL be the English category name in lowercase with apostrophes removed, each run of
other characters outside `a`–`z` and `0`–`9` replaced by one hyphen, and no leading or trailing hyphen.

#### Scenario: Canonical URL
- **WHEN** a reader opens `/duas/morning-evening?cat=5`
- **THEN** the page shows the "Morning & Evening" category with status 200

#### Scenario: Slug for a name with punctuation
- **WHEN** the app builds the link for "Dua's Importance" (cat 1)
- **THEN** the link is `/duas/duas-importance?cat=1`

#### Scenario: Slug for a name with an ampersand
- **WHEN** the app builds the link for "Adhaan & Iqamah" (cat 10)
- **THEN** the link is `/duas/adhaan-iqamah?cat=10`

### Requirement: Non-canonical slugs redirect
When `cat` names an existing category but the slug isn't that category's canonical slug, the app SHALL
redirect permanently to the canonical URL for that `cat`. This keeps old links working, such as
`/duas/morning-&-evening?cat=5`.

#### Scenario: Old slug format
- **WHEN** a reader opens `/duas/morning-&-evening?cat=5`
- **THEN** the response is a permanent redirect to `/duas/morning-evening?cat=5`

#### Scenario: Slug of a different category
- **WHEN** a reader opens `/duas/sleep?cat=5`
- **THEN** the response is a permanent redirect to `/duas/morning-evening?cat=5`

### Requirement: Category page without a cat value
When `cat` is absent and the slug is the canonical slug of a category, the app SHALL redirect permanently to that
category's canonical URL. When `cat` is absent and the slug matches no category, the app SHALL respond with 404.

#### Scenario: Slug only
- **WHEN** a reader opens `/duas/sleep`
- **THEN** the response is a permanent redirect to `/duas/sleep?cat=6`

#### Scenario: Unknown slug only
- **WHEN** a reader opens `/duas/not-a-category`
- **THEN** the response is the not-found page with status 404

### Requirement: Invalid cat values
When `cat` is present but isn't a single positive integer naming an existing category, the app SHALL respond with
the not-found page and status 404. This covers non-numeric, unknown and repeated values.

#### Scenario: Unknown category
- **WHEN** a reader opens `/duas/sleep?cat=99`
- **THEN** the response is the not-found page with status 404

#### Scenario: Non-numeric category
- **WHEN** a reader opens `/duas/sleep?cat=abc`
- **THEN** the response is the not-found page with status 404

#### Scenario: Repeated cat parameter
- **WHEN** a reader opens `/duas/sleep?cat=6&cat=5`
- **THEN** the response is the not-found page with status 404

### Requirement: Duas grouped by subcategory
A category page SHALL show each of the category's subcategories in `subcat_id` order, as a heading followed by
that subcategory's duas in `dua_id` order. The heading SHALL show the subcategory's name. The text
"Section: Sections" SHALL NOT appear.

#### Scenario: Category with several subcategories
- **WHEN** a reader opens `/duas/sleep?cat=6`
- **THEN** the page shows the heading "Before sleep" with its duas, followed by the heading "After waking up" with its duas

#### Scenario: Every dua appears once
- **WHEN** a reader opens the page for any category
- **THEN** the number of dua cards on the page equals that category's dua count from the grid

### Requirement: Category page title
Each category page SHALL set the document title to the category's name in the page's language, followed by the
site title suffix.

#### Scenario: English title
- **WHEN** a reader opens `/duas/sleep?cat=6`
- **THEN** the document title is "Sleep | All Duas Collection"
