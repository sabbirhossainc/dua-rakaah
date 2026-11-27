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
accessible name in the page's language. The panel SHALL NOT show headings or entries that do nothing.

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

#### Scenario: No empty entries
- **WHEN** the reader opens the Settings panel
- **THEN** it shows the language, appearance, Arabic text size and (when available) reciter choices, and no "General
  Settings" entry

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

### Requirement: The Settings panel chooses a reciter
When the Quran.com source is set up and the device is online, the Settings panel SHALL offer a reciter choice listing
the available reciters, usable with the keyboard, with an accessible name in the page's language. It SHALL show the
saved reciter as selected, or recitation 7 when none is saved. Looking at the list SHALL NOT save a setting.

#### Scenario: Choose a reciter
- **WHEN** the reader selects another reciter
- **THEN** the choice is saved, shows as selected and reaches the reader's other devices like any other setting

#### Scenario: Nothing chosen
- **WHEN** a reader who never chose a reciter opens the panel
- **THEN** recitation 7 shows as selected, and no reciter record is stored

#### Scenario: Offline or no source
- **WHEN** the device is offline, or the Quran.com source is not set up
- **THEN** no reciter choice is shown, and the saved reciter is kept

#### Scenario: List cannot be loaded
- **WHEN** the reciter list cannot be fetched
- **THEN** the panel says the reciters are unavailable, and the other settings work

#### Scenario: Saved reciter no longer listed
- **GIVEN** the saved reciter number is not on the list
- **WHEN** the panel opens
- **THEN** recitation 7 shows as selected, and the saved value is not changed

### Requirement: The Settings panel opens at every width
The Settings panel SHALL open from the navigation's Settings entry at every width from 320px: as a sheet from the
bottom of the screen below 768px, and as a sheet from the side from 768px. While it is open, focus SHALL stay inside it
and the page behind SHALL NOT be operable. Escape and a close button labelled in the page's language SHALL close it and
return focus to the Settings entry.

#### Scenario: Phone
- **WHEN** a reader on a 390px-wide screen activates Settings
- **THEN** the panel opens from the bottom of the screen with every setting reachable by scrolling inside it

#### Scenario: Close with Escape
- **GIVEN** the panel is open on a 1280px-wide screen
- **WHEN** the reader presses Escape
- **THEN** the panel closes and focus returns to the Settings entry

#### Scenario: Choice shown at once
- **GIVEN** the panel is open over a category page
- **WHEN** the reader selects "xlarge"
- **THEN** the Arabic text behind the panel is redrawn at the new size while the panel stays open

#### Scenario: Reduced motion
- **GIVEN** the device asks for reduced motion
- **WHEN** the panel opens
- **THEN** it appears in place without sliding
