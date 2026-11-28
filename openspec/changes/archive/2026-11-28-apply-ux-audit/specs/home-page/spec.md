# Spec Delta

## ADDED Requirements

### Requirement: Period changes announced once
When the prayer period changes while the home page is open, a screen reader SHALL be told once, politely, what has
begun, in the page's language. Nothing SHALL be announced when the page loads, when the place changes, or as the clock
and countdown tick.

#### Scenario: Asr begins
- **GIVEN** the page is open during Dhuhr
- **WHEN** Asr begins
- **THEN** one polite announcement says that Asr has started

#### Scenario: Sunrise
- **GIVEN** the page is open during Fajr
- **WHEN** the sun rises
- **THEN** one announcement says that no obligatory prayer is due now

#### Scenario: Place resolves
- **GIVEN** the page shows a capital's times
- **WHEN** the reader's position arrives and the current period differs
- **THEN** no period announcement is made

### Requirement: Clocks and times stay stable
The live clock, the prayer times and the countdown SHALL be shown whole at 360px, 768px and 1440px widths, SHALL read
left to right even inside right-to-left text, and SHALL NOT move sideways as their digits change.

#### Scenario: Countdown not clipped
- **WHEN** the countdown is shown at 360px, 768px and 1440px, in English and Bangla
- **THEN** no part of a digit is cut off at the top or bottom

#### Scenario: Seconds changing
- **WHEN** a second passes
- **THEN** the countdown and the clock change their digits without any digit or neighbor shifting

## MODIFIED Requirements

### Requirement: Location and time card
The location and time card SHALL show the place's name, the current time updating each second on a 12-hour clock, and,
when it has something to report about the position, a status line. It SHALL have no control for choosing a place.

#### Scenario: Clock
- **WHEN** a minute passes with the page open
- **THEN** the time shown has moved on by a minute without a reload

#### Scenario: No place controls
- **WHEN** the card is shown
- **THEN** it has no town list and no location button

### Requirement: Prayer times card
The prayer times card SHALL list Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha with their times, named in the page's
language. The current waqt SHALL be highlighted by more than color alone and announced to screen readers as current.
Times of today that have passed SHALL be marked as passed by more than color alone, also for screen readers, and
upcoming ones SHALL be unmarked. Sunrise SHALL be shown as a time, not as a prayer. Below 640px the six SHALL be in
two columns.

#### Scenario: Current waqt highlighted
- **WHEN** Dhuhr is the current waqt
- **THEN** the Dhuhr entry is highlighted, is marked as current for screen readers, and no other entry is

#### Scenario: Passed and upcoming
- **WHEN** Dhuhr is the current waqt
- **THEN** Fajr and sunrise are marked as passed, and Asr, Maghrib and Isha are marked neither passed nor current

#### Scenario: After midnight
- **WHEN** the time is after midnight and before Fajr
- **THEN** Isha is current and none of today's other times is marked as passed

#### Scenario: Phone
- **WHEN** the home page is shown 390px wide
- **THEN** the times read Fajr and sunrise, then Dhuhr and Asr, then Maghrib and Isha, two to a row, with every name,
  time and "Now" marker whole and no sideways scrolling

### Requirement: Countdown card
The countdown card SHALL show a circle that empties as the current period passes, the name of the current waqt, and
the time left until the next one (during Fajr, until sunrise) in hours, minutes and seconds. The time left SHALL also
be readable as text, and a screen reader SHALL hear it once, as one sentence naming what comes next. The circle SHALL
NOT animate when the reader asks for reduced motion, beyond updating its value.

#### Scenario: Half the period passed
- **WHEN** half the time between Asr and Maghrib has passed
- **THEN** the circle is half full, and the card names Asr and shows the time left until Maghrib

#### Scenario: Screen reader
- **WHEN** a screen reader reads the card during Dhuhr with 3 hours 45 minutes left
- **THEN** it hears "Dhuhr" and then "3 hours 45 minutes left until Asr", with no second countdown wording

#### Scenario: Reduced motion
- **GIVEN** the device asks for reduced motion
- **WHEN** the countdown updates
- **THEN** the circle changes without a transition animation

### Requirement: Duas card
The duas card SHALL show a few duas from hand-picked lists, one list each for morning (Fajr until Dhuhr), daytime
(Dhuhr until Asr), evening (Asr until Isha) and night (Isha until Fajr), by the reader's current period. The choice
within a list SHALL change daily and match for every reader on the same date and period. Each SHALL show its title and
Arabic text in the page's language rules and link to the dua on its category page.

#### Scenario: Link to the dua
- **WHEN** the reader activates a dua on the duas card on `/bn`
- **THEN** the browser goes to that dua on its `/bn/duas/...` category page

#### Scenario: Night
- **WHEN** the current period is Isha
- **THEN** the duas shown come from the night list, which holds duas said before sleep

#### Scenario: Period changes with the page open
- **GIVEN** the page is open during Dhuhr
- **WHEN** Asr begins
- **THEN** the duas change to the evening list without a reload

#### Scenario: Next day
- **WHEN** the date changes
- **THEN** the card shows the next duas of the period's list, and wraps to the start after the last

#### Scenario: Period unknown
- **WHEN** the page's scripts have not run, or times cannot be computed
- **THEN** duas from the daytime list are shown

### Requirement: Useful before scripts run
The served HTML of `/` and `/bn` SHALL already contain the duas, categories, hadith list and donation cards. Cards
that depend on the reader's time and place, including the place's name, SHALL show a neutral placeholder until the
page's scripts fill them in, and SHALL NOT show another day's times or another place's name.

#### Scenario: Served HTML
- **WHEN** `/` is fetched without running scripts
- **THEN** the HTML contains the category links and the donation link, no prayer time values and no place name in the
  location card
