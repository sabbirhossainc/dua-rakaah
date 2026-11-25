# Spec Delta

## MODIFIED Requirements

### Requirement: Sign-in merges anonymous data into the account
On sign-in, the app SHALL first send the device's queued changes, then the server SHALL merge the device's anonymous
records of every kind (bookmarks and memorize records) into the account using the same conflict rules as sync, in one
step that either completes fully or not at all. Afterwards the device SHALL continue as the account's device and
receive all of the account's records.

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
