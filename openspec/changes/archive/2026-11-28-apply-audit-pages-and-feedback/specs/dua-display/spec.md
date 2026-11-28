## ADDED Requirements

### Requirement: Dua card badge and border contrast
On every dua card, in light and dark themes, badge text (such as category, subcategory and reference tags) SHALL have a
contrast ratio of at least 4.5:1 against the badge's own background, and the badge's background or outline SHALL have
at least 3:1 against the card surface. The card's border SHALL have at least 3:1 against both the card surface and the
page background around it. These colors SHALL come from the theme palette.

#### Scenario: Light theme
- **WHEN** a category page is shown in the light theme
- **THEN** every dua card's badge text measures at least 4.5:1 against its badge, and the card border at least 3:1
  against the card and the page

#### Scenario: Dark theme
- **WHEN** the same page is shown in the dark theme
- **THEN** the same ratios hold
