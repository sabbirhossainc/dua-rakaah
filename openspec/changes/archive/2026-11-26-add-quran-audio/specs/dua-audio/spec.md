# Spec Delta

## ADDED Requirements

### Requirement: Quran recitation comes first
For a part with listed verses, when the Quran.com source is set up, the app SHALL try the Quran.com recitation before
the part's other recordings.

#### Scenario: Both sources
- **GIVEN** a part with listed verses and a Hisn al-Muslim recording
- **WHEN** an online reader presses play
- **THEN** the Quran.com recitation plays

#### Scenario: Quran.com fails
- **GIVEN** the same part, and the server answers that the recitation is unavailable
- **WHEN** the reader presses play
- **THEN** the Hisn al-Muslim recording plays without a further action

### Requirement: Verses play as one recording
The verses of a part SHALL play in verse order as one recording: one control, no action between verses, and pause and
resume at the same position. If any verse fails, the whole recitation SHALL count as failed.

#### Scenario: Next verse
- **WHEN** the first of two verses ends
- **THEN** the second starts by itself, and the control stays in the playing or loading state

#### Scenario: Pause between verses
- **GIVEN** the second of five verses is playing
- **WHEN** the reader pauses and resumes
- **THEN** playback continues in the second verse from the same position

#### Scenario: Later verse fails
- **GIVEN** a part whose third verse cannot be played and that has a Hisn al-Muslim recording
- **WHEN** playback reaches the third verse
- **THEN** the Hisn al-Muslim recording starts from its beginning

#### Scenario: Last verse ends
- **WHEN** the last verse ends
- **THEN** the control shows the play state, and pressing it starts from the first verse

### Requirement: Full verse label
A part whose listed verses hold more than the part's text SHALL be labeled "Full verse recitation", in the page
language, whenever its control offers the Quran.com recitation. The label SHALL NOT show for another source's
recording.

#### Scenario: Part of a verse
- **WHEN** an online reader views a part that is only some of verse 21:87
- **THEN** "Full verse recitation" is visible next to the control before they press play

#### Scenario: Fallback recording
- **WHEN** that part falls back to a Hisn al-Muslim recording
- **THEN** the label is no longer shown

### Requirement: Reciter choice applies to playback
Playing a Quran.com recitation SHALL ask for the reader's chosen reciter. A change of reciter SHALL apply from the next
time play is pressed on a part that is not playing or paused.

#### Scenario: Change of reciter
- **GIVEN** the reader played a part and it has ended
- **WHEN** they choose another reciter and press play again
- **THEN** the new reciter is heard

#### Scenario: Change while playing
- **WHEN** the reader changes the reciter while a part is playing
- **THEN** that playback continues unchanged

## MODIFIED Requirements

### Requirement: Play control for parts with a recording
A dua part with at least one recording that the app can offer SHALL show a play control inside that part, in English and
Bangla, when the device is online. Listed Quran verses count as a recording only when the Quran.com source is set up. A
part with no such recording SHALL show no audio control. The control SHALL be operable by keyboard and SHALL have an
accessible name that says whether it will play or pause.

#### Scenario: Part with a recording
- **WHEN** an online reader views a dua part that has a listed recording
- **THEN** that part shows a play control, labeled in the page language

#### Scenario: Part without a recording
- **WHEN** a reader views a dua part that has no listed recording
- **THEN** that part shows no audio control and no audio message

#### Scenario: Dua with several parts
- **GIVEN** a dua with three parts, of which the first and third have recordings
- **WHEN** an online reader views it
- **THEN** the first and third parts each have their own control, and the second has none

#### Scenario: Keyboard
- **WHEN** a keyboard reader focuses a play control and presses Enter or Space
- **THEN** playback starts, and the control's name changes to the pause action

### Requirement: No audio request before play
The app SHALL NOT request any audio file, or ask for the audio addresses of any part, until the reader presses play, and
SHALL NOT request recordings of parts the reader has not played. Asking for the reciter list is not an audio request.

#### Scenario: Opening a category
- **WHEN** a reader opens a category page with many recordings and presses nothing
- **THEN** no request for an audio file or a part's audio addresses is made

### Requirement: Recording credit
Every audio control SHALL be shown with a visible credit naming the source of the recording it offers or is playing, in
the page language. For Hisn al-Muslim it reads, in English, "Recitation: Hisn al-Muslim". For Quran.com it names Quran
Foundation, and also the reciter before or at the time any sound is heard.

#### Scenario: Credit shown
- **WHEN** a reader views a part with a play control
- **THEN** the source credit is visible next to the control without any further action

#### Scenario: Reciter named
- **WHEN** a Quran.com recitation starts
- **THEN** the credit names the reciter being heard and Quran Foundation

#### Scenario: Source changes
- **WHEN** a part falls back from Quran.com to Hisn al-Muslim
- **THEN** the credit changes to Hisn al-Muslim before that recording is heard

### Requirement: Changed recordings reach saved devices
A new build with a different list of recordings, or one that newly has or lacks the Quran.com source, SHALL count as a
content update, so that a device with saved pages receives the change once the reader accepts the update.

#### Scenario: A recording is removed
- **GIVEN** a device with saved pages that offer a recording
- **WHEN** a build without that recording is deployed and the reader accepts the update
- **THEN** the saved pages no longer offer it

#### Scenario: Source added
- **GIVEN** a device with pages saved from a build without Quran.com credentials
- **WHEN** a build with them is deployed and the reader accepts the update
- **THEN** the saved pages offer the Quran.com recitations
