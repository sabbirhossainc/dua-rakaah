## MODIFIED Requirements

### Requirement: Site footer
Every page SHALL end with the site footer, in the page's language, in four parts:
1. Brand and mission: the app's name, one sentence on what the app is for, a short Arabic line marked `lang="ar"` and
   `dir="rtl"` with its meaning, and a note that support is not being taken right now.
2. Explore: links to Home, All Duas, Categories, Prayer Times and Saved.
3. Information: links to About Us, Privacy Policy, General Feedback and the account page.
4. A bottom bar with the copyright notice and year, and the support-paused note.

Every link SHALL go to the page in the current language. The footer SHALL NOT link to `/support`. From 1024px the first
three parts SHALL be columns side by side; below it they SHALL stack.

#### Scenario: Footer in Bangla
- **WHEN** a reader scrolls to the end of `/bn/duas`
- **THEN** the footer shows the Arabic line with its Bangla meaning, its About link goes to `/bn/about`, its Saved link
  goes to `/bn/bookmark`, and its account link goes to `/bn/account`

#### Scenario: Explore links
- **WHEN** a reader activates Prayer Times in the footer of `/duas`
- **THEN** the browser goes to the prayer times section of `/`

#### Scenario: No support link
- **WHEN** any page is served
- **THEN** its footer holds no link to `/support`, and shows the note that support is paused

#### Scenario: Footer on a phone
- **WHEN** the footer is shown 360px wide
- **THEN** its parts stack in the order above with no sideways scrolling

## ADDED Requirements

### Requirement: Support paused notice
The `/support` page SHALL stay at its address and SHALL say, as its only content, that support is not being taken
right now, with a link back to `/`. It SHALL hold no payment form, no donation button and no link that invites support.
No other page SHALL link to it.

#### Scenario: Old link
- **WHEN** a reader opens `/support` from an old bookmark
- **THEN** the page loads and says that support is not being taken right now, with a link back to `/`

#### Scenario: Nothing links to it
- **WHEN** any other page is served
- **THEN** its HTML has no link to `/support`
