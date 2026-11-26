# Spec Delta

## ADDED Requirements

### Requirement: Home page readable offline
After the app has finished installing, `/` and `/bn` SHALL load with no network, show every card, and compute the
prayer times, the countdown and the Hijri date as when online. Only "Use my location" MAY depend on the device's own
location service.

#### Scenario: Bangla home page offline
- **GIVEN** a reader opened `/duas` online and waited for the app to finish installing
- **WHEN** the network is turned off and the reader opens `/bn`
- **THEN** all eight cards are shown in Bangla, with the day's prayer times and a running countdown

#### Scenario: Town list offline
- **GIVEN** an offline reader on `/`
- **WHEN** the reader picks another district town
- **THEN** the times are recomputed for it with no network

#### Scenario: Saved set
- **WHEN** the app is built
- **THEN** the saved set contains both `/` and `/bn`, and the home page's background pattern
