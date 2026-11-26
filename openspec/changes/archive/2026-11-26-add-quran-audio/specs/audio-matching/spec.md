# Spec Delta

## ADDED Requirements

### Requirement: Parts are located in a Quran text
The matching command SHALL look for each part's Arabic text in a verified Quran text, comparing letters as for other
recordings. It SHALL consider runs of consecutive verses within one surah, and SHALL treat an opening basmala before
the first verse of a surah as optional.

#### Scenario: A short surah with its basmala
- **WHEN** a part is the basmala followed by the four verses of surah 112
- **THEN** it is located as the whole verses 112:1 to 112:4

#### Scenario: Not Quran text
- **WHEN** a part holds words that are not in the Quran text
- **THEN** it is not accepted, even if some of its words are

### Requirement: Only whole verses are accepted automatically
Verses SHALL be accepted without a person only when the part's text equals a run of whole verses and no other run in the
Quran has the same letters.

#### Scenario: Whole verses
- **WHEN** a part equals verses 2:285 to 2:286
- **THEN** those verses are accepted, marked as covering exactly the part

#### Scenario: Part of a verse
- **WHEN** a part is found inside a longer verse
- **THEN** it is reported for review and is not accepted

#### Scenario: Repeated verse
- **WHEN** a part equals verses that occur in more than one place
- **THEN** it is reported for review and is not accepted

#### Scenario: One letter differs
- **WHEN** a part is 97% like a run of verses
- **THEN** it is reported for review and is not accepted

### Requirement: Verse decisions
A person SHALL be able to approve or reject a part and a run of verses. A decision SHALL apply only while the part's
text and those verses' text are the ones reviewed, with the same handling of outdated decisions as for other
recordings. A decision naming verses that do not exist SHALL stop the command with nothing changed.

#### Scenario: Approving part of a verse
- **GIVEN** an approval for a part found inside verse 21:87
- **WHEN** the command runs
- **THEN** that verse is listed, marked as covering more than the part and as approved by a person

#### Scenario: Rejecting an automatic verse match
- **GIVEN** a rejection for a part and the verses that equal it
- **WHEN** the command runs
- **THEN** no verses are listed for that part

#### Scenario: Two approvals
- **WHEN** the decisions approve two different runs of verses for one part
- **THEN** the command reports it, exits with an error and leaves the list unchanged

### Requirement: Verse review report
The report SHALL show, for each part located in the Quran or at least 85% like a run of verses, the part's text beside
those verses' text, their keys, whether they cover exactly or more than the part, and the decision entry to copy.
Candidates needing review SHALL be marked.

#### Scenario: Many places
- **WHEN** a short part occurs inside many verses
- **THEN** the report shows a limited number of them and says how many there are

### Requirement: Verified Quran text
The command SHALL use only a complete download of the Quran text that holds its license notice and the expected number
of verses. Otherwise it SHALL exit with an error and leave the list unchanged. The downloaded text SHALL NOT be
committed or changed.

#### Scenario: Truncated download
- **WHEN** the downloaded text has fewer verses than the Quran
- **THEN** the command fails, and the shipped list is unchanged

## MODIFIED Requirements

### Requirement: Shipped list of recordings
The command SHALL write one list of accepted recordings per dua part: the accepted verses, if any, and the other
recordings in play order, approved ones first, then by likeness. The list SHALL contain only secure (`https`) audio
URLs on a source's own audio address, verse keys, and none of a source's text. Running the command again on the same
inputs SHALL produce an identical list.

#### Scenario: Two recordings for one part
- **WHEN** a part has an approved recording and an automatically accepted one
- **THEN** the approved one is listed first

#### Scenario: Verses only
- **WHEN** a part has accepted verses and no other recording
- **THEN** it is listed with its verse keys and no URL

#### Scenario: Unexpected address
- **WHEN** a source item's audio address is not on the source's audio address
- **THEN** that item's recording is not listed, and the command reports it

#### Scenario: Repeat run
- **WHEN** the command runs twice with the same database, source items, Quran text and decisions
- **THEN** the second run changes nothing

### Requirement: Recording check
A check command SHALL request every listed recording URL and report each one that does not answer with audio. When
Quran Foundation credentials are set, it SHALL also check that the default reciter has a working recording for every
listed verse; otherwise it SHALL say the verses were not checked. It SHALL exit with an error if any check fails, and
SHALL NOT change the list.

#### Scenario: All working
- **WHEN** every listed URL and verse answers with audio
- **THEN** the command reports the numbers checked and succeeds

#### Scenario: One missing
- **WHEN** one listed URL answers "not found"
- **THEN** the command names the URL and the parts that use it, and exits with an error

#### Scenario: No credentials
- **WHEN** the command runs without credentials and every listed URL works
- **THEN** it succeeds and states how many verses were not checked
