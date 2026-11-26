# Spec Delta

## Purpose

Decides which recordings belong to which dua part before the app is built, so that a reader never hears a recitation
that was not matched to the text on the card.

## ADDED Requirements

### Requirement: Matching compares each part's whole text
The matching command SHALL compare the Arabic text of every dua part with the text of every source item, ignoring
vowel marks, punctuation, spacing and spelling variants of the same letter. It SHALL give each pair a likeness of the
two whole texts, and a second figure for how well the shorter text is found inside the longer one. It SHALL NOT
change the content database.

#### Scenario: Same words, different marks
- **WHEN** a part and an item differ only in vowel marks, punctuation and spacing
- **THEN** their likeness is 100%

#### Scenario: Item holds more than the part
- **WHEN** an item's text is the part's text followed by another sentence of the same length
- **THEN** the contained figure is 100% and the whole-text likeness is about 50%

#### Scenario: Part without Arabic text
- **WHEN** a part has no Arabic text
- **THEN** it gets no recording

### Requirement: Automatic acceptance needs near-identical texts
A recording SHALL be accepted automatically only when the whole-text likeness is at least 95%. A high contained figure
alone SHALL NOT accept it.

#### Scenario: Near-identical
- **WHEN** a part and an item are 97% alike
- **THEN** the recording is accepted without a decision

#### Scenario: Contained but longer
- **WHEN** a part is found completely inside an item whose whole-text likeness is 60%
- **THEN** the recording is not accepted without a person's approval

### Requirement: Review report
The matching command SHALL write a report that shows, for each part, the part's Arabic text beside each accepted item
and, for a part with nothing accepted, beside its three closest items with at least 60% on either figure. Each pair
SHALL show both figures, a player for the recording, and the text to record an approval or rejection. Items that
reach 85% on either figure without acceptance SHALL be marked as needing review.

#### Scenario: Reviewing a candidate
- **WHEN** a person opens the report
- **THEN** each candidate shows the two texts right to left, both figures, a playable recording and a decision entry to copy

#### Scenario: Source text is untrusted
- **WHEN** a source item's text contains markup
- **THEN** the report shows it as plain text

### Requirement: A person's decision wins
A recorded approval SHALL accept that part and recording whatever the figures are, and a rejection SHALL exclude it
even when it would be accepted automatically. The command SHALL fail, changing nothing, when a decision is malformed
or names a part or item that does not exist.

#### Scenario: Rejecting an automatic match
- **GIVEN** a rejection for a part and a recording that are 98% alike
- **WHEN** the command runs
- **THEN** the recording is not listed for that part

#### Scenario: Approving a weak match
- **GIVEN** an approval for a pair that is 70% alike
- **WHEN** the command runs
- **THEN** the recording is listed for that part, marked as approved by a person

#### Scenario: Unknown part
- **WHEN** a decision names a part that the database does not have
- **THEN** the command reports it, exits with an error and leaves the list unchanged

### Requirement: Decisions are tied to the texts reviewed
A decision SHALL apply only while the part's text and the item's text are the ones that were reviewed. A decision
whose texts have changed SHALL be ignored and reported, and the pair SHALL NOT be accepted automatically if the
ignored decision was a rejection.

#### Scenario: Approved text changed
- **GIVEN** an approval for a 70% pair, and the item's text has since changed
- **WHEN** the command runs
- **THEN** the approval is reported as out of date and the recording is not listed

#### Scenario: Rejected text changed
- **GIVEN** a rejection for a pair, and the part's text has since changed
- **WHEN** the command runs
- **THEN** the pair is reported for review and is not listed

### Requirement: Shipped list of recordings
The command SHALL write one list of accepted recordings per dua part, in play order: approved ones first, then by
likeness. The list SHALL contain only secure (`https`) audio URLs on the source's own audio address, and none of the
source's text. Running the command again on the same inputs SHALL produce an identical list.

#### Scenario: Two recordings for one part
- **WHEN** a part has an approved recording and an automatically accepted one
- **THEN** the approved one is listed first

#### Scenario: Unexpected address
- **WHEN** a source item's audio address is not on the source's audio address
- **THEN** that item's recording is not listed, and the command reports it

#### Scenario: Repeat run
- **WHEN** the command runs twice with the same database, source items and decisions
- **THEN** the second run changes nothing

### Requirement: A recording is offered only for the matched text
The app SHALL offer a listed recording only on a part whose Arabic text is still the text it was matched against.

#### Scenario: Content database replaced
- **GIVEN** the content database is replaced and a part's Arabic text differs
- **WHEN** the app is built without running the matching command again
- **THEN** that part shows no recording

### Requirement: Incomplete source data changes nothing
When the source cannot be fetched completely, the command SHALL exit with an error and leave the list unchanged. A
chapter that is delivered but cannot be read SHALL be reported and skipped. The command SHALL report every part that
had a recording before the run and has none after it.

#### Scenario: Network failure
- **WHEN** one chapter cannot be downloaded
- **THEN** the command fails and the shipped list is unchanged

#### Scenario: Malformed chapter
- **WHEN** a chapter is downloaded but is not readable data
- **THEN** it is named in the output, and the other chapters are matched

#### Scenario: Recording lost
- **WHEN** a part loses its only recording in a run
- **THEN** the output names that part

### Requirement: Recording check
A check command SHALL request every listed recording and report each one that does not answer with audio. It SHALL
exit with an error if any fails, and SHALL NOT change the list.

#### Scenario: All working
- **WHEN** every listed URL answers with audio
- **THEN** the command reports the number checked and succeeds

#### Scenario: One missing
- **WHEN** one listed URL answers "not found"
- **THEN** the command names the URL and the parts that use it, and exits with an error
