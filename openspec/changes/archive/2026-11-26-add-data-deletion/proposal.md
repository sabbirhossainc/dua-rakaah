# Proposal

## Why

The shared database only grows: removed bookmarks and the list of applied change identifiers are kept for ever. A
reader also has no way to erase what the server holds about them. This is the last open item of phase 3 in `plan.md`.

## What Changes

- A command, `npm run db:user:purge`, deletes removed bookmarks and applied change identifiers that the server
  accepted more than 180 days ago. Nothing is purged unless it is run. It has a dry-run option.
- A device that last synced before a purge refreshes its bookmarks from the server, so a removal it never saw still
  reaches it, and its very old unsent changes do not bring a purged bookmark back.
- "Delete my data" for both anonymous readers and signed-in readers: it erases their records from the server and the
  device. It needs a connection and a confirmation.
- Other devices of a deleted reader are signed out and cleared at their next sync, and cannot upload the deleted data
  again. Signing in with the same Google account later starts a new, empty account.
- The server keeps only deletion markers: a hash of the account identifier or the random owner identifier, and the time.
- New pages `/account` and `/bn/account` hold the delete action. The top bar links to them. The Settings panel is not
  used because it is hidden below 1536px.

Out of scope: deleting empty or abandoned anonymous owners, a scheduler for the purge, exporting data, and the Privacy
Policy page.

## Capabilities

### New Capabilities

- `data-deletion`: a reader erases their data, and what happens on the server, on this device and on other devices.

### Modified Capabilities

- `data-sync`: adds requirements for purging old removal records and for refreshing a device that missed a purge.
  Existing requirements keep their text.

## Impact

- Shared database: new tables for purge marks and deletion markers. `npm run db:user:init` must run before deploying.
- Server: `lib/sync/` (schema, identity, service, store, handler, records, a new purge module), a new delete route,
  `lib/auth-callbacks.js` and `lib/auth.js` (the session records when sign-in happened).
- Browser: `lib/local/` (sync runner, apply, account), `AccountControl`, the two new pages, `lib/i18n.js`, the precache
  list, `scripts/smoke.mjs`.
- `/api/sync`: new optional request and response properties, and a new 410 answer. Older browser code keeps working.
- No new dependencies. `package.json` gets one script.
