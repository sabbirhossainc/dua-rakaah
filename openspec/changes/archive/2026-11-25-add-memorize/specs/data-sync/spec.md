# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Devices converge
After all changes from all devices have been sent and received, every device of one reader SHALL hold the same
data, whatever order the changes were created in, sent in or received in, and however often a request was repeated.
This SHALL hold for every kind of record, and for bookmarks and memorize records changed in the same schedule.

#### Scenario: Random order replay
- **GIVEN** several simulated devices make random changes to the same bookmarks and the same memorize records
- **WHEN** their changes are delivered in random order, some more than once, and every device then syncs
- **THEN** all devices and the server hold identical data

#### Scenario: Memorize result is the combination of all changes
- **GIVEN** several simulated devices make random memorize changes, including resets
- **WHEN** every change has been delivered
- **THEN** the server's record for each dua equals the merge of every change made, however the changes were ordered
