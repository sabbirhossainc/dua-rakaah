# Spec Delta

## ADDED Requirements

### Requirement: Home page works offline
After the app has finished installing, `/` and `/bn` SHALL load with no network, show every card, and compute the
prayer times, the countdown and the Hijri date as when online. Only reading the device's position MAY depend on the
device's own location service; without it the saved position or the capital SHALL be used. A saved position SHALL show
the name last found for it.

#### Scenario: Bangla home page offline
- **GIVEN** a reader opened `/duas` online and waited for the app to finish installing
- **WHEN** the network is turned off and the reader opens `/bn`
- **THEN** all eight cards are shown in Bangla, with the day's prayer times and a running countdown

#### Scenario: Capital offline
- **GIVEN** an offline reader who has not allowed the position
- **WHEN** the reader opens `/`
- **THEN** the capital for the device's time zone and its times are shown with no network

#### Scenario: Saved set
- **WHEN** the app is built
- **THEN** the saved set contains both `/` and `/bn`, and the home page's background pattern

## REMOVED Requirements

### Requirement: Home page readable offline
**Reason**: It covered the town list, which is removed.
**Migration**: See "Home page works offline".
