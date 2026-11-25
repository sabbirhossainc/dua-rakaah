# content-database Specification

## Purpose

Keeps the shipped dua content database small, unchanged in content and identity, and present wherever the app
reads it, so content pages and later user data (which refers to `dua.id`) stay correct.

## Requirements

### Requirement: Compaction keeps content identical
The shipped content database SHALL be compacted so that it has no free pages. Compaction SHALL NOT change any
table's schema, row count, column values, `dua.id` values, or the relative order of rows within each table.

#### Scenario: Compacted file
- **WHEN** the compaction command runs on the current `data/dua_main.sqlite`
- **THEN** the resulting file reports zero free pages and is under 1 MB

#### Scenario: Content check after compaction
- **WHEN** every row of `category`, `sub_category` and `dua` is read in stored order, before and after compaction
- **THEN** both reads return the same values in the same order

#### Scenario: Compaction refuses to replace a changed database
- **WHEN** the content check finds any difference
- **THEN** the original file is left in place and the command exits with an error

### Requirement: Database ships with request-time pages
Every deployed page that reads the content database at request time SHALL have the database file included in its
deployment output.

#### Scenario: Production build trace
- **WHEN** the app is built for production
- **THEN** the build trace for the English and Bangla category pages lists `data/dua_main.sqlite`

#### Scenario: Category page in production
- **WHEN** the production server is started from the build output and a reader opens `/duas/sleep?cat=6`
- **THEN** the page renders with status 200
