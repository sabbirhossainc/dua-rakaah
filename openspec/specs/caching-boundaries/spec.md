# caching-boundaries Specification

## Purpose

Limits what the offline layer may store or answer, so that audio, server routes and other sites' content are never
copied onto a device by accident and later features can rely on those limits.

## Requirements

### Requirement: Audio is never cached or intercepted
A request for an audio file, from any origin and with any file extension, SHALL go straight to the network. The
offline layer SHALL NOT store a copy of it or answer it from a stored copy, and SHALL NOT alter its range or
header behavior.

#### Scenario: Audio file request
- **WHEN** the page requests `https://example.com/audio/12.mp3`
- **THEN** the request is not handled by the offline layer, and nothing is added to any saved storage

#### Scenario: Audio offline
- **WHEN** the device is offline and the page requests an audio file
- **THEN** the request fails as it would with no offline layer, and no saved copy is returned

### Requirement: Server routes are never cached or intercepted
Every request to a path under `/api/`, with any method, SHALL go straight to the network. The offline layer
SHALL NOT store or replay it.

#### Scenario: A GET to an API route
- **WHEN** the page sends `GET /api/anything`
- **THEN** the request goes to the network, and no response is stored

#### Scenario: A POST to an API route
- **WHEN** the page sends `POST /api/anything`
- **THEN** the request is not handled by the offline layer

### Requirement: Other sites are left alone
A request to any origin other than the app's own SHALL NOT be stored or answered by the offline layer.

#### Scenario: Cross-origin request
- **WHEN** the page requests a file from another origin
- **THEN** the offline layer does not handle it, and nothing is stored

### Requirement: Only listed requests are stored
Only same-origin GET requests for the app's pages, scripts, styles, fonts, images and icons SHALL be stored. A
request that matches no rule SHALL go to the network and SHALL NOT be stored.

#### Scenario: Unlisted same-origin request
- **WHEN** the page makes a same-origin GET request for a path that is not a page, script, style, font, image or icon
- **THEN** the request goes to the network, and no response is stored

### Requirement: Storage stays bounded
The set of files saved without being on the build's list (for example, an image requested at runtime) SHALL have
a fixed upper limit on the number of entries and an age limit, so that storage use does not grow without bound.

#### Scenario: Many runtime files
- **WHEN** the reader browses for a long time and many files are requested that are not on the build's list
- **THEN** the number of saved runtime files never exceeds the limit, and the oldest are removed first
