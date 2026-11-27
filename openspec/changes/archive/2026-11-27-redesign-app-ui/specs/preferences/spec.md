# Spec Delta

## MODIFIED Requirements

### Requirement: The Settings panel changes appearance and text size
The Settings panel SHALL let the reader choose the appearance and the Arabic text size. Each choice SHALL take effect
at once, without a page reload, SHALL show which option is selected, and SHALL be usable with the keyboard with an
accessible name in the page's language. The panel SHALL NOT show headings or entries that do nothing.

#### Scenario: Choose dark
- **WHEN** the reader selects the dark appearance
- **THEN** the whole app switches to the dark theme at once, and "dark" shows as selected

#### Scenario: Choose a larger Arabic size
- **GIVEN** a category page is open
- **WHEN** the reader selects the "large" text size
- **THEN** the Arabic text on every dua card becomes larger at once

#### Scenario: Back to the default
- **GIVEN** the appearance is dark
- **WHEN** the reader selects light
- **THEN** the app switches back to light, and the choice reaches the reader's other devices like any other change

#### Scenario: Keyboard
- **WHEN** the reader uses only the keyboard
- **THEN** they can move to each option, select it, and see which one is selected

#### Scenario: No empty entries
- **WHEN** the reader opens the Settings panel
- **THEN** it shows the language, appearance, Arabic text size and (when available) reciter choices, and no "General
  Settings" entry

## ADDED Requirements

### Requirement: The Settings panel opens at every width
The Settings panel SHALL open from the navigation's Settings entry at every width from 320px: as a sheet from the
bottom of the screen below 768px, and as a sheet from the side from 768px. While it is open, focus SHALL stay inside it
and the page behind SHALL NOT be operable. Escape and a close button labelled in the page's language SHALL close it and
return focus to the Settings entry.

#### Scenario: Phone
- **WHEN** a reader on a 390px-wide screen activates Settings
- **THEN** the panel opens from the bottom of the screen with every setting reachable by scrolling inside it

#### Scenario: Close with Escape
- **GIVEN** the panel is open on a 1280px-wide screen
- **WHEN** the reader presses Escape
- **THEN** the panel closes and focus returns to the Settings entry

#### Scenario: Choice shown at once
- **GIVEN** the panel is open over a category page
- **WHEN** the reader selects "xlarge"
- **THEN** the Arabic text behind the panel is redrawn at the new size while the panel stays open

#### Scenario: Reduced motion
- **GIVEN** the device asks for reduced motion
- **WHEN** the panel opens
- **THEN** it appears in place without sliding
