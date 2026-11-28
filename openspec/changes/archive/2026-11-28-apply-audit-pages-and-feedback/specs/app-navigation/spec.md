## MODIFIED Requirements

### Requirement: Account and support reachable at every width
The site header SHALL show the sign-in or account control at every width. While support is paused, the Settings panel,
the header, the bottom bar and the footer SHALL NOT link to `/support`.

#### Scenario: Account on a phone
- **WHEN** a reader opens `/` on a 360px-wide screen
- **THEN** the site header shows the sign-in control, or the account control when signed in

#### Scenario: Support link
- **WHEN** a reader on `/bn` on a 390px-wide screen opens the Settings panel
- **THEN** it holds no link to `/support`
- **AND** neither does the footer
