# data-sync Specification

## Purpose

Defines how reader data is kept on the device first and copied to the server afterwards, so the app works fully
offline, never waits for the network, and ends up with the same data on every device of the same reader.

## Requirements

### Requirement: Changes are saved on the device first
Every change the reader makes to their data SHALL be saved on the device before anything else happens, and the
interface SHALL show the result without waiting for the network.

#### Scenario: Change while offline
- **GIVEN** the device is offline
- **WHEN** the reader makes a change
- **THEN** the change is saved on the device and shown at once, and it is queued to be sent later

#### Scenario: Server unreachable
- **WHEN** the reader makes a change and the server does not answer
- **THEN** the change stays saved and queued, and no error blocks the reader

### Requirement: Queued changes are sent when possible
The app SHALL send queued changes to the server, and receive other devices' changes, after each local change, when
the browser reports it is back online, when the page regains focus, and at a regular interval while the page is open.

#### Scenario: Back online
- **GIVEN** three changes are queued
- **WHEN** the browser comes back online
- **THEN** all three are sent in one request and removed from the queue once the server confirms them

#### Scenario: Failed send
- **WHEN** a send fails or the server answers with an error
- **THEN** the changes stay queued and are sent again at the next opportunity

### Requirement: A change takes effect only once
The server SHALL apply each change at most once, however many times the same change is sent, and a repeated send
SHALL still receive a normal answer.

#### Scenario: Same change sent twice
- **GIVEN** the server has applied a change
- **WHEN** the same change is sent again, for example after a lost response
- **THEN** the stored data does not change a second time and the request succeeds

### Requirement: Newest change wins for single-value records
For a record that has one current state (a bookmark), the change with the later time SHALL win. If the times are
equal, the change with the greater change identifier SHALL win, so every device picks the same one. Removing a
record SHALL be recorded as a change, so a removal made offline reaches the other devices.

#### Scenario: Two devices change the same bookmark
- **GIVEN** device A removes a bookmark at 10:00 and device B adds it back at 10:05
- **WHEN** both changes reach the server in either order
- **THEN** the bookmark exists on both devices

#### Scenario: Equal times
- **WHEN** two changes to one bookmark have the same time
- **THEN** the change with the greater identifier wins on every device, whatever order they arrived in

#### Scenario: Offline removal
- **GIVEN** device A removes a bookmark while offline
- **WHEN** device A syncs
- **THEN** device B no longer shows the bookmark after its next sync

### Requirement: Devices pull by server position
The server SHALL give every accepted change a position from one increasing counter, and a device SHALL ask for
everything after the last position it has seen. Device clocks SHALL NOT decide what a device receives.

#### Scenario: Device clock is wrong
- **GIVEN** device A's clock is a day behind and it changes a bookmark
- **WHEN** device B, which synced before, syncs
- **THEN** device B receives the change

#### Scenario: Nothing new
- **WHEN** a device syncs and no change is newer than its position
- **THEN** it receives no records and keeps its position

### Requirement: Devices converge
After all changes from all devices have been sent and received, every device of one reader SHALL hold the same
data, whatever order the changes were created in, sent in or received in, and however often a request was repeated.

#### Scenario: Random order replay
- **GIVEN** several simulated devices make random changes to the same bookmarks
- **WHEN** their changes are delivered in random order, some more than once, and every device then syncs
- **THEN** all devices and the server hold identical data

### Requirement: The database token stays on the server
The browser SHALL only talk to the app's own sync and sign-in routes. The credentials for the shared database
SHALL NOT be sent to the browser or included in any file served to it.

#### Scenario: Built files
- **WHEN** the production build is searched for the database token and URL
- **THEN** neither is found in any file under `.next/static` or any page response

### Requirement: Sync requests are validated
The server SHALL reject a sync request that is malformed, names a record type it does not know, has a dua
identifier that is not a positive integer, or carries more changes than a fixed limit, and SHALL NOT change any data
for a rejected request.

#### Scenario: Bad request body
- **WHEN** a request has no change list, or a change with an unknown type
- **THEN** the server answers with a 400 status and stores nothing

#### Scenario: Too many changes
- **WHEN** a request carries more changes than the limit
- **THEN** the server answers with a 413 status and stores nothing, and the device sends the queue in smaller batches

### Requirement: Sync never reaches the offline cache
Sync and sign-in requests SHALL always go to the network and SHALL NOT be stored or replayed by the offline layer.

#### Scenario: Sync response
- **WHEN** the browser calls the sync route
- **THEN** no copy of the response is saved by the service worker
