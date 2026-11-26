# quran-recitation Specification

## Purpose

Supplies the Quran.com recitation of a dua part and the list of reciters through the app's own server, within the Quran
Foundation's rules on credentials, caching and redistribution.

## Requirements

### Requirement: Recitation of a part
For a dua part with listed verses, the server SHALL return the audio addresses of those verses in verse order, whether
they cover more than the part, and the reciter's name. It SHALL return all of the verses or none.

#### Scenario: Several verses
- **WHEN** the browser asks for a part listed as verses 2:285 to 2:286
- **THEN** it receives two addresses, 2:285 first, and the reciter's name

#### Scenario: One verse missing
- **WHEN** the source has no recording for one of a part's verses with either the requested or the default reciter
- **THEN** the answer says the recitation is unavailable and holds no addresses

### Requirement: Only listed parts are served
The server SHALL answer only for dua parts that have listed verses and whose text still matches the list. The caller
SHALL NOT be able to choose verses or addresses.

#### Scenario: Unlisted part
- **WHEN** a request names a part with no listed verses
- **THEN** the answer is "not found", and nothing is requested from the source

#### Scenario: Invalid input
- **WHEN** a request has a dua, part or reciter value that is not a positive whole number
- **THEN** it is refused, and nothing is requested from the source

### Requirement: Default reciter fallback
When no reciter is requested, the server SHALL use recitation 7. It SHALL also use recitation 7 when the requested
reciter is not on the reciter list or lacks one of the verses, and the answer SHALL name the reciter actually used.

#### Scenario: Reader's reciter lacks a verse
- **GIVEN** the requested reciter has no recording for a listed verse and recitation 7 has all of them
- **WHEN** the part is requested
- **THEN** the answer holds recitation 7's addresses and name

#### Scenario: Unknown reciter
- **WHEN** a request names a reciter number that is not on the list
- **THEN** the answer is for recitation 7

### Requirement: Credentials stay on the server
Quran Foundation credentials and access tokens SHALL be used only by the server. They SHALL NOT appear in any page,
script, response to the browser or log line.

#### Scenario: Inspecting the app
- **WHEN** the built pages, scripts and route responses are searched for the client secret
- **THEN** it is not found

### Requirement: Audio addresses are checked
The server SHALL return only `https` addresses on Quran Foundation's audio hosts. An answer from the source with any
other address SHALL count as unavailable.

#### Scenario: Unexpected host
- **WHEN** the source returns an address on another host
- **THEN** no address is returned for that part

### Requirement: Short-lived server copies
The server SHALL reuse an answer from the source for at most one day, and SHALL NOT write the source's addresses or
reciter list to disk. Responses that carry them SHALL tell the browser not to store them.

#### Scenario: Repeat request
- **WHEN** the same part and reciter are requested twice within a day
- **THEN** the source is asked once

#### Scenario: A day later
- **WHEN** the same part and reciter are requested more than a day after the source answered
- **THEN** the source is asked again

#### Scenario: Browser storage
- **WHEN** the browser receives a recitation or the reciter list
- **THEN** the response forbids storing it

### Requirement: No source content in pages or the repository
Pages, saved offline copies and the repository SHALL NOT contain audio addresses or reciter lists from the source.

#### Scenario: Server-rendered page
- **WHEN** a category page with Quran verse duas is rendered
- **THEN** its HTML holds no Quran Foundation audio address and no reciter name

### Requirement: Source failures
When the source refuses, limits, times out or cannot be reached, the server SHALL answer that the recitation is
unavailable, without passing on the source's error details, and SHALL NOT reuse the failed answer.

#### Scenario: Rate limit
- **WHEN** the source answers that there are too many requests
- **THEN** the browser receives an "unavailable" answer, and a later request asks the source again

### Requirement: Reciter list
The server SHALL offer the list of reciters that have verse-by-verse recitations, each with a number and a name.
Reciters of whole surahs only SHALL NOT be listed.

#### Scenario: Listing reciters
- **WHEN** the browser asks for the reciter list
- **THEN** it receives each verse-by-verse reciter's number, name and style where the source gives one

### Requirement: Optional source
The app SHALL work without Quran Foundation credentials. Without them, pages SHALL offer no Quran.com recitation and
no reciter choice, and the recitation routes SHALL answer "not available".

#### Scenario: No credentials
- **GIVEN** the server has no Quran Foundation credentials
- **WHEN** a reader opens a category page
- **THEN** parts with a Hisn al-Muslim recording play it as before, and other parts show no audio control
