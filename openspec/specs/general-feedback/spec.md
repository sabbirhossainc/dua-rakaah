# general-feedback Specification

## Purpose

Covers the General Feedback form, its API route, spam protection and delivery to the team by email through Resend.

## Requirements

### Requirement: Feedback form
`/general-feedbacks` and `/bn/general-feedbacks` SHALL show a form, labelled in the page's language, with: Name
(optional, up to 100 characters), Email (optional, a valid address when given, needed for a reply), Feedback type (one
of Bug, Dua or hadith correction, UI or feature suggestion; required), and Message (required, 10 to 5000 characters).
Every field SHALL have a visible label. The form SHALL check the fields before sending and show each problem next to its
field in the page's language, and move focus to the first field with a problem.

#### Scenario: Missing message
- **WHEN** a reader sends the form with an empty message
- **THEN** nothing is sent, the message field says it is required, and focus moves to it

#### Scenario: Bad email
- **WHEN** a reader enters "abc" as the email and sends
- **THEN** nothing is sent and the email field says the address is not valid

#### Scenario: Bangla labels
- **WHEN** a reader opens `/bn/general-feedbacks`
- **THEN** every label, option and message of the form is in Bangla

### Requirement: Sending and confirmation
While the form is being sent, its send button SHALL be disabled and say that it is sending. On success the page SHALL
show a confirmation in the page's language, announced to screen readers, and clear the form. On failure it SHALL show an
error in the page's language, announced to screen readers, and keep what the reader typed.

#### Scenario: Sent
- **WHEN** a reader sends a valid form and the server accepts it
- **THEN** the page says the feedback was received, and every field is empty

#### Scenario: Delivery fails
- **WHEN** the server cannot deliver the feedback
- **THEN** the page says it could not be sent and to try again later, and the fields keep their values

### Requirement: Feedback API
`POST /api/general-feedbacks` SHALL accept a JSON body with `name`, `email`, `type`, `message`, `lang` and a hidden
`website` field. It SHALL check every field by the same rules as the form, on the server, and respond:
- `200` with `{ ok: true }` when the feedback was handed to the email service;
- `400` with the fields in error when the body is not valid;
- `429` when the same sender has sent 5 times in the last 10 minutes;
- `502` when the email service fails;
- `503` when the email service is not configured.

The response SHALL NOT include the email service's own error text, the API key or the team's address.

#### Scenario: Valid feedback
- **WHEN** a valid body is posted
- **THEN** the route responds `200` and one email is sent to the team's address

#### Scenario: Invalid type
- **WHEN** a body with `type` "other" is posted
- **THEN** the route responds `400` naming `type`, and no email is sent

#### Scenario: Not configured
- **GIVEN** the server has no email API key
- **WHEN** a valid body is posted
- **THEN** the route responds `503` and no email is sent

### Requirement: Spam protection
The route SHALL treat a body whose hidden `website` field is not empty as spam: it SHALL respond `200` as if accepted
and send no email. It SHALL limit each sender, by network address, to 5 accepted submissions per 10 minutes. The hidden
field SHALL be hidden from sight and from screen readers, and skipped by the keyboard.

#### Scenario: Honeypot filled
- **WHEN** a body with `website` set to "http://spam.example" is posted
- **THEN** the route responds `200` and no email is sent

#### Scenario: Too many
- **GIVEN** a sender has had 5 submissions accepted in the last 10 minutes
- **WHEN** they post a sixth
- **THEN** the route responds `429` and the form says to try again later

### Requirement: Email delivered through Resend
Each accepted submission SHALL be sent as one email through Resend to the team's address set on the server. The email's
subject SHALL name the feedback type, its body SHALL hold every field and the page language, and when the reader gave
an email, replying SHALL go to that address. The Resend API key and the team's address SHALL be read only on the
server and SHALL NOT appear in any page, script or response sent to the browser. Message text SHALL be escaped so it
cannot add markup to the email.

#### Scenario: Reply goes to the reader
- **WHEN** a reader who entered "reader@example.com" sends feedback
- **THEN** the team's email has its reply address set to "reader@example.com"

#### Scenario: Key stays on the server
- **WHEN** any page or script of the app is downloaded
- **THEN** it contains neither the Resend API key nor the team's address

#### Scenario: Markup escaped
- **WHEN** a message holds `<script>alert(1)</script>`
- **THEN** the email shows that text as written and runs nothing
