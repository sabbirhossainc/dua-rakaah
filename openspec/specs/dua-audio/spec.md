# dua-audio Specification

## Purpose

Lets a reader hear the recitation of a dua from its card, with a clear source, and defines what they see when the
device is offline or a recording does not work.

## Requirements

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

### Requirement: Play and pause
Pressing play SHALL play that part's recording, and pressing it again SHALL pause it. Playing again SHALL resume from
where it was paused. When a recording ends, its control SHALL return to the play state. While a recording is being
fetched, the control SHALL show that it is loading.

#### Scenario: Pause and resume
- **GIVEN** a recording is playing
- **WHEN** the reader presses its control, then presses it again
- **THEN** playback stops and then continues from the same position

#### Scenario: Recording ends
- **WHEN** a recording plays to its end
- **THEN** its control shows the play state, and pressing it plays the recording from the start

#### Scenario: Slow network
- **WHEN** the reader presses play and the audio has not started yet
- **THEN** the control shows that it is loading, and pressing it again cancels the attempt

### Requirement: One recording at a time
At most one recording SHALL play at any moment. Starting one SHALL stop any other, and leaving the page SHALL stop
playback.

#### Scenario: Starting a second recording
- **GIVEN** the recording of one part is playing
- **WHEN** the reader presses play on another part
- **THEN** the first stops, its control shows the play state, and the second plays

#### Scenario: Leaving the page
- **GIVEN** a recording is playing
- **WHEN** the reader follows a link to another category
- **THEN** playback stops

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

### Requirement: Hidden when offline
While the device is offline, no audio control, credit or audio message SHALL be shown. Controls SHALL appear or
disappear when the connection changes, without a page reload.

#### Scenario: Saved page opened offline
- **WHEN** a reader opens a saved category page with no network
- **THEN** no audio control is shown, and the rest of each card is unchanged

#### Scenario: Connection lost
- **GIVEN** a reader is on a category page with audio controls
- **WHEN** the device goes offline
- **THEN** the controls disappear and any playback stops

#### Scenario: Connection restored
- **WHEN** the device comes back online
- **THEN** the controls appear again, and a part that was unavailable can be tried again

### Requirement: Next recording on failure
When a recording of a part fails to play, the app SHALL try that part's next listed recording, in listed order,
without asking the reader. A recording that does not start within 15 seconds SHALL count as failed. A recording that
failed SHALL be skipped for the rest of the visit.

#### Scenario: First recording is gone
- **GIVEN** a part with two listed recordings, the first of which answers "not found"
- **WHEN** the reader presses play
- **THEN** the second recording plays

#### Scenario: Nothing arrives
- **WHEN** a recording has not started 15 seconds after play was pressed
- **THEN** the app gives up on it and tries the next one

#### Scenario: Reader cancels
- **WHEN** the reader cancels a loading recording
- **THEN** it is not counted as failed, and pressing play tries it again

#### Scenario: Browser blocks playback
- **WHEN** the browser refuses to start playback without a further action by the reader
- **THEN** no recording is counted as failed, and the control returns to the play state

### Requirement: Unavailable audio
When the device is online and none of a part's recordings can be played, the part's control SHALL be disabled and
labeled "Audio unavailable" in the page language. A failure caused by the device going offline SHALL NOT make a part
unavailable.

#### Scenario: All recordings fail
- **GIVEN** an online reader and a part whose every recording fails
- **WHEN** the reader presses play
- **THEN** the control becomes disabled and reads "Audio unavailable", and other parts are not affected

#### Scenario: Offline during a request
- **WHEN** the connection drops while a recording is loading
- **THEN** the control is hidden, and after reconnecting it can be played again

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
