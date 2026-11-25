# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
