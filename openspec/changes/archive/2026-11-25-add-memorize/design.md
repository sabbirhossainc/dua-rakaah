# Design

## Context

See `proposal.md` for why, and `plan.md` sections 4.2 and 4.4 for the table and the merge rule this change carries
out. The bookmark change (`add-user-data-sync`, archived) built the sync; its design is in
`openspec/changes/archive/2026-11-25-add-user-data-sync/design.md` and is not repeated here. Facts checked in the code
on 2026-11-25:

- **The sync is less generic than that design claims.** `lib/sync/records.js` has a `RECORD_TYPES` table, but only the
  validation reads it. These are written for bookmarks alone: `mergeBookmarkInto`, `getBookmark` and `readSince` in
  `lib/sync/store.js` (one table, `type: "bookmark"` hard-coded), `mergeAnonIntoAccount` in `lib/sync/identity.js`,
  and, in the browser, `localChange`, `pulledRecord` and `resendOps` in `lib/local/apply.js`, the transaction table
  lists and the `db.bookmarks.put` loop in `lib/local/sync.js`, and `signOutLocal` and `completeSignIn` in
  `lib/local/account.js`. Making memorize "one entry in the table" therefore needs a refactor first (D4, D6).
- **One position counter** (`sync_counter`) serves every table, so one `cursor` can cover several record types.
- **Wire format today:** a change is `{ op_id, type, dua_id, fields, client_ts }` and a pulled row is
  `{ type, dua_id, ...columns, server_seq }`. Both keep this shape. Memorize is also keyed by `dua_id`.
- **Dexie database `dua-user` is at version 1** (`bookmarks`, `outbox`, `meta`, `kept_ops`). `kept_ops` already stores
  changes of any type as plain wire changes.
- **Pages with per-reader data are static.** `/bookmark` carries a title index built by `buildContentIndex` and joins
  it with the local store in the browser (bookmark design D7). Memorize pages work the same way.
- **The card's icon row** (`DuaIcons`) has five icons. `bookmarkd` is the real bookmark button. `copy`, `plan`, `share`
  and `report` are `<Link href="">` placeholders. The original duaruqyah.com card has copy, bookmark, memorize, share and
  report, so `plan` is taken to be the memorize icon (open question 1).
- **AGENTS.md:** this is not the Next.js of the training data. The task list starts each Next-facing task by reading the
  matching guide under `node_modules/next/dist/docs/`.

## Goals / Non-Goals

**Goals:**
- A reader's learned flags and progress values work offline, never wait for the network, and end up identical on every
  device, in any order of changes.
- Bookmark behavior is bit-for-bit unchanged by the refactor: the existing tests pass unmodified, apart from changed call
  signatures.
- After this change a new record type is a descriptor plus its tests (reciter and language preferences are next).

**Non-Goals:**
- Preferences, spaced repetition, reminders, review history, a "last reviewed" time.
- Purging, account deletion, live push, a manifest. Same as the bookmark change.
- Hiding the sync's round trip behind a different protocol. `POST /api/sync` keeps its shape.

## Decisions

### D1: One `memorize` change type. A reset is an ordinary change with a higher `reset_gen`.

`plan.md` 4.4 has the client send resets as a separate `memorize.reset` op. The server cannot tell the difference: its
merge only looks at `reset_gen`. A second type would add a branch in validation, the outbox and the tests for no
behavior, so there is one type:

```
 change   { op_id, type: "memorize", dua_id, fields: { learned: 0|1, progress: 0..100, reset_gen: n }, client_ts }
 record   { dua_id, learned, progress, reset_gen }          (what the server and the device store)
```

- A change carries the whole new state of the dua (not a delta), so applying it is "merge this record in".
- `client_ts` stays required (all changes have it) but is **never read** for memorize.
- **Alternative:** the plan's separate `memorize.reset`. Rejected as above. If a reset ever needs different server
  behavior (an audit trail, say), it can be split out then.
- **Validation:** `learned` is 0 or 1, `progress` an integer from 0 to 100, `reset_gen` an integer from 0 to
  `MAX_RESET_GEN` (1,000,000), `dua_id` a positive integer. The cap stops one buggy device from pushing the counter so
  high that its owner can never reset again; it only ever affects the sender's own data. The server accepts any integer
  progress, not only the five steps, so the UI can change later without a protocol change.

### D2: The merge, and why the record has no clock

```
 mergeMemorize(a, b):
   if a.reset_gen != b.reset_gen: return the record with the higher reset_gen
   else: { dua_id, reset_gen, learned: max(a.learned, b.learned), progress: max(a.progress, b.progress) }
```

It is commutative, associative and idempotent (it orders by `reset_gen`, then takes the field-wise maximum within a
generation), so any order and any repetition give one result. Unlike bookmarks it compares no times and no op ids, so
**the device's clock cannot affect it** and the server has nothing to correct.

- **Dropped from `plan.md`'s table: `deleted`, `updated_at`, `last_reviewed_at`.** No `deleted`: "start over" is a reset
  to learned 0, progress 0, which is an ordinary record at a higher generation, and the pages hide a 0/0 record. No
  `updated_at`: the merge does not use it. No `last_reviewed_at`: nothing reads it (no spaced repetition), and a
  device-clock value inside a max-merge cannot be corrected by the server without devices ending up different (the
  bookmark design's clamp relies on the server's row replacing the device's, which a max-merge cannot do). If a
  "last reviewed" time is ever wanted it should be stamped by the server. `plan.md` is updated to say so.
- **What the merge does not preserve:** a forward change made on a device that has not yet seen another device's reset
  is lost, because the lower generation loses. That is the meaning of a reset ("the reader went back on purpose") and is
  stated in the spec ("Progress made before a reset arrives late").
- **Alternative:** newest-change-wins, as for bookmarks. Rejected by `plan.md`: two devices learning different parts
  of a dua would overwrite each other, and a device with a wrong clock could pin a dua at a low value.

### D3: What the reader's actions mean, as one pure function

`memorizeChange(existing, target, { op_id })` in `lib/local/apply.js` turns "the reader wants this state" into a record
and a change, or into nothing:

- `existing` defaults to `{ learned: 0, progress: 0, reset_gen: 0 }` (a dua never touched).
- A target equal to the existing state makes no change and queues nothing.
- A target with `learned` or `progress` **below** the existing value is a reset: `reset_gen = existing.reset_gen + 1`,
  values = target. Anything else is forward: same `reset_gen`, values = target (which is at least the existing ones).
- The change's `fields` are the new record, so the local record and the change can never disagree.

The panel maps clicks onto targets, so the data model stays free of UI rules:

| Reader does | Target |
|---|---|
| Ticks "learned" | `learned: 1, progress: 100` |
| Un-ticks "learned" | `learned: 0`, progress unchanged (a reset) |
| Chooses step `p` | `progress: p`, and `learned` stays only if `p` is 100 (so "learned at 25%" cannot occur) |
| Starts over | `learned: 0, progress: 0` (a reset, unless already 0) |

A device that holds a stale `reset_gen` (it has not synced since another device reset) makes its changes at the old
generation, and they lose when they arrive. After that sync, the device's pulled record has the higher generation.

### D4: Server: the record-type table does the work

`lib/sync/records.js` gets a fuller descriptor per type, and the server code loops over it instead of naming bookmarks:

```
 RECORD_TYPES[name] = { table, columns, validateKey, validateFields, cleanFields,
                        fromOp(op), merge(a, b), same(a, b), normalize(record, now) }
```

- `store.js`: `mergeRecordInto(tx, type, ownerId, record)` (read the stored row, `merge`, write with a new `server_seq`
  only when `!same(winner, existing)`), `applyOps` (calls `type.fromOp` then `type.normalize`; bookmarks clamp
  `updated_at`, memorize does nothing), `readSince(tx, ownerId, cursor, types)` (one `SELECT` per requested type, rows
  tagged with `type`, sorted by `server_seq`; the table name comes from the descriptor, never from the request).
- `identity.js`: `mergeAnonIntoAccount` loops over **every** type, whatever the request asked for, since the merge is
  about data and not about what one device can display.
- `bookmark`'s `same` is the existing "winner has the stored `op_id`" test, so bookmark behavior does not change.
- Schema: `memorize(owner_id, dua_id, learned, progress, reset_gen, server_seq, PK(owner_id, dua_id))` with CHECKs
  for the ranges and an index on `(owner_id, server_seq)`, **appended** to `SCHEMA_STATEMENTS` (never edit existing ones).
- **Alternative:** one generic `records(owner_id, type, key, json, ...)` table. Rejected: it loses column checks and
  makes the existing bookmark data move.

### D5: `types` in the request, and a full pull when the set of types changes

The body gets an optional `types` list (`["bookmark", "memorize"]`). The server returns rows only of the listed types it
knows (unknown names are ignored, so a client that is newer than the server still works); an absent or empty list means
`["bookmark"]`. Why:

- **Tabs and saved pages run old code.** The service worker keeps serving the previous build until the reader presses
  "Reload". An old tab that received a `memorize` row would store it as a bookmark (its loop does
  `db.bookmarks.put(...)` for every row), and bookmarks have no `deleted` field to say otherwise. With the opt-in, old
  code only ever receives what it understands.
- **A cursor moves past rows the device did not ask for.** An old device that is up to date has a cursor beyond
  memorize rows it never received. So the browser stores `meta.pulled_types` (the types its cursor covers) and, when the
  types it now asks for are not the same set, **resets the cursor to 0** and pulls everything once. A missing
  `pulled_types` means `["bookmark"]`. This also handles the next record type (preferences) without a Dexie upgrade
  step. A full pull is at most a few hundred rows.
- **Alternative:** a protocol version number. Rejected: the question is "which types can you store", not "which build".

### D6: Browser: the same generalization, and a `memorize` table

- **Dexie version 2** adds `memorize: "dua_id, progress"`; the other tables are unchanged. The first version-1 to
  version-2 open creates the table with no data. An older tab that is still open would block the upgrade; Dexie's own
  default `versionchange` handler closes that tab's connection and reopens it on the next call (checked in
  `node_modules/dexie`, task 4.2), so nothing extra is written for it.
- `apply.js`: `localChange` stays for bookmarks; `memorizeChange` (D3) is added; `pulledRecord` becomes a dispatcher on
  the row's `type` (`applyPulledRow(row, existing, hasPending)`), and a row of a type this build does not know is
  skipped (a server newer than the browser). For memorize, `hasPending` does not matter: the device's record is
  always `merge(local, pulled)`. That is correct because everything the device ever applied locally is either
  acknowledged (already in the server's record, so merging it again changes nothing) or still queued (and must not be
  lost). `resendOps(type, records)` builds the sign-in safety-net changes. A memorize record has no single `op_id`, so
  each re-sent change gets a **new** `op_id`; that is safe because the merge is idempotent.
- `sync.js`: the transactions list every table (`db.transaction("rw", db.meta, db.bookmarks, db.memorize, db.outbox, ...)`),
  rows are applied through the dispatcher, `pending` is a set of `type:dua_id`, and a `403` re-sends the records of every
  type. The request now carries `types`.
- `account.js`: sign-out clears `memorize` with the rest; sign-in re-sends memorize records; `kept_ops` needs no change.
- **Alternative:** a second Dexie database for memorize. Rejected: the outbox, cursor and sign-out handling must stay in
  one transaction with the data.

### D7: The control, the panel and the page

- **`MemorizeButton`** (client) sits in the card's icon row in place of the `plan` placeholder, reading the live
  `useMemorize()` store (the same pattern as `useBookmarks()`: first render "not started", then the local data). The icon
  shows the state: outline when not started, with the progress as a small number badge, filled when learned.
- The button toggles **`MemorizePanel`**, which opens **inline under the icon row** (not as a floating popover, which
  the card's overflow and the sidebar's `fixed` wrapper would clip): a "learned" checkbox, and five progress steps as
  native radio inputs (arrow keys and focus come free), and "Start over". `Escape` closes it. Every action calls
  `memorizeChange` in one Dexie transaction, then `getRunner().notifyChange()`, like `toggle()` does for bookmarks.
- **`/memorize` and `/bn/memorize`** (`app/memorize/page.js`, `app/bn/memorize/page.js`, shared `MemorizePage`): static,
  `robots: noindex`, with the title index from `buildContentIndex` (bookmark D7). `resolveMemorize(records, index)` in
  `lib/content-index.js` keeps records with `progress > 0` or `learned`, drops unknown dua ids, and splits them into
  "in progress" (progress high to low, then dua number) and "learned" (dua number). Each row links to
  `categoryHref + "#dua-" + id` and shows the same panel on demand.
- **`LeftBar`** gets `hrefs: { en: "/memorize", bn: "/bn/memorize" }` for the memorize entry, using the existing
  `LocalizedLink`. `lib/precache.js` gets both pages (9 fixed pages).
- **Checked against the bundled Next docs (task 1.1):** no difference from `app/bookmark/page.js`. A page is a Server Component that renders a client component, and `metadata` with `robots` works as it does for the bookmark pages.
- The bookmark and memorize pages build the same index. It is built once per language per page at build time; the two
  extra pages add about 20 KB each to the saved pages.

### D8: Tests

- **Pure units:** `mergeMemorize` (every spec scenario, plus commutative, associative and idempotent over a few hundred
  random records, including mixed generations), `validateOp` for memorize, `validateSyncBody` with `types`,
  `memorizeChange` (forward, backward, no-op, stale generation), `resolveMemorize`.
- **Server on a real libSQL file:** a memorize change applied twice, a stale-generation change after a reset, a pull
  with and without `types`, `server_seq` strictly increasing across mixed bookmark and memorize writes under
  concurrency, sign-in merge of memorize records (and a forced failure rolling it back), and a handler test that an
  old-style request (no `types`) never gets a `memorize` row.
- **Browser store with `fake-indexeddb`** (as the existing tests do): a change writes the record and the outbox row in
  one transaction; the runner sends `types`, resets the cursor when `pulled_types` differs, skips an unknown row type,
  and merges a pulled row with a pending reset; sign-out keeps unsent memorize changes in `kept_ops` and clears the
  table, and sign-in sends them.
- **Convergence test:** the simulated devices make bookmark changes and memorize changes (including resets from
  stale generations) in the same random schedule. The oracle for memorize is the fold of `mergeMemorize` over every
  record any device made, so it does not depend on the order of delivery. Checked by breaking the reset rule on purpose
  (merge ignoring `reset_gen`) and seeing a seed fail, then reverting.
- **Smoke (`scripts/smoke.mjs`):** `/memorize` and `/bn/memorize` are 200 with `noindex`, a memorize change is
  accepted and comes back in a pull that names the type, the same pull without `types` has no memorize row, and progress
  101 is a 400.
- **Browser check** (manual, recorded under the last task): set a progress offline and see it on a second profile
  after sync; reset on one device and see it win; keyboard-only use of the panel; no console errors on the new pages and
  on `/duas/sleep?cat=6`.

## Risks / Trade-offs

- **[The refactor changes working bookmark code]** → Existing server, store, identity, runner, account and convergence
  tests are kept and must pass with only their call signatures changed. The refactor is its own task group, finished and
  green before any memorize code is added.
- **[A device with a stale generation loses a change silently]** → This is the rule (D2), written in the spec. The
  device shows the merged value after its next sync. Not worth warning about.
- **[Production table missing when the new build is deployed]** → A request that names `memorize` would fail on the
  `SELECT` and the sync answers 503, **for bookmarks too**. Run `npm run db:user:init` against production first (it only
  adds a table, so the old build is unaffected). Stated first in the migration plan and in the README.
- **[Rollback with memorize changes queued]** → The old server rejects a batch that contains an unknown type with a
  400, so a device with queued memorize changes stops syncing until the new build is back. Local data is untouched and
  nothing is lost. Prefer fixing forward. Not mitigated in code: skipping poison changes is a separate piece of work.
- **[Two meanings of "learned" and "progress"]** → They are independent in the data and coupled only by the panel (D3).
  If the product later wants one number, the data model would change; today it matches `plan.md`.
- **[The inline panel makes a card taller]** → Accepted; closed by default. Checked in the browser on a long dua.
- **[`reset_gen` can be pushed up by a buggy client]** → Capped at 1,000,000 (D1), and only the sender's own data is
  affected.

## Migration Plan

1. **Before deploying the code:** run `npm run db:user:init` with the production `TURSO_*` variables. It adds the
   `memorize` table and index and changes nothing else; the current build ignores it.
2. Deploy. Browsers pick the new build up after the "Reload" bar (the service worker is not changed, so no kill
   switch is needed). A device's first sync with the new code asks from position 0 (D5).
3. **Rollback:** deploy the previous build. `memorize` rows stay and are unused. Devices with queued memorize changes
   cannot sync until the new build returns (see Risks). Browsers that already opened the local database keep it at
   version 2. **Checked (task 1.2, 2026-11-25, Dexie 4.4.7 on `fake-indexeddb`):** code that declares only version 1
   opens a version 2 database and reads `bookmarks` normally, so a rollback leaves bookmarks working. (`fake-indexeddb`
   follows the IndexedDB specification, so a browser should behave the same; the browser check in task 7.1 does not repeat it.)
4. Schema changes later are new statements and a new Dexie version, never edits.

## Open Questions

1. **Is the `plan` icon the memorize control?** Assumed yes, because the original site's card icons are copy, bookmark,
   memorize, share and report. If the project means `plan` for something else, only `DuaIcons.js` changes.
2. **Should un-ticking "learned" leave progress at 100?** It does (D3), which can show "100%, not learned". The
   alternative is to drop it to 75. Either is a panel-only change and does not touch the data or the spec text.
3. **Bangla labels** are written by the assistant and need review by a Bangla speaker, as with the earlier labels.
