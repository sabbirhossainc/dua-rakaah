# Spec Delta

## MODIFIED Requirements

### Requirement: Cards in a fixed order
The home page SHALL show these cards, each as a separate section with its own heading, in this order: location and
time, today, prayer times, countdown, duas, categories, hadith, donation. The first four SHALL be shown together in one
prayer band at the top of the page. On narrow screens the cards SHALL stack in one column in the same order.

#### Scenario: Order on a phone
- **WHEN** a reader opens `/` on a 390px-wide screen
- **THEN** the eight cards appear one under another in the order above
- **AND** the first four are inside the prayer band

#### Scenario: Order on a desktop
- **WHEN** a reader opens `/` on a 1440px-wide screen
- **THEN** the prayer band shows the location and time, today, prayer times and countdown sections side by side or in
  a grid, and the document order of all eight cards is still the order above

#### Scenario: Bangla home page
- **WHEN** a reader opens `/bn`
- **THEN** the same eight cards appear, with Bangla labels and Bangla content, and the content area's `lang` is `bn`

## ADDED Requirements

### Requirement: Prayer band follows the waqt
The prayer band's colors SHALL follow the current period of the day: Fajr, the time after sunrise with no current waqt,
Dhuhr, Asr, Maghrib and Isha each have their own colors, in both themes. The band SHALL change its colors when the
period changes, without a reload. Text in the band SHALL keep at least 4.5:1 contrast for every period.

#### Scenario: Asr
- **WHEN** Asr is the current waqt
- **THEN** the band shows the Asr colors

#### Scenario: Period changes with the page open
- **GIVEN** the page is open during Asr
- **WHEN** Maghrib begins
- **THEN** the band changes to the Maghrib colors without a reload

#### Scenario: Between sunrise and Dhuhr
- **WHEN** no waqt is current, after sunrise and before Dhuhr
- **THEN** the band shows the colors for that period, and the times list still says that no prayer is current

### Requirement: Neutral band before scripts run
Until the page's scripts know the reader's time and place, and when times cannot be computed, the prayer band SHALL show
neutral colors that belong to no period, and SHALL NOT show the colors of a period.

#### Scenario: Served HTML
- **WHEN** `/` is fetched without running scripts
- **THEN** the prayer band is marked with no period and uses the neutral colors

#### Scenario: Times cannot be computed
- **GIVEN** the reader's place is one where the times cannot be computed
- **WHEN** the home page is shown
- **THEN** the band keeps the neutral colors and the cards say the times are unavailable
