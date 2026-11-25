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
This SHALL hold for every kind of record, and for bookmarks, memorize records and settings changed in the same schedule.

#### Scenario: Random order replay
- **GIVEN** several simulated devices make random changes to the same bookmarks, the same memorize records and the same settings
- **WHEN** their changes are delivered in random order, some more than once, and every device then syncs
- **THEN** all devices and the server hold identical data

#### Scenario: Memorize result is the combination of all changes
- **GIVEN** several simulated devices make random memorize changes, including resets
- **WHEN** every change has been delivered
- **THEN** the server's record for each dua equals the merge of every change made, however the changes were ordered

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

### Requirement: Furthest progress wins for memorize records
For a memorize record (the learned flag and progress of one dua), the merge SHALL keep the larger learned flag and
the larger progress, field by field, so changes made on different devices add up instead of overwriting each other.
The result SHALL be the same for any order and any repetition of the changes, and SHALL NOT depend on any device's clock.

#### Scenario: Two devices make progress
- **GIVEN** device A sets a dua to progress 50 and device B sets it to progress 75, both from the same starting point
- **WHEN** both changes reach the server in either order
- **THEN** the dua is at progress 75 on every device

#### Scenario: Learned on one device, progress on another
- **GIVEN** device A marks a dua learned (progress 100) and device B, from the same starting point, sets it to progress 50 and not learned
- **WHEN** both changes reach the server in either order
- **THEN** the dua is learned at progress 100 on every device

#### Scenario: Repeated change
- **WHEN** the same memorize change is sent twice
- **THEN** the stored record is the same as after the first time

### Requirement: A reset replaces older progress
A change that goes backwards on purpose (un-ticking learned, lowering progress, starting over) SHALL carry a higher
reset generation for that dua. A record with a higher reset generation SHALL replace one with a lower generation
outright, whatever the values. Changes with the same generation SHALL be merged by the furthest-progress rule.

#### Scenario: A reset beats older progress
- **GIVEN** a dua at progress 75 on device A, and device B lowers it to 25 as a reset
- **WHEN** the changes are merged in either order
- **THEN** the dua is at progress 25 on every device

#### Scenario: Progress made before a reset arrives late
- **GIVEN** a reset to progress 25 is already on the server
- **WHEN** a change from before the reset (progress 75, older reset generation) arrives afterwards
- **THEN** the dua stays at progress 25

#### Scenario: Two devices reset at the same time
- **GIVEN** device A resets a dua to progress 25 and device B resets it to progress 50, both from the same starting point
- **WHEN** both changes reach the server in either order
- **THEN** both resets have the same generation and the dua is at progress 50 on every device

### Requirement: Memorize changes are validated
The server SHALL reject a memorize change whose learned flag is not 0 or 1, whose progress is not a whole number from
0 to 100, or whose reset generation is not a whole number from 0 to a fixed upper bound, and SHALL NOT change any data
for a rejected request.

#### Scenario: Progress out of range
- **WHEN** a request carries a memorize change with progress 101, or -1, or 12.5
- **THEN** the server answers with a 400 status and stores nothing

#### Scenario: Bad flag or generation
- **WHEN** a request carries a memorize change with learned 2, or a negative or fractional reset generation
- **THEN** the server answers with a 400 status and stores nothing

### Requirement: A device receives only the record types it understands
A sync request MAY name the record types the device can store. The server SHALL return only records of those types,
and SHALL treat a request that names none as asking for bookmarks only. A device that starts to understand a new record
type SHALL fetch the existing records of that type once, from the beginning.

#### Scenario: Older code
- **GIVEN** a device whose code knows only bookmarks, and an account that has memorize records
- **WHEN** that device syncs
- **THEN** it receives bookmark records only

#### Scenario: Newer code
- **GIVEN** a device that names bookmarks and memorize records, and an account that has both
- **WHEN** the device syncs
- **THEN** it receives both kinds, in server position order

#### Scenario: Upgrade
- **GIVEN** a device that has synced for a while with code that knew only bookmarks
- **WHEN** it first runs code that also knows memorize records
- **THEN** its next sync asks from the beginning, so memorize records saved earlier on the account are received

### Requirement: Newest change wins for settings
For a setting (one value per setting name), the change with the later time SHALL win. If the times are equal, the
change with the greater change identifier SHALL win, so every device picks the same one. Setting a value back to its
default SHALL be an ordinary change that is stored, so it reaches the other devices.

#### Scenario: Two devices change the same setting
- **GIVEN** device A selects dark at 10:00 and device B selects light at 10:05
- **WHEN** both changes reach the server in either order
- **THEN** the setting is light on every device

#### Scenario: Equal times
- **WHEN** two changes to one setting have the same time
- **THEN** the change with the greater identifier wins on every device, whatever order they arrived in

#### Scenario: Back to the default is kept
- **GIVEN** the account has the dark appearance saved
- **WHEN** another device selects light, which is the default
- **THEN** the account's appearance is light on every device after they sync

### Requirement: Setting changes are validated
The server SHALL reject a setting change whose name is not one of the known settings, or whose value is not valid for
that setting, and SHALL NOT change any data for a rejected request.

#### Scenario: Unknown setting
- **WHEN** a request carries a setting change with a name the server does not know
- **THEN** the server answers with a 400 status and stores nothing

#### Scenario: Value out of range
- **WHEN** a request carries a change that sets the appearance to anything but light or dark, or the Arabic text size to anything but small, medium, large or xlarge, or the reciter to anything but a positive whole number
- **THEN** the server answers with a 400 status and stores nothing

#### Scenario: Missing name or value
- **WHEN** a setting change has no name, or has a value that is not text
- **THEN** the server answers with a 400 status and stores nothing

### Requirement: Records are named by their own key
A change and a record sent to a device SHALL identify the record by the key its kind uses: a dua number for bookmarks
and memorize records, a setting name for settings. A device SHALL keep the changes of every kind queued and sent in the
order they were made.

#### Scenario: Mixed queue
- **GIVEN** a device has queued a bookmark, a memorize change and a setting change
- **WHEN** it syncs
- **THEN** all three are sent in the order they were made, and each is applied to its own kind of record

#### Scenario: Bookmarks and memorize are unchanged
- **WHEN** a request carries bookmark or memorize changes in the form older versions of the app send
- **THEN** the server accepts them exactly as before
