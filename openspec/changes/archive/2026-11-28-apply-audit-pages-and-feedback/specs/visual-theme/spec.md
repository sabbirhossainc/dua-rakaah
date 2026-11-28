## ADDED Requirements

### Requirement: Compact buttons
Action and utility buttons, and links shaped as buttons, SHALL be drawn at the compact size: 36 CSS pixels high, with
horizontal padding of at least 16 pixels, and a gap of at least 8 pixels between adjacent buttons. Icon-only buttons
SHALL be drawn 36 by 36 pixels. A larger size MAY be used only for a page's single main call to action. The drawn size
SHALL NOT reduce the target area below the touch-target requirement.

#### Scenario: Footer and form buttons
- **WHEN** a reader views the footer or the feedback form on a 1440px-wide screen
- **THEN** each button is drawn 36 pixels high, and adjacent buttons are at least 8 pixels apart

#### Scenario: Tap area kept
- **WHEN** a reader on a 360px-wide screen taps 4 pixels above a compact button's drawn edge
- **THEN** the button is activated, because its target area is at least 44 by 44 pixels

## MODIFIED Requirements

### Requirement: Touch targets
Every interactive element SHALL have a target area of at least 44 by 44 CSS pixels, except links inside running text.
An element drawn smaller, such as a compact button, SHALL extend its target area beyond its drawn edge to reach that
size, and the extended areas of neighbouring elements SHALL NOT overlap.

#### Scenario: Dua card controls on a phone
- **WHEN** a reader views a dua card on a 360px-wide screen
- **THEN** the audio, bookmark and memorize controls each have a target area of at least 44 by 44 pixels, and do not
  overlap

#### Scenario: Compact button
- **WHEN** a compact button 36 pixels high is shown
- **THEN** its target area is at least 44 by 44 pixels and does not overlap a neighbour's
