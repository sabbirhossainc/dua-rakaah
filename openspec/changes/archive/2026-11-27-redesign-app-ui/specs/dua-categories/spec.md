# Spec Delta

## MODIFIED Requirements

### Requirement: Category list beside the content
Every page under `/duas` SHALL offer the category list, in `cat_id` order, with the same icon, name and counts as
the grid. Each entry SHALL link to that category's page in the current language. From 1280px the list SHALL be shown as
a column beside the content. Below 1280px it SHALL open from a "Categories" button on the page, labelled in the page's
language, and close again with the Escape key, a close button or a choice of category.

#### Scenario: Sidebar links to a category
- **WHEN** a reader selects "Toilet" in the category list on any `/duas` page
- **THEN** the browser goes to `/duas/toilet?cat=9`

#### Scenario: Category list on a phone
- **WHEN** a reader on `/duas/sleep?cat=6` on a 390px-wide screen activates the "Categories" button
- **THEN** the category list opens over the page with all 10 categories
- **AND** pressing Escape closes it and returns focus to the button

#### Scenario: Category list in Bangla
- **WHEN** a reader on `/bn/duas/sleep?cat=6` on a 768px-wide screen opens the list and selects the first category
- **THEN** the list closes and the browser goes to that category's `/bn/duas/...` page

## ADDED Requirements

### Requirement: Current category marked
In the category list, the entry for the category being shown SHALL be marked as the current page for screen readers and
shown as current by more than color alone. On `/duas` and `/bn/duas` no entry SHALL be marked.

#### Scenario: On a category page
- **WHEN** a reader opens `/duas/sleep?cat=6`
- **THEN** the "Sleep" entry in the category list carries `aria-current="page"` and a visible marker besides its color

#### Scenario: Current category in view
- **GIVEN** the screen is 1280px wide or wider
- **WHEN** a reader opens the page of the last category
- **THEN** the category column is scrolled so that the current entry is visible
