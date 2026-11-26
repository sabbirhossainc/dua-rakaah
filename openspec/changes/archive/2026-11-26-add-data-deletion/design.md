# Design

## Context

See proposal.md for motivation. Relevant current behavior:

- All sync work runs in one write transaction (`lib/sync/service.js`). `resolveOwner` creates an account owner for any
  valid session, and creates an anonymous owner for any unused identifier. Deleting rows alone would therefore be undone
  by the next request from another device.
- Sessions are JWTs with no adapter, so they cannot be revoked on the server. The anonymous cookie lasts one year.
- Only bookmarks have removal rows (`deleted = 1`). Memorize and preference rows are never removed, and re-applying one
  of their changes cannot alter the result (max/`reset_gen` merge, newest-wins).
- `applied_ops.applied_at` is the only server-clock time. `updated_at` comes from devices.
- Schema statements are append-only and must be idempotent, so existing tables get no new columns.

## Goals / Non-Goals

**Goals:** correct convergence after a purge; deletion that holds against stale sessions, cookies and kept changes; old
browser code keeps syncing.

**Non-Goals:** revoking Google's grant, purging abandoned owners, scheduling the purge, purging deletion markers.

## Decisions

### D1: New tables
`purge_marks(owner_id PK, seq, removed_before)`, `deleted_accounts(user_hash PK, deleted_at)` and
`deleted_owners(owner_id PK, deleted_at)`. `user_hash` is SHA-256 of the account identifier; an HMAC with
`ANON_COOKIE_SECRET` was rejected because rotating the secret would silently drop every marker.

### D2: Purge by acceptance time
`lib/sync/purge.js`, one write transaction, cutoff `now - 180 days`. First delete bookmark rows with `deleted = 1` whose
`op_id` has no `applied_ops` row at or after the cutoff (match on `op_id` only, since a merged row was applied under the
anonymous owner). For each owner raise `purge_marks.seq` to the greatest purged `server_seq` and `removed_before` to the
greatest purged `updated_at`. Then delete older `applied_ops`. Using `updated_at` for the age was rejected: an offline
removal can arrive long after it was made. `scripts/purge-user-db.mjs` wraps it, with `--dry-run`.

### D3: Refresh handshake
The request gains an optional `since`: the position up to which this code has handled purges. The browser sends
`meta.refresh_cursor`, 0 when absent, and sets it to the returned cursor. It is also reset wherever `cursor` is reset.
If the owner has a mark and `since < seq` (and bookmarks are requested), the server reads from 0, returns
`cursor = max(last row, seq)` and adds `full: true, removed_before`.

A separate value, not `cursor`, is needed because old code advances `cursor` past a mark without dropping anything; the
first sync by new code then still refreshes. A request without `since` is handled as today.

On `full`, the browser, in the same transaction as applying rows: for each local bookmark and queued bookmark change
with no row in the answer, deletes the change if `client_ts <= removed_before`, then deletes the record if no queued
change still claims it.

### D4: Stale changes
In `applyOps`, when the request is stale (D3), a bookmark change with no stored record and
`client_ts <= removed_before` is recorded in `applied_ops` but not merged. Filtering all requests was rejected: it would
affect up-to-date devices. The sign-in merge runs before `applyOps`, so merged records count as stored.

### D5: Delete route
`POST /api/account/delete` with `{ scope: "account" | "anon", anon_id }`, handled in `lib/sync/handler.js` with the same
cross-site and size checks as sync.

- `account`: needs a session (else 401). A session older than a marker answers 200 and deletes nothing, which makes a
  retry safe and protects a newer account. Otherwise delete the account owner, every owner whose `merged_into` chain ends
  there, and the cookie owner if it equals `anon_id` and is unmerged.
- `anon`: needs the cookie to equal `anon_id` (follow nothing: a merged owner answers 401). An already deleted owner, or
  an identifier no owner uses, answers 200. An existing owner without the cookie answers 403.

Every removed owner gets a `deleted_owners` row; the account gets a `deleted_accounts` row (upsert, latest time). Records
are removed by looping over `RECORD_TYPES`, plus `applied_ops` and `purge_marks`. The response clears the cookie.

### D6: Refusing stale identities
The JWT callback stores `signedInAt` (server time) at Google sign-in, and the session exposes it. A token without it
counts as 0. `resolveOwner` answers `410 deleted` when the session's account has a marker with
`deleted_at >= signedInAt`, or, without a session, when the cookie owner or `anon_id` is in `deleted_owners`. A newer
session ignores a deleted cookie owner and does not merge it.

### D7: Kept changes
A change queued from `kept_ops` keeps an optional `kept_at` on the wire. The server records but does not merge a change
whose `kept_at <= deleted_at` for the session's account. Dropping them in the browser was rejected: the device cannot
know about the deletion before it sends. `kept_at` is a device time, so see Risks. A change set aside a second time
before it was sent keeps its first time on the wire (`first_kept_at` locally), while the 30 days start again.

### D8: Browser
`deleteLocal` in `lib/local/account.js` is `signOutLocal` without keeping, plus removal of that account's `kept_ops`; it
sets `pending_signout`, so cookies are cleared by the existing path. The runner handles 410: if `epoch` is unchanged since
the request was sent, it calls `deleteLocal` and emits `deleted`; otherwise it drops the answer. The account page sends
what scope matches the local account, and clears the device only on 200. The top bar links to the page; below 1280px,
where the full top bar is hidden, a slim bar holds only that link. The page is added to the precache list and is
`noindex`.

When `AccountControl` finds that the session has ended, it first sends a sync with no changes: it stores nothing, and a
410 clears the device and tells the reader. Without it the ordinary sign-out could happen first and keep the deleted
account's changes.

## Risks / Trade-offs

- [A stale device's legitimate offline change older than another bookmark's purged removal is dropped] → needs more than
  180 days offline; accepted instead of keeping per-dua markers, which is what purging removes.
- [A wrong device clock affects `client_ts` and `kept_at`] → future times are already clamped for `client_ts`; clamp
  `kept_at` the same way. A very slow clock can only cause old data to be dropped.
- [A device that never synced the account merges its own old anonymous data into the new account] → it is data created on
  that device, not restored from the server.
- [A device with old code receives 410] → it treats it as a failed send and retries; nothing is stored. It clears once
  updated.
- [The purge is never run] → no harm beyond growth; the README says how to schedule it.

## Migration Plan

Run `npm run db:user:init` on the hosted database, then deploy. Existing sessions keep working (`signedInAt` = 0 only
matters after a deletion). Rolling back is safe for data, but old server code ignores deletion markers, so a deleted
reader's other devices could upload again; avoid rolling back after deletions have happened.
