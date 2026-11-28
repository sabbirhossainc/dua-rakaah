# home-page Specification

## Purpose

Defines what the home page shows at `/` (English) and `/bn` (Bangla): its cards, their order, where their content
comes from, and how the page behaves before scripts run and offline.

## Requirements

### Requirement: Cards in a fixed order
The home page SHALL show these cards, each as a separate section with its own heading, in this order: location and
time, today, prayer times, countdown, duas, categories, hadith. The first four SHALL be shown together in one prayer
band at the top of the page. From 1024px wide, location and time, today and countdown SHALL sit side by side in one row
of equal height with their tops aligned, and prayer times SHALL follow them. Below 1024px the cards SHALL stack in one
column in the same order.

#### Scenario: Order on a phone
- **WHEN** a reader opens `/` on a 390px-wide screen
- **THEN** the seven cards appear one under another in the order above
- **AND** the first four are inside the prayer band

#### Scenario: Order on a desktop
- **WHEN** a reader opens `/` on a 1440px-wide screen
- **THEN** location and time, today and countdown are in one row with their tops and bottoms aligned, prayer times
  follow them inside the band, and the document order of all seven cards is still the order above

#### Scenario: No donation card
- **WHEN** a reader opens `/` or `/bn`
- **THEN** no card invites the reader to donate and no link on the page goes to `/support`

#### Scenario: Bangla home page
- **WHEN** a reader opens `/bn`
- **THEN** the same seven cards appear, with Bangla labels and Bangla content, and the content area's `lang` is `bn`

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
The location and time card SHALL show the place's name, the current time updating each second on a 12-hour clock, and,
when it has something to report about the position, a status line. It SHALL have no control for choosing a place.

#### Scenario: Clock
- **WHEN** a minute passes with the page open
- **THEN** the time shown has moved on by a minute without a reload

#### Scenario: No place controls
- **WHEN** the card is shown
- **THEN** it has no town list and no location button

### Requirement: Today card
The today card SHALL show, in the page's language and digits, the weekday, the Hijri date by the Umm al-Qura calendar
and the Gregorian date. It SHALL NOT offer any control to adjust the Hijri date, and SHALL ignore any adjustment kept on
the device from earlier versions.

#### Scenario: English
- **WHEN** a reader opens `/` on 2026-11-26
- **THEN** the card shows Thursday, 16 Jumada II 1448 AH and 26 November 2026

#### Scenario: Bangla digits
- **WHEN** a reader opens `/bn` on 2026-11-26
- **THEN** the weekday and both dates use Bangla words and digits, for example "১৬" and "১৪৪৮"

#### Scenario: Adjustment
- **WHEN** the today card is shown
- **THEN** it holds no −1, 0 or +1 control and no other input

#### Scenario: Earlier adjustment ignored
- **GIVEN** the device kept a Hijri adjustment of −1 from an earlier version
- **WHEN** a reader opens `/` on 2026-11-26
- **THEN** the card shows 16 Jumada II 1448

### Requirement: Prayer times card
The prayer times card SHALL list Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha with their times, named in the page's
language. Every entry SHALL have a border of the same width, with at least 3:1 contrast against the card. The current
waqt SHALL be highlighted by more than color alone, SHALL carry a "Now" badge in the page's language pinned to its
top-right corner, and SHALL be announced to screen readers as current. Times of today that have passed SHALL be marked
as passed by more than color alone, also for screen readers, and upcoming ones SHALL be unmarked. Sunrise SHALL be
shown as a time, not as a prayer. Below 640px the six SHALL be in two columns.

#### Scenario: Current waqt highlighted
- **WHEN** Dhuhr is the current waqt
- **THEN** the Dhuhr entry is highlighted, has the "Now" badge at its top-right corner, is marked as current for screen
  readers, and no other entry has either

#### Scenario: Uniform borders
- **WHEN** the prayer times card is shown
- **THEN** all six entries have a border of the same width, and the badge does not change the size of its entry

#### Scenario: Passed and upcoming
- **WHEN** Dhuhr is the current waqt
- **THEN** Fajr and sunrise are marked as passed, and Asr, Maghrib and Isha are marked neither passed nor current

#### Scenario: After midnight
- **WHEN** the time is after midnight and before Fajr
- **THEN** Isha is current and none of today's other times is marked as passed

#### Scenario: Phone
- **WHEN** the home page is shown 390px wide
- **THEN** the times read Fajr and sunrise, then Dhuhr and Asr, then Maghrib and Isha, two to a row, with every name,
  time and "Now" badge whole, the badge not covering the name or time, and no sideways scrolling

### Requirement: Countdown card
The countdown card SHALL show a circle that empties as the current period passes, the name of the current waqt, and
the time left until the next one (during Fajr, until sunrise) in hours, minutes and seconds. The digits of the time left
SHALL be shown whole, never clipped by the card or the circle, at every width and text size setting. The time left
SHALL also be readable as text, and a screen reader SHALL hear it once, as one sentence naming what comes next. The
circle SHALL NOT animate when the reader asks for reduced motion, beyond updating its value.

#### Scenario: Half the period passed
- **WHEN** half the time between Asr and Maghrib has passed
- **THEN** the circle is half full, and the card names Asr and shows the time left until Maghrib

#### Scenario: Digits not clipped
- **WHEN** the countdown shows "10:59:59" at the largest text size on a 1024px-wide screen
- **THEN** every digit is drawn whole, with nothing cut off at the top or bottom

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

### Requirement: Categories card
The categories card SHALL show every category in the content database with its name, image and dua count, linking to
its category page in the page's language, as on `/duas` and `/bn/duas`. It SHALL NOT show subcategory counts or names.

#### Scenario: Category link
- **WHEN** the reader activates "Sleep" on `/`
- **THEN** the browser goes to `/duas/sleep?cat=6`

### Requirement: Hadith card
The hadith card SHALL show one hadith quote from the content database, taken from a hand-picked list of at least 30
quotes, with its reference in the page's language. Each date SHALL have a set of five quotes, one for each prayer
period: Fajr (Fajr until Dhuhr, sunrise included), Dhuhr, Asr, Maghrib and Isha (Isha until the next Fajr). The card
SHALL show the quote of the current period. The set SHALL be chosen from the reader's date so that every reader on the
same date and period sees the same quote, the five quotes of a day SHALL be different, and consecutive days SHALL NOT
share a quote. A quote with no text in the page's language SHALL NOT be shown on that page.

#### Scenario: Reference shown
- **WHEN** the hadith card is shown
- **THEN** it shows the quote and its reference, for example "Bukhari: 6406"

#### Scenario: Period changes with the page open
- **GIVEN** the page is open during Asr
- **WHEN** Maghrib begins
- **THEN** the card shows the day's Maghrib quote without a reload, and it differs from the Asr quote

#### Scenario: Five a day
- **WHEN** the card is read once in each of the five periods of one date
- **THEN** five different quotes are shown

#### Scenario: New set the next day
- **WHEN** the date changes
- **THEN** none of the five quotes of the new date was among the previous date's five

#### Scenario: Before Fajr
- **WHEN** the time is after midnight and before Fajr
- **THEN** the card shows the Isha quote of the date on which that Isha began

#### Scenario: Period unknown
- **WHEN** the page's scripts have not run, or times cannot be computed
- **THEN** the card shows the date's Dhuhr quote

#### Scenario: Missing Bangla text
- **GIVEN** a quote chosen for the period has English text but no Bangla text
- **WHEN** `/bn` is shown in that period
- **THEN** the card shows the next quote in the list that has Bangla text and is not among the day's other four

### Requirement: Useful before scripts run
The served HTML of `/` and `/bn` SHALL already contain the duas, categories, hadith list and donation cards. Cards
that depend on the reader's time and place, including the place's name, SHALL show a neutral placeholder until the
page's scripts fill them in, and SHALL NOT show another day's times or another place's name.

#### Scenario: Served HTML
- **WHEN** `/` is fetched without running scripts
- **THEN** the HTML contains the category links and the donation link, no prayer time values and no place name in the
  location card

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
