# Spec Delta

## ADDED Requirements

### Requirement: Old removal records can be purged
An operator command SHALL delete removed bookmarks and applied change identifiers that the server accepted more than
180 days before it runs, measured by the server's clock. It SHALL NOT delete other records, SHALL be safe to repeat,
and SHALL offer a dry run that only reports counts. Nothing SHALL be purged unless the command is run.

#### Scenario: Old and recent removals
- **GIVEN** one bookmark removal accepted 200 days ago and one accepted 10 days ago
- **WHEN** the purge runs
- **THEN** only the older removal is deleted

#### Scenario: Live records stay
- **GIVEN** bookmarks, memorize records and settings older than 180 days that were not removed
- **WHEN** the purge runs
- **THEN** all of them remain

#### Scenario: Dry run
- **WHEN** the command runs as a dry run
- **THEN** it reports how many rows would be deleted and changes nothing

### Requirement: A device that missed a purge is refreshed
When a device has not synced past a purged removal, the server SHALL send all of the owner's records, and the device
SHALL drop every local bookmark the server no longer holds, unless an unsent change newer than the purged removals
claims it.

#### Scenario: Removal never seen
- **GIVEN** device B last synced before a bookmark was removed, and the removal has since been purged
- **WHEN** device B syncs
- **THEN** device B no longer shows the bookmark

#### Scenario: Up-to-date device
- **GIVEN** a device that synced after the purged removals
- **WHEN** it syncs
- **THEN** it receives only what is new

#### Scenario: Recent offline change
- **GIVEN** device B missed a purge and has an unsent bookmark newer than the purged removals
- **WHEN** device B syncs
- **THEN** the bookmark is stored and stays on device B

### Requirement: Old changes do not bring back purged bookmarks
From a device that missed a purge, the server SHALL ignore a bookmark change for a dua it holds no record of when the
change is not newer than the owner's purged removals. The request SHALL succeed and the device SHALL remove the change
from its queue.

#### Scenario: Stale add
- **GIVEN** device B added a bookmark offline before another device removed it, and that removal was purged
- **WHEN** device B syncs
- **THEN** the bookmark stays removed on every device

#### Scenario: Re-send after the identifiers were purged
- **GIVEN** a change was applied, its answer was lost, and the removal that followed has been purged
- **WHEN** the device sends the change again
- **THEN** the stored data does not change and the request succeeds
