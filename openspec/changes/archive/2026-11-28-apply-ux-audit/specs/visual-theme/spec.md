# Spec Delta

## MODIFIED Requirements

### Requirement: Shared components for shared roles
Elements with the same role SHALL look and behave the same on every page: primary and secondary buttons, tags, cards
and their tinted and emerald variants, category tiles, list rows, section headings with the gold ornament, the page
intro, sheets, choice controls and empty states.

#### Scenario: Same button on two pages
- **WHEN** a reader sees the primary action on the 404 page and the primary action of an empty bookmark list
- **THEN** both have the same shape, height, fill, text style and focus ring

#### Scenario: Same list row on two pages
- **WHEN** a reader compares a row of the bookmark list with a row of the category list
- **THEN** both show an icon circle, a title and a detail line, with the same size, border, radius and spacing

#### Scenario: Same section heading everywhere
- **WHEN** a reader compares section headings on `/`, a category page and `/account`
- **THEN** each is set in the heading typeface with the same gold ornament under it
