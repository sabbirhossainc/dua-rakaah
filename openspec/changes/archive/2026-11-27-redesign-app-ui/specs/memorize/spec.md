# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Memorize pages are in the sidebar and in the saved pages`
- TO: `### Requirement: Memorize pages are in the navigation and in the saved pages`

## MODIFIED Requirements

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
