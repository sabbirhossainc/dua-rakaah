# preferences Specification

## Purpose

Lets a reader choose how the app looks and which reciter they prefer: the appearance (light or dark), the size of the
Arabic text, and a reciter. The choices are saved on the device, work offline, apply before the page is painted, and
follow the reader to their other devices after sign-in.

## Requirements

### Requirement: A fixed set of settings
The app SHALL keep three settings per reader: the appearance (`light` or `dark`, default `light`), the Arabic text
size (`small`, `medium`, `large` or `xlarge`, default `medium`), and the reciter (a reciter number, with no default).
The language SHALL NOT be a setting: it comes from the page address only. A setting the reader has never changed SHALL
have its default, and SHALL have no stored record.

#### Scenario: Untouched settings
- **WHEN** a reader who has never changed a setting opens the app
- **THEN** the appearance is light and the Arabic text size is medium

#### Scenario: Language is not a setting
- **WHEN** the reader changes the appearance or the text size
- **THEN** the page language does not change, and the language buttons still switch between the English and Bangla addresses

### Requirement: The Settings panel changes appearance and text size
The Settings panel SHALL let the reader choose the appearance and the Arabic text size. Each choice SHALL take effect
at once, without a page reload, SHALL show which option is selected, and SHALL be usable with the keyboard with an
accessible name in the page's language. The General Settings entry SHALL stay as it is.

#### Scenario: Choose dark
- **WHEN** the reader selects the dark appearance
- **THEN** the whole app switches to the dark theme at once, and "dark" shows as selected

#### Scenario: Choose a larger Arabic size
- **GIVEN** a category page is open
- **WHEN** the reader selects the "large" text size
- **THEN** the Arabic text on every dua card becomes larger at once

#### Scenario: Back to the default
- **GIVEN** the appearance is dark
- **WHEN** the reader selects light
- **THEN** the app switches back to light, and the choice reaches the reader's other devices like any other change

#### Scenario: Keyboard
- **WHEN** the reader uses only the keyboard
- **THEN** they can move to each option, select it, and see which one is selected

### Requirement: Settings apply before the page is painted
When the page is first shown, the saved appearance and Arabic text size SHALL already be applied, so a reader who chose
the dark theme does not see a light page first. This SHALL hold with no network.

#### Scenario: Reload in dark
- **GIVEN** the reader chose the dark appearance
- **WHEN** they reload a page
- **THEN** the first painted frame is already dark

#### Scenario: Offline
- **GIVEN** the reader chose the dark appearance and the device is offline
- **WHEN** they open a saved page
- **THEN** the page is dark from the first frame

### Requirement: Settings work offline and follow the reader
Choosing a setting SHALL work with no network, SHALL be kept on the device, and SHALL reach the reader's other devices
the next time the device syncs. If the same setting is changed on two devices, the newest change SHALL win.

#### Scenario: Offline choice
- **GIVEN** the device is offline
- **WHEN** the reader selects the dark appearance and later goes online
- **THEN** the reader's other devices are dark after they sync

#### Scenario: Another device
- **GIVEN** the reader chose "large" on one device while signed in
- **WHEN** they sign in on a second device and it syncs
- **THEN** the second device shows the Arabic text at the "large" size

### Requirement: Sign-out clears the settings
When the reader signs out and all changes have been sent, the device SHALL return to the default settings, and a
different person who then uses the device SHALL NOT inherit the previous reader's appearance or text size. Settings that
could not be sent SHALL be kept and sent the next time the same account signs in, like any other change.

#### Scenario: Signed out
- **GIVEN** a signed-in reader chose the dark appearance and all changes were sent
- **WHEN** they sign out
- **THEN** the device is light and the Arabic text is medium

#### Scenario: Offline sign-out
- **GIVEN** the reader changed the text size offline and signs out
- **WHEN** the same account signs in again on that device
- **THEN** the unsent change is sent to the account

### Requirement: The reciter is stored and synced only
The reciter setting SHALL be saved, synced and cleared like the others, but nothing in the app SHALL read or show it
until the audio feature uses it.

#### Scenario: Stored reciter
- **GIVEN** a reciter number has been saved on the account
- **WHEN** the reader signs in on a new device
- **THEN** the device holds the same reciter number, and no part of the page changes because of it
