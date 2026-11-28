## ADDED Requirements

### Requirement: Information pages offline
After the app has finished installing, `/about`, `/privacy-policy`, `/general-feedbacks` and their `/bn/...` versions
SHALL load with no network and show the same content as when online. When the device is offline, the feedback form
SHALL say in the page's language that sending needs a connection, and SHALL keep what the reader typed.

#### Scenario: About offline
- **GIVEN** a reader opened `/` online and waited for the app to finish installing
- **WHEN** the network is turned off and the reader opens `/bn/about`
- **THEN** the page loads with its full Bangla content

#### Scenario: Sending feedback offline
- **GIVEN** the device is offline on `/general-feedbacks`
- **WHEN** the reader fills the form and sends it
- **THEN** the page says a connection is needed, and the fields keep what was typed
