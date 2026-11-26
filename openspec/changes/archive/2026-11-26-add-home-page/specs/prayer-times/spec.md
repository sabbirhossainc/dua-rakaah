# Spec Delta

## Purpose

Works out the day's prayer times for the reader's chosen place, which waqt is current and how long is left, on the
reader's device, without sending the reader's location anywhere.

## ADDED Requirements

### Requirement: Times computed on the device
The app SHALL compute Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha for the chosen place and the current date in the
reader's browser. It SHALL use the University of Islamic Sciences, Karachi method, with Asr by the Hanafi rule. It
SHALL NOT call any service to get prayer times.

#### Scenario: Times for Dhaka
- **GIVEN** the chosen place is Dhaka
- **WHEN** the home page is shown on 2026-11-26
- **THEN** the six times shown equal the Karachi method's times for Dhaka's coordinates on that date, with the Hanafi
  Asr, to the minute

#### Scenario: No prayer-time request
- **WHEN** the home page computes and shows the times
- **THEN** no network request is made for them

#### Scenario: Offline
- **GIVEN** the home page is saved for offline use
- **WHEN** the reader opens it with no network
- **THEN** the times are computed and shown as when online

### Requirement: Times shown in the place's time zone
Times and the live clock SHALL be shown in the time zone of the chosen place: the town's own zone for a place picked
from the list, and the device's zone for "Use my location" and for the default.

#### Scenario: Device in another zone, Dhaka picked
- **GIVEN** a device set to the London time zone
- **WHEN** the reader has picked Dhaka from the list
- **THEN** the clock and the times are shown in Dhaka time (Asia/Dhaka)

### Requirement: Current waqt
The current waqt SHALL be the prayer whose start time has passed most recently: Fajr from Fajr until sunrise, Dhuhr
until Asr, Asr until Maghrib, Maghrib until Isha, and Isha until the next day's Fajr. From sunrise until Dhuhr no waqt
SHALL be current.

#### Scenario: During Asr
- **WHEN** the time is after Asr and before Maghrib
- **THEN** Asr is shown as the current waqt, and Maghrib as the next one

#### Scenario: After midnight
- **WHEN** the time is 01:00, after Isha and before Fajr
- **THEN** Isha is the current waqt, and the next one is that day's Fajr

#### Scenario: Between sunrise and Dhuhr
- **WHEN** the time is after sunrise and before Dhuhr
- **THEN** no prayer is marked current, the page says no obligatory prayer is due, and the next waqt is Dhuhr

### Requirement: Time left
The app SHALL show the time left until the next waqt starts, and the share of the current period that has passed.
During Fajr it SHALL instead count down to sunrise, when Fajr ends, and say so. It SHALL update at least once a second while the page is visible, and SHALL move to the next waqt when its time comes
without a reload. When the date changes it SHALL compute the new day's times.

#### Scenario: During Fajr
- **WHEN** the time is after Fajr and before sunrise
- **THEN** the time left is until sunrise, labeled as such, and the share passed is of the time from Fajr to sunrise

#### Scenario: Countdown reaches zero
- **WHEN** the time left reaches zero
- **THEN** the next waqt becomes current, and the countdown starts again for the one after it

#### Scenario: Tab hidden and shown again
- **GIVEN** the tab was hidden for an hour
- **WHEN** it is shown again
- **THEN** the current waqt and the time left are correct at once, not an hour behind

### Requirement: Place defaults to Dhaka
Until the reader chooses, the place SHALL be Dhaka, named as such. The app SHALL NOT ask for the device's position on
page load.

#### Scenario: First visit
- **WHEN** a reader opens the home page for the first time
- **THEN** the times are for Dhaka, and the browser shows no location prompt

### Requirement: Use my location on request
A "Use my location" control SHALL ask the browser for the device's position only when the reader activates it. If the
position is given, the times SHALL be for that position, labeled "My location". If it is refused or fails, the
previous place SHALL stay and the page SHALL say why in the page's language.

#### Scenario: Position given
- **WHEN** the reader activates "Use my location" and allows it
- **THEN** the times are for the device's position, and the place reads "My location"

#### Scenario: Position refused
- **WHEN** the reader activates "Use my location" and the browser refuses
- **THEN** the times stay for the previous place, and the page says the location was not allowed

#### Scenario: Not supported
- **WHEN** the browser has no geolocation, or the page is not on HTTPS or localhost
- **THEN** "Use my location" says it is not available, and the town list still works

### Requirement: Pick a town
The reader SHALL be able to pick a place from a list of Bangladesh's 64 district towns, named in the page's language.
The list SHALL be usable with the keyboard and SHALL work offline.

#### Scenario: Pick Chattogram
- **WHEN** the reader picks Chattogram
- **THEN** the times are recomputed for Chattogram, and the place reads "Chattogram" (on `/bn`: "চট্টগ্রাম")

### Requirement: Location stays on the device
The chosen place, including a position from "Use my location", SHALL be kept only in the browser's own storage, and
SHALL be used again on the next visit on that device. It SHALL NOT be sent to the app's server or any other service,
SHALL NOT be synced to other devices, and SHALL be removed by "Delete my data".

#### Scenario: Next visit
- **GIVEN** the reader picked Sylhet yesterday
- **WHEN** the reader opens the home page today
- **THEN** the times are for Sylhet

#### Scenario: Not sent
- **WHEN** the reader uses "Use my location"
- **THEN** no request to the app's server or any other origin carries the coordinates

#### Scenario: Delete my data
- **WHEN** the reader deletes their data at `/account`
- **THEN** the saved place is removed, and the home page is back to Dhaka

### Requirement: Times are labeled as a guide
The prayer times card SHALL say that the times are calculated, name the method and the Asr rule, and suggest checking
with the local mosque.

#### Scenario: Note on the card
- **WHEN** the prayer times card is shown
- **THEN** it says the times are calculated by the Karachi method with Hanafi Asr, and to check with the local mosque

### Requirement: Places where times cannot be computed
When a time cannot be computed for the chosen position and date, as can happen near the poles, the app SHALL say so
instead of showing wrong times, and SHALL NOT show a countdown.

#### Scenario: Invalid times
- **GIVEN** a position where Isha cannot be computed on that date
- **WHEN** the home page shows the times
- **THEN** the card says the times cannot be calculated for this place today, and no countdown is shown
