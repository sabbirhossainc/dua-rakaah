# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Bookmark pages are in the sidebar and in the saved pages`
- TO: `### Requirement: Bookmark pages are in the navigation and in the saved pages`

## MODIFIED Requirements

### Requirement: Bookmark pages are in the navigation and in the saved pages
The navigation's Saved entry SHALL open the bookmark page for the reader's language at every screen width, and both
bookmark pages SHALL be in the list of pages saved for offline use.

#### Scenario: Sidebar link
- **WHEN** the reader is on a Bangla page and uses the Saved entry in the navigation
- **THEN** `/bn/bookmark` opens

#### Scenario: Navigation link on a phone
- **WHEN** the reader on `/duas` on a 390px-wide screen uses the Saved entry in the bottom bar
- **THEN** `/bookmark` opens

#### Scenario: Saved pages list
- **WHEN** the list of saved pages is built
- **THEN** it includes `/bookmark` and `/bn/bookmark` and still has no duplicates
