# Spec Delta

## ADDED Requirements

### Requirement: Sign-in keeps the account's existing settings
When the reader signs in, a setting that the account already has SHALL keep the account's value, whatever the time of
the device's own choice, and the device's value SHALL be used only for a setting the account does not have yet. Afterwards
the device SHALL show the account's settings. A setting the reader changes after signing in SHALL follow the normal
newest-change-wins rule.

#### Scenario: Account already has a choice
- **GIVEN** the account has the dark appearance, and this anonymous device chose light more recently
- **WHEN** the reader signs in
- **THEN** the account and the device both have the dark appearance

#### Scenario: Account has no choice yet
- **GIVEN** this anonymous device chose the "large" text size and the account has no text size saved
- **WHEN** the reader signs in
- **THEN** the account and the device both have the "large" text size

#### Scenario: Change after signing in
- **GIVEN** the reader has just signed in and the account has the dark appearance
- **WHEN** they select light
- **THEN** the account has the light appearance, and the other devices show light after they sync

#### Scenario: Choice not yet sent at sign-in
- **GIVEN** the account has the dark appearance, and this device chose light while offline so the change was never sent
- **WHEN** the reader signs in
- **THEN** the account and the device both have the dark appearance

#### Scenario: Unsent choice for a setting the account lacks
- **GIVEN** this device chose the "large" text size while offline so the change was never sent, and the account has no text size
- **WHEN** the reader signs in
- **THEN** the account and the device both have the "large" text size

#### Scenario: Safety-net re-send
- **GIVEN** the server could not prove which anonymous owner the device was, so it did not merge, and the account has the dark appearance
- **WHEN** the device re-sends its data after sign-in
- **THEN** the account keeps the dark appearance, and a setting the account lacks is filled from the device

## MODIFIED Requirements

### Requirement: Sign-in merges anonymous data into the account
On sign-in, the app SHALL first send the device's queued changes, then the server SHALL merge the device's anonymous
records of every kind (bookmarks, memorize records and settings) into the account in one step that either completes
fully or not at all, using the conflict rule of each kind (settings follow their own rule below). Afterwards the device
SHALL continue as the account's device and receive all of the account's records.

#### Scenario: First sign-in with bookmarks
- **GIVEN** an anonymous device has 3 bookmarks and the account has none
- **WHEN** the reader signs in
- **THEN** the account has the 3 bookmarks

#### Scenario: Existing account
- **GIVEN** the account has bookmarks A and B, and this anonymous device has bookmarks B and C
- **WHEN** the reader signs in
- **THEN** the device and the account both hold A, B and C

#### Scenario: Memorize records merge by the furthest progress
- **GIVEN** the account has dua X at progress 50 and dua Y learned, and this anonymous device has X at progress 75 and Y at progress 25
- **WHEN** the reader signs in
- **THEN** the device and the account both hold X at progress 75 and Y learned

#### Scenario: Merge interrupted
- **WHEN** the merge fails part-way
- **THEN** nothing is merged, the reader's local data is unchanged, and the merge is tried again at the next sync

#### Scenario: Other devices
- **GIVEN** a second anonymous device of the same reader
- **WHEN** the reader signs in on it
- **THEN** its anonymous records are merged into the same account independently of the first device
