# Spec Delta

## Purpose

Defines who the app thinks a reader is: an anonymous device that works with no sign-in, an optional Google account
that joins a reader's devices, and what happens to the reader's data when they sign in or out.

## ADDED Requirements

### Requirement: Anonymous use needs no sign-in
A device SHALL be usable for every feature in this change with no sign-in and no account, including when offline
on the very first visit. The device SHALL get a random identifier on first load, and the identifier SHALL NOT
contain any personal information.

#### Scenario: First visit, offline
- **GIVEN** the device has loaded the app once and is now offline
- **WHEN** the reader adds a bookmark
- **THEN** the bookmark is saved under the device's anonymous identifier

#### Scenario: First sync
- **WHEN** a device syncs for the first time
- **THEN** the server records the anonymous identifier and binds the browser to it with a signed, HTTP-only cookie
- **AND** an anonymous reader who never changes anything leaves no record on the server

### Requirement: The server does not trust a bare identifier
A request SHALL be accepted for an anonymous owner only if it carries the signed cookie for that owner, or is the
first request from a device that sends a well-formed identifier no server record uses yet. A request that names an
identifier owned by another reader or account SHALL be rejected.

#### Scenario: Guessed identifier
- **WHEN** a request without the matching cookie names an identifier that already has data on the server
- **THEN** the server answers with a 403 status, returns no data and stores nothing

#### Scenario: Tampered cookie
- **WHEN** the cookie's signature is wrong
- **THEN** the server ignores it and treats the request as a first request from a new device

### Requirement: Signing in with Google
A reader SHALL be able to sign in with a Google account. The app SHALL store only Google's stable account
identifier for the reader, and SHALL NOT store their email address, name or picture.

#### Scenario: Successful sign-in
- **WHEN** the reader completes Google sign-in
- **THEN** the app shows that they are signed in, and later syncs on that device belong to their account

#### Scenario: Cancelled sign-in
- **WHEN** the reader cancels at Google or sign-in fails
- **THEN** they return to the app still anonymous, with their local data unchanged

#### Scenario: Stored account data
- **WHEN** the shared database is inspected after a sign-in
- **THEN** it holds no email address, name or picture for the reader

### Requirement: Sign-in merges anonymous data into the account
On sign-in, the app SHALL first send the device's queued changes, then the server SHALL merge the device's anonymous
records into the account using the same conflict rules as sync, in one step that either completes fully or not at
all. Afterwards the device SHALL continue as the account's device and receive all of the account's records.

#### Scenario: First sign-in with bookmarks
- **GIVEN** an anonymous device has 3 bookmarks and the account has none
- **WHEN** the reader signs in
- **THEN** the account has the 3 bookmarks

#### Scenario: Existing account
- **GIVEN** the account has bookmarks A and B, and this anonymous device has bookmarks B and C
- **WHEN** the reader signs in
- **THEN** the device and the account both hold A, B and C

#### Scenario: Merge interrupted
- **WHEN** the merge fails part-way
- **THEN** nothing is merged, the reader's local data is unchanged, and the merge is tried again at the next sync

#### Scenario: Other devices
- **GIVEN** a second anonymous device of the same reader
- **WHEN** the reader signs in on it
- **THEN** its anonymous records are merged into the same account independently of the first device

### Requirement: Signed-in data follows the account
While a device is signed in, its sync requests SHALL be answered for the account, and a device that is signed out
SHALL NOT receive the account's records.

#### Scenario: Second device
- **GIVEN** the reader bookmarked a dua on device A while signed in
- **WHEN** they sign in on device B and it syncs
- **THEN** device B shows the bookmark

#### Scenario: Signed-out device
- **WHEN** a device that has signed out syncs
- **THEN** it receives nothing that belongs to the account

### Requirement: Sign-out keeps unsynced changes for 30 days
When the reader signs out and all changes have been sent, the app SHALL clear all of the account's data from the
device. When some changes could not be sent (offline, or the send failed), the app SHALL warn the reader how many
will be kept, keep exactly those changes, hide them from whoever uses the device next, and send them the next time
the same account signs in on that device. Kept changes older than 30 days SHALL be deleted.

#### Scenario: Online sign-out
- **GIVEN** the device is online and every change has been sent
- **WHEN** the reader signs out
- **THEN** the device shows no bookmarks, and nothing from the account stays on it

#### Scenario: Offline sign-out
- **GIVEN** the device is offline with 3 unsent changes
- **WHEN** the reader signs out
- **THEN** the app first warns that 3 changes have not synced and will be kept on this device for 30 days
- **AND** after confirmation the device shows no bookmarks, and the next person to use it cannot see the 3 changes

#### Scenario: Same account signs in again
- **GIVEN** the device holds 3 kept changes for account X
- **WHEN** account X signs in on the device
- **THEN** the 3 changes are sent and the device no longer holds them as kept

#### Scenario: A different account signs in
- **GIVEN** the device holds kept changes for account X
- **WHEN** account Y signs in on the device
- **THEN** account Y's data never includes the kept changes, and they stay kept for account X

#### Scenario: Kept changes expire
- **GIVEN** kept changes are 31 days old
- **WHEN** the app starts or is about to sync
- **THEN** the old kept changes are deleted

### Requirement: Browser storage loss is limited
After the reader's first change the app SHALL ask the browser to keep its storage (persistent storage), and SHALL
work normally if the browser declines.

#### Scenario: Browser declines
- **WHEN** the browser refuses persistent storage
- **THEN** the feature works as before and nothing is shown to the reader
