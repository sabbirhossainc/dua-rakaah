## MODIFIED Requirements

### Requirement: Category grid at the duas landing page
`/duas` SHALL show one card for each of the 10 categories, in `cat_id` order. Each card SHALL show the category
icon, its name and its number of duas, and SHALL link to that category's page. It SHALL NOT show the number or names of
its subcategories. The page SHALL NOT render any dua content.

#### Scenario: Landing page lists every category
- **WHEN** a reader opens `/duas`
- **THEN** the page shows 10 category cards, starting with "Dua's Importance" and ending with "Adhaan & Iqamah"
- **AND** no dua card appears on the page

#### Scenario: No subcategory text
- **WHEN** a reader opens `/duas` or `/bn/duas`
- **THEN** no category card mentions subcategories in either language

#### Scenario: Grid card opens its category
- **WHEN** a reader selects the "Sleep" card on `/duas`
- **THEN** the browser goes to `/duas/sleep?cat=6`

### Requirement: Category list beside the content
Every page under `/duas` SHALL offer the category list, in `cat_id` order, with the same icon, name and dua count as
the grid, and no subcategory count. Each entry SHALL link to that category's page in the current language. From 1280px
the list SHALL be shown as a column beside the content. Below 1280px it SHALL open from a "Categories" button on the
page, labelled in the page's language, and close again with the Escape key, a close button or a choice of category.

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

## REMOVED Requirements

### Requirement: Subcategory count wording
**Reason**: Subcategory counts are no longer shown on category cards or in the category list.
**Migration**: None. Subcategory headings on category pages are unchanged (see "Duas grouped by subcategory").
