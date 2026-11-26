# Spec Delta

## Purpose

Lets a reader, signed in or not, erase everything the app holds about them, and makes sure their other devices cannot
bring the erased data back.

## ADDED Requirements

### Requirement: A reader can delete their data
The app SHALL offer "Delete my data" at `/account` and `/bn/account`, reachable from the top bar at every screen width,
to signed-in and anonymous readers. It SHALL ask for confirmation, saying that the data cannot be recovered, and SHALL
be usable with the keyboard with accessible names in the page's language.

#### Scenario: Confirm
- **WHEN** the reader chooses "Delete my data" and confirms
- **THEN** their data is deleted and the app says so

#### Scenario: Cancel
- **WHEN** the reader cancels the confirmation or presses Escape
- **THEN** nothing is changed on the device or the server

#### Scenario: Narrow screen
- **WHEN** a reader on a phone-width screen uses the top bar
- **THEN** they can reach the page that holds the delete action

### Requirement: Deletion erases the reader's records on the server
For an account, the server SHALL delete the account, every anonymous owner merged into it, and all their bookmarks,
memorize records, settings and applied change identifiers. For an anonymous reader it SHALL delete the same for that
anonymous owner. The deletion SHALL complete fully or not at all.

#### Scenario: Signed-in reader
- **GIVEN** an account with records, into which two anonymous devices were merged
- **WHEN** the reader deletes their data
- **THEN** the database holds no record, change identifier or owner row of the account or of those two devices

#### Scenario: Anonymous reader
- **GIVEN** an anonymous device with synced records
- **WHEN** its reader deletes their data
- **THEN** the database holds nothing of that owner, and other readers' data is unchanged

#### Scenario: Interrupted
- **WHEN** the deletion fails part-way
- **THEN** nothing is deleted, the device keeps its data, and the reader is told it failed

### Requirement: Only the owner can delete
The server SHALL delete an account only for a request with that account's session, and an anonymous owner only for a
request carrying its signed cookie. A cross-site request SHALL be refused.

#### Scenario: Bare identifier
- **WHEN** a request names an anonymous owner without its cookie
- **THEN** nothing is deleted

#### Scenario: Session ended
- **GIVEN** the device shows a signed-in reader whose session has expired
- **WHEN** they choose to delete their account
- **THEN** nothing is deleted and the reader is asked to sign in again

#### Scenario: Cross-site request
- **WHEN** another site sends the delete request
- **THEN** the server answers with a 403 status and deletes nothing

### Requirement: Deleting clears this device
After the server confirms, the device SHALL remove all of the reader's local records, queued changes and kept changes,
return to the default settings, sign out, and continue with a new anonymous identifier. Without a connection nothing
SHALL be deleted, locally or on the server.

#### Scenario: Success
- **WHEN** a deletion succeeds
- **THEN** the device shows no bookmarks or memorized duas, uses the default settings, and is anonymous

#### Scenario: Offline
- **GIVEN** the device is offline
- **WHEN** the reader opens the account page
- **THEN** the delete action is unavailable and the page says a connection is needed

#### Scenario: Nothing on the server yet
- **GIVEN** an anonymous device that never synced
- **WHEN** its reader deletes their data
- **THEN** the local data is removed and the request succeeds

#### Scenario: Lost answer
- **GIVEN** the server deleted the data but the answer was lost
- **WHEN** the reader tries again
- **THEN** the request succeeds and the device is cleared

### Requirement: Other devices cannot restore deleted data
A sync from a session that began before the account was deleted, or for a deleted anonymous owner, SHALL be answered
with a 410 status and SHALL store nothing. The device SHALL then clear its local data, sign out and tell the reader the
data was deleted.

#### Scenario: Second signed-in device
- **GIVEN** device B is signed in to an account and has queued changes
- **WHEN** the account is deleted on device A and device B syncs
- **THEN** the server stores nothing, and device B is cleared and signed out

#### Scenario: Expired session
- **GIVEN** device B's session expired, and its anonymous owner had been merged into the deleted account
- **WHEN** device B syncs
- **THEN** the server stores nothing and device B is cleared

#### Scenario: Another tab
- **GIVEN** a request sent before this device was cleared is answered with 410 afterwards
- **WHEN** the answer arrives
- **THEN** data created since the clearing is kept

### Requirement: A later sign-in starts a new account
Signing in with the same Google account after a deletion SHALL create a new account with none of the deleted data.
Changes a device had kept from before the deletion SHALL NOT be stored in it.

#### Scenario: Sign in again
- **WHEN** the reader signs in after deleting their account
- **THEN** the new account holds only what that device created as an anonymous device

#### Scenario: Old kept changes
- **GIVEN** device B signed out offline with unsent changes, and the account was deleted afterwards
- **WHEN** the reader signs in on device B
- **THEN** those kept changes are not stored, and device B no longer queues them

### Requirement: Deletion markers hold no personal data
To enforce the rules above the server SHALL keep only the time of deletion with a one-way hash of the account
identifier, or with a deleted owner's random identifier.

#### Scenario: Inspect the database
- **WHEN** the database is inspected after an account is deleted
- **THEN** it holds no Google identifier, email address, name or picture for that reader
