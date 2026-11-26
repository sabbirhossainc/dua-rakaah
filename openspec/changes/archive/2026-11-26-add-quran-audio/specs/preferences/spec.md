# Spec Delta

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: The reciter is stored and synced only
**Reason**: The audio feature now reads the setting and the Settings panel shows it.
**Migration**: None. Stored reciter numbers are used as they are; saving, syncing and clearing are unchanged.
