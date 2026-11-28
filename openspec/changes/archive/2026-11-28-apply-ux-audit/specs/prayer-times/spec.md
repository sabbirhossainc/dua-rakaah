# Spec Delta

## ADDED Requirements

### Requirement: Location asked when the home page opens
Opening `/` or `/bn` SHALL ask the browser for the device's position, with no control to press. If it is given, the
times SHALL be for that position, named as in "Position named on the device", and the position SHALL be used at once
on later visits while a fresh one is read. No other page SHALL ask for it.

#### Scenario: First visit, allowed
- **WHEN** a reader opens `/` for the first time and allows the location prompt
- **THEN** the place is named for the device's position and the times are for it, without a reload

#### Scenario: Prompt not answered yet
- **GIVEN** a first visit
- **WHEN** the location prompt is waiting for an answer
- **THEN** the page already shows the capital's times, as without a position

#### Scenario: Later visit
- **GIVEN** the reader allowed the position on an earlier visit
- **WHEN** the home page is opened again
- **THEN** the times for the saved position are shown at once, and move to the new position if the device has moved

#### Scenario: Permission withdrawn
- **GIVEN** a position is saved
- **WHEN** the home page is opened and the browser refuses the position
- **THEN** the saved position is removed and the capital's times are shown

#### Scenario: Position temporarily unreadable
- **GIVEN** a position is saved
- **WHEN** the browser cannot read a new position for a reason other than refusal
- **THEN** the times stay for the saved position

#### Scenario: Another page
- **WHEN** a first-time reader opens `/duas/sleep?cat=6`
- **THEN** no location prompt is shown

### Requirement: Position named on the device
With a position, the place SHALL be named by the nearest Bangladesh district for a position in Bangladesh, and
elsewhere by its state or province, or its country where it has none, in the page's language, or in English where no
Bangla name is known.

#### Scenario: In Bangladesh
- **WHEN** a reader in Sylhet town allows the position on `/bn`
- **THEN** the place reads "সিলেট"

#### Scenario: Outside Bangladesh
- **WHEN** a reader in Munich allows the position on `/`
- **THEN** the place reads "Bavaria"

#### Scenario: No Bangla name
- **WHEN** the reader's state has no Bangla name and `/bn` is shown
- **THEN** its English name is shown

### Requirement: Name looked up on the device and kept
The name SHALL be looked up on the device from a table fetched from the app's own origin, with no coordinates in the
request, only when the position is new or has no name. The table SHALL NOT be saved for offline use. The last name
found SHALL be kept with the position and shown until a new one is found; with none the place SHALL read "My location".

#### Scenario: Offline after moving
- **GIVEN** the reader's position was named "Sylhet" online
- **WHEN** the device has moved and the reader opens the home page offline
- **THEN** the place still reads "Sylhet", with the times for the new position, and the name changes once online

#### Scenario: Not saved
- **WHEN** the app is built
- **THEN** the saved set does not contain the places table

### Requirement: Capital without a location
With no position, the place SHALL be the capital of the country of the device's time zone, named in the page's
language. The country SHALL be worked out on the device with no network request. A time zone that names no country
with a known capital SHALL give Dhaka. The page SHALL offer no list of places and no location button.

#### Scenario: Zone with a country
- **GIVEN** a device in the `Europe/London` time zone that refuses the position
- **WHEN** the home page is shown
- **THEN** the place reads "London" and the times are London's

#### Scenario: Older zone name
- **GIVEN** a device that reports `Asia/Calcutta` and refuses the position
- **WHEN** the home page is shown
- **THEN** the place reads "New Delhi"

#### Scenario: Zone away from the capital
- **GIVEN** a device in the `America/Los_Angeles` time zone that refuses the position
- **WHEN** the home page is shown
- **THEN** the place reads "Washington", with Washington's times

#### Scenario: Zone with no country
- **GIVEN** a device set to the `UTC` time zone that refuses the position
- **WHEN** the home page is shown
- **THEN** the place reads "Dhaka" (on `/bn`: "ঢাকা")

#### Scenario: No controls
- **WHEN** the home page is shown with or without a position
- **THEN** it has no town list and no "Use my location" button

### Requirement: Reader told why the capital is shown
When the position is refused, cannot be read or is not supported, and the capital is shown, the page SHALL say why in
the page's language and name the capital it shows. After a refusal it SHALL also say that location can be allowed in
the browser's settings.

#### Scenario: Position refused
- **WHEN** the reader refuses the location prompt
- **THEN** the page says location was not allowed, names the capital shown, and mentions the browser's settings

#### Scenario: Not supported
- **WHEN** the browser has no geolocation, or the page is not on HTTPS or localhost
- **THEN** the page says the location is not available and names the capital shown

### Requirement: Twelve-hour clock
The live clock and every prayer time SHALL use a 12-hour clock with AM or PM, in the page's digits, whether the place
is the device's position or a capital. The time left SHALL stay in hours, minutes and seconds.

#### Scenario: Afternoon time
- **WHEN** a time of 15:44 is shown on `/`
- **THEN** it reads "3:44 PM"

#### Scenario: After midnight
- **WHEN** the clock is at five past midnight
- **THEN** it reads 12:05 with AM, not 00:05

#### Scenario: Bangla digits
- **WHEN** a time of 15:44 is shown on `/bn`
- **THEN** its hour and minute are in Bangla digits, as 3 and 44, marked PM

#### Scenario: Time left
- **WHEN** three hours and 45 minutes are left
- **THEN** the countdown reads "03:45:00"

### Requirement: Clock and times follow the place
Times and the live clock SHALL be shown in the time zone of the place: the device's zone for the device's position,
and the capital's own zone for a capital.

#### Scenario: Capital in another zone
- **GIVEN** a device in the `America/Los_Angeles` time zone with no position
- **WHEN** Washington's times are shown
- **THEN** the clock and the times are in Washington's time zone

#### Scenario: Device position
- **GIVEN** a device in the London time zone that gave its position
- **WHEN** the home page is shown
- **THEN** the clock and the times are shown in the London zone

## MODIFIED Requirements

### Requirement: Times computed on the device
The app SHALL compute Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha for the reader's place and the current date in the
reader's browser. It SHALL use the University of Islamic Sciences, Karachi method, with Asr by the Hanafi rule. It
SHALL NOT call any service to get prayer times.

#### Scenario: Times for Dhaka
- **GIVEN** the place is Dhaka, the capital shown without a position
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

### Requirement: Location stays on the device
A position from the browser SHALL be kept only in the browser's own storage. It SHALL NOT be sent to the app's server
or any other service, SHALL NOT be synced to other devices, and SHALL be removed by "Delete my data". A town saved by
an earlier version SHALL be ignored.

#### Scenario: Next visit
- **GIVEN** the reader allowed the position yesterday
- **WHEN** the reader opens the home page today
- **THEN** the times are for the saved position while a new one is read

#### Scenario: Not sent
- **WHEN** the reader allows the position and the place is named
- **THEN** no request to the app's server or any other origin carries the coordinates

#### Scenario: Delete my data
- **WHEN** the reader deletes their data at `/account`
- **THEN** the saved position is removed

#### Scenario: Town saved earlier
- **GIVEN** the reader picked Sylhet with an earlier version and now refuses the position
- **WHEN** the home page is opened
- **THEN** the capital for the device's time zone is shown, and the Hijri adjustment is kept

## REMOVED Requirements

### Requirement: Times shown in the place's time zone
**Reason**: There are no picked towns any more, and a capital is shown in its own time zone.
**Migration**: See "Clock and times follow the place".

### Requirement: Place defaults to Dhaka
**Reason**: Without a position the place is now the capital of the visitor's country, and the position is asked for
when the home page opens.
**Migration**: See "Capital without a location" and "Location asked when the home page opens". Dhaka remains the result
when no capital can be worked out.

### Requirement: Use my location on request
**Reason**: The position is detected automatically; the button is removed.
**Migration**: A reader who refused can allow location in the browser's settings and open the page again.

### Requirement: Pick a town
**Reason**: Readers no longer choose a place.
**Migration**: Readers outside the capital allow location. A saved town is ignored.
