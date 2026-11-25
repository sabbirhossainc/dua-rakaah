# Spec Delta

## Purpose

Defines how a new version of the app reaches a device that already has it saved for offline use, without
surprising the reader or mixing files from two versions.

## ADDED Requirements

### Requirement: Old version stays until the reader chooses
When a new version of the app is deployed, a device that already has the app SHALL keep showing the version it
has until the reader accepts the update. The page SHALL NOT reload by itself, including when the device comes
back online.

#### Scenario: New build deployed while the app is open
- **GIVEN** a reader has `/duas/sleep?cat=6` open
- **WHEN** a new build is deployed and the device downloads it in the background
- **THEN** the open page keeps showing the same content and does not reload

#### Scenario: Reconnecting
- **GIVEN** an offline reader on a saved page
- **WHEN** the device comes back online
- **THEN** the page is not reloaded

### Requirement: Reload prompt
When a new version has been downloaded and is waiting, the app SHALL show a prompt that tells the reader new
content is available and offers a "Reload" action and a way to dismiss it. The prompt SHALL be shown in the
language of the current page.

#### Scenario: Prompt appears
- **WHEN** a new version finishes downloading while a page is open
- **THEN** the prompt is shown with a "Reload" action and a way to dismiss it, and the rest of the page stays usable

#### Scenario: Reader accepts
- **WHEN** the reader chooses "Reload"
- **THEN** the page reloads once and then runs the new version, and the prompt is gone

#### Scenario: Reader dismisses
- **WHEN** the reader dismisses the prompt
- **THEN** the page keeps running the old version, and the prompt returns the next time the app is opened while the new version is still waiting

#### Scenario: Prompt in Bangla
- **WHEN** a new version is waiting and the reader is on a page under `/bn/duas`
- **THEN** the prompt text is in Bangla

### Requirement: One version at a time
A page, its scripts, its styles and its saved content SHALL all come from the same build. After an update is
accepted, no page SHALL load scripts or styles from the previous build, and before it is accepted, no page SHALL
load them from the new one.

#### Scenario: Offline after an update
- **GIVEN** a reader accepted an update and then went offline
- **WHEN** any saved page is opened
- **THEN** it loads and works, with no missing script or style files

#### Scenario: Updated content
- **WHEN** the content database changes and the app is rebuilt and deployed, and a reader accepts the update
- **THEN** the saved category pages show the new content, not the old content

### Requirement: Old saved files are removed
After an update is accepted, the device SHALL NOT keep saved copies of pages or files that the new version no
longer uses.

#### Scenario: Storage after an update
- **WHEN** an update has been accepted and the app has reloaded
- **THEN** the saved files on the device match the new build's list, with no leftover files from the previous build
