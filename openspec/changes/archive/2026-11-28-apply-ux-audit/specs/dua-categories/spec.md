# Spec Delta

## ADDED Requirements

### Requirement: Category grid columns
The category grid, on `/`, `/bn`, `/duas` and `/bn/duas`, SHALL be one column below 640px and at least two columns
from 640px.

#### Scenario: Phone
- **WHEN** a reader opens `/duas` 390px wide
- **THEN** the 10 category cards are one under another, with no sideways scrolling

#### Scenario: Small tablet
- **WHEN** a reader opens `/duas` 700px wide
- **THEN** the cards are in two columns

### Requirement: Subcategory count wording
Wherever a category's subcategory count is shown, it SHALL read as a count followed by the word, singular for one, in
the page's language.

#### Scenario: Several
- **WHEN** a category with 7 subcategories is listed on `/duas`
- **THEN** its card reads "7 subcategories"

#### Scenario: One
- **WHEN** "Clothing", with one subcategory, is listed on `/duas`
- **THEN** it reads "1 subcategory"

#### Scenario: Bangla
- **WHEN** the same category is listed on `/bn/duas`
- **THEN** the count is worded in Bangla, with no "সাবক্যাটাগরি:" label before the number

### Requirement: Clothing category name and old address
Category 7 SHALL be named "Clothing" in English, at `/duas/clothing?cat=7`. Addresses with the earlier slug `cloths`,
with or without `cat=7`, SHALL redirect permanently to it, in both languages.

#### Scenario: Old link with cat
- **WHEN** a reader opens `/duas/cloths?cat=7`
- **THEN** the response is a permanent redirect to `/duas/clothing?cat=7`

#### Scenario: Old slug only
- **WHEN** a reader opens `/bn/duas/cloths`
- **THEN** the response is a permanent redirect to `/bn/duas/clothing?cat=7`
