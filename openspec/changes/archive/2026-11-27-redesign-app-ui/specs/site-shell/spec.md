# Spec Delta

## ADDED Requirements

### Requirement: The page scrolls as a document
At every width the page SHALL scroll as one document, so the browser's own scrolling, find-in-page, fragment links and
scroll restoration work. Only the category list column MAY scroll on its own. The site header SHALL stay at the top
while the page scrolls.

#### Scenario: Fragment link on a desktop
- **WHEN** a reader opens `/duas/sleep?cat=6#dua-200` on a 1440px-wide screen
- **THEN** the document scrolls so that the card for dua 200 is visible below the site header, not hidden under it

#### Scenario: Back to a scrolled page
- **GIVEN** a reader scrolled halfway down `/duas/morning-evening?cat=5` and followed a link
- **WHEN** they go back
- **THEN** the page is shown at the position they left

### Requirement: Layout by screen width
Below 1024px the content SHALL be one column. From 1280px, pages under `/duas` and `/bn/duas` SHALL show the category
list as a column beside the content. Content SHALL NOT be wider than 1200px, and reading text SHALL NOT run wider than
about 75 characters per line at any width.

#### Scenario: Category page on a phone
- **WHEN** a reader opens `/duas/sleep?cat=6` on a 390px-wide screen
- **THEN** the dua cards take the full width of the screen, less the page margin, and no category column is shown

#### Scenario: Category page on a desktop
- **WHEN** a reader opens `/duas/sleep?cat=6` on a 1440px-wide screen
- **THEN** the category list and the dua cards are shown side by side under the site header
- **AND** a translation line is no wider than about 75 characters

#### Scenario: Wide screen
- **WHEN** a reader opens `/` on a 2560px-wide screen
- **THEN** the content keeps its maximum width and the extra space is left as margin

### Requirement: No sideways scrolling
No page SHALL scroll sideways at any width from 320px, in either language or theme, at any Arabic text size.

#### Scenario: Long Arabic line on a small phone
- **GIVEN** the reader chose the "xlarge" Arabic text size
- **WHEN** they open `/duas/morning-evening?cat=5` on a 320px-wide screen
- **THEN** the Arabic text wraps within the card and the page does not scroll sideways

### Requirement: Skip link
Every page SHALL start with a link, labelled in the page's language, that moves keyboard focus past the site header and
navigation to the main content. It SHALL be visible when it has focus.

#### Scenario: Skip to content
- **WHEN** a keyboard user presses Tab once on `/bn` and activates the focused link
- **THEN** focus moves to the start of the main content, and the link's label is in Bangla

### Requirement: Page intro and heading
Every page SHALL have exactly one level-one heading that names the page in the page's language. On every page except
the home page it SHALL open the main content as the page intro, set in the heading style with the gold ornament. No
page SHALL show the fixed text "Duas Page".

#### Scenario: Category page heading
- **WHEN** a reader opens `/bn/duas/sleep?cat=6`
- **THEN** the page's one `h1` is the Bangla name of the category, at the start of the main content

#### Scenario: Home page heading
- **WHEN** a reader opens `/`
- **THEN** the page has one `h1`, read by screen readers, and the prayer band is the first thing shown

#### Scenario: Old heading gone
- **WHEN** any page is served
- **THEN** its HTML does not contain "Duas Page"

### Requirement: Site footer
Every page SHALL end with the site footer: the app's name, a short Arabic line with its meaning in the page's language,
and links to `/support` and to the account page in the page's language.

#### Scenario: Footer in Bangla
- **WHEN** a reader scrolls to the end of `/bn/duas`
- **THEN** the footer shows the Arabic line with its Bangla meaning, and its account link goes to `/bn/account`

### Requirement: No dead links on any page
No page SHALL contain a link whose address is empty or `#`, or a control that looks usable but does nothing.

#### Scenario: Dua card controls
- **WHEN** a category page is served
- **THEN** its dua cards offer only controls that work (audio, bookmark, memorize), and its HTML has no `href=""` or
  `href="#"`

#### Scenario: No search box
- **WHEN** any page is served
- **THEN** it shows no search box and no category filter input

### Requirement: Page not found
An address with no page SHALL show a page, inside the site frame, that says the page doesn't exist and offers links to
Home and to Duas, with the 404 status kept.

#### Scenario: Unknown English address
- **WHEN** a reader opens `/no-such-page`
- **THEN** the response status is 404, and the page says it doesn't exist and links to `/` and `/duas`

#### Scenario: Unknown Bangla address
- **WHEN** a reader opens `/bn/no-such-page`
- **THEN** the page's text is in Bangla and its links go to `/bn` and `/bn/duas`

### Requirement: Error page
When a page fails to render, the reader SHALL see a page, inside the site frame, that says the page could not be
loaded, offers to try again without leaving the address, and links to Home.

#### Scenario: Try again
- **GIVEN** a page failed to render because of a temporary fault
- **WHEN** the reader activates "Try again"
- **THEN** the page is rendered again at the same address
