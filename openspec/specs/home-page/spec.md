# home-page Specification

## Purpose

Defines what the home page shows at `/` (English) and `/bn` (Bangla): its cards, their order, where their content
comes from, and how the page behaves before scripts run and offline.

## Requirements

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

### Requirement: Soft background in both themes
The cards SHALL sit on a soft Islamic geometric pattern that is the app's own artwork and is served from the app's
origin. The pattern SHALL be faint enough that every card's text keeps a contrast of at least 4.5:1, and SHALL have a
dark version for the dark theme.

#### Scenario: Dark theme
- **GIVEN** the reader chose the dark theme
- **WHEN** the home page is shown
- **THEN** the background pattern and the cards use the dark colors, with no light flash on load

#### Scenario: Asset origin
- **WHEN** the home page loads
- **THEN** the pattern is loaded from the app's own origin, and no asset comes from `duaruqyah.com`

### Requirement: Location and time card
The location and time card SHALL show the chosen place's name, the current time updating each second, the "Use my
location" control and the town list.

#### Scenario: Clock
- **WHEN** a minute passes with the page open
- **THEN** the time shown has moved on by a minute without a reload

### Requirement: Today card
The today card SHALL show, in the page's language and digits, the weekday, the Hijri date by the Umm al-Qura calendar
and the Gregorian date. It SHALL let the reader move the Hijri date one day back or forward, and SHALL keep that choice
on the device only.

#### Scenario: English
- **WHEN** a reader opens `/` on 2026-11-26 with no adjustment
- **THEN** the card shows Thursday, 16 Jumada II 1448 AH and 26 November 2026

#### Scenario: Bangla digits
- **WHEN** a reader opens `/bn` on 2026-11-26 with no adjustment
- **THEN** the weekday and both dates use Bangla words and digits, for example "১৬" and "১৪৪৮"

#### Scenario: Adjustment
- **WHEN** the reader sets the Hijri adjustment to −1 day
- **THEN** the card shows 15 Jumada II 1448, and still does on the next visit on that device

### Requirement: Prayer times card
The prayer times card SHALL list Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha with their times, named in the page's
language. The current waqt SHALL be highlighted by more than color alone and announced to screen readers as current.
Sunrise SHALL be shown as a time, not as a prayer.

#### Scenario: Current waqt highlighted
- **WHEN** Dhuhr is the current waqt
- **THEN** the Dhuhr row is highlighted, is marked as current for screen readers, and no other row is

### Requirement: Countdown card
The countdown card SHALL show a circle that empties as the current period passes, the name of the current waqt, and
the time left until the next one (during Fajr, until sunrise) in hours, minutes and seconds. The time left SHALL also be readable as text. The
circle SHALL NOT animate when the reader asks for reduced motion, beyond updating its value.

#### Scenario: Half the period passed
- **WHEN** half the time between Asr and Maghrib has passed
- **THEN** the circle is half full, and the card names Asr and shows the time left until Maghrib

#### Scenario: Reduced motion
- **GIVEN** the device asks for reduced motion
- **WHEN** the countdown updates
- **THEN** the circle changes without a transition animation

### Requirement: Duas card
The duas card SHALL show a few duas from the content database, taken from a hand-picked list. Which ones are shown
SHALL change once a day by the reader's date, and SHALL be the same for every reader on the same date. Each SHALL show
its title and Arabic text in the page's language rules and link to the dua on its category page.

#### Scenario: Link to the dua
- **WHEN** the reader activates a dua on the duas card on `/bn`
- **THEN** the browser goes to that dua on its `/bn/duas/...` category page

#### Scenario: Next day
- **WHEN** the date changes
- **THEN** the card shows the next duas from the list, and wraps to the start after the last

### Requirement: Categories card
The categories card SHALL show every category in the content database with its name, image and dua count, linking to
its category page in the page's language, as on `/duas` and `/bn/duas`.

#### Scenario: Category link
- **WHEN** the reader activates "Sleep" on `/`
- **THEN** the browser goes to `/duas/sleep?cat=6`

### Requirement: Hadith card
The hadith card SHALL show one hadith quote from the content database, taken from a hand-picked list, with its
reference in the page's language. It SHALL change once a day by the reader's date. A quote with no text in the page's
language SHALL NOT be shown on that page.

#### Scenario: Reference shown
- **WHEN** the hadith card is shown
- **THEN** it shows the quote and its reference, for example "Bukhari: 6406"

#### Scenario: Missing Bangla text
- **GIVEN** a listed quote has English text but no Bangla text
- **WHEN** `/bn` is shown on the day that quote would be chosen
- **THEN** the card shows the next quote that has Bangla text instead

### Requirement: Donation card
The donation card SHALL invite readers to support the app and link to `/support`. It SHALL NOT take payment details on
the home page.

#### Scenario: Donate
- **WHEN** the reader activates the donation card's button
- **THEN** the browser goes to `/support`

### Requirement: Useful before scripts run
The served HTML of `/` and `/bn` SHALL already contain the duas, categories, hadith list and donation cards, and the
place's name. Cards that depend on the reader's time and place SHALL show a neutral placeholder until the page's
scripts fill them in, and SHALL NOT show another day's times.

#### Scenario: Served HTML
- **WHEN** `/` is fetched without running scripts
- **THEN** the HTML contains the category links and the donation link, and no prayer time values

### Requirement: Home page metadata
`/` SHALL keep the site's default title. `/bn` SHALL have a Bangla title. Both SHALL be indexable by search engines.

#### Scenario: Bangla title
- **WHEN** `/bn` is fetched
- **THEN** its `<title>` is in Bangla and ends with the site's title suffix

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
