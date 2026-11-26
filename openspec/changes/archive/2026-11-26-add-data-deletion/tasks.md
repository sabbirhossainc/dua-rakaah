# Tasks

## 1. Database

- [x] 1.1 Append the three tables of design D1 to `lib/sync/schema.js`; verify `schema.test.js` shows they are created, re-running changes nothing, and a database with the previous schema upgrades.

## 2. Purge

- [x] 2.1 Add `lib/sync/purge.js` (D2); verify tests for old vs recent removals, live records untouched, merged rows, marks raised and never lowered, repeat runs and dry run.
- [x] 2.2 Add `scripts/purge-user-db.mjs` and `npm run db:user:purge`; verify a test runs it on a `file:` database with and without `--dry-run` and checks the counts printed.

## 3. Refresh after a purge

- [x] 3.1 Accept `since` and answer `full` with `removed_before` (D3), and skip stale bookmark changes (D4); verify tests in `records`, `store` and `handler` cover stale, up-to-date and no-`since` requests, and the cursor ending at or past the mark.
- [x] 3.2 Make the browser send `since`, keep `refresh_cursor`, reset it with `cursor`, and apply a `full` answer; verify tests in `apply` and `sync` for each scenario in the `data-sync` delta, including more than 200 queued changes.
- [x] 3.3 Extend `convergence.test.js` with purges and long-offline devices; verify all seeds end with identical data on the server and every device.

## 4. Server deletion

- [x] 4.1 Store `signedInAt` in the token and session; verify `auth.test.js` shows it is set at sign-in, preserved afterwards, and no personal data is added.
- [x] 4.2 Implement deletion, `POST /api/account/delete` and its route file (D5); verify handler tests for both scopes, merged owners, other readers untouched, retry, rollback on failure, 401, 403 and cross-site.
- [x] 4.3 Refuse stale identities with 410 and ignore old kept changes (D6, D7), keeping `kept_at` in validation and `wireOp`; verify tests for each scenario of the last three server requirements in `data-deletion`.

## 5. Browser deletion

- [x] 5.1 Add `deleteLocal` and the runner's 410 handling (D8); verify `account` and `sync` tests: everything cleared, kept changes of other accounts stay, a stale 410 is ignored.
- [x] 5.2 Add `/account` and `/bn/account`, the confirmation dialog, the top bar link, the `deleted` notice and the English and Bangla labels; verify `i18n.test.js`, lint, and a keyboard-only run in the browser at phone and wide widths, including Escape and the offline state.
- [x] 5.3 Add the two pages to the precache list and smoke checks; verify `precache.test.js`, `npm run build`, `npm run check:precache` and `npm run smoke`.

## 6. Documentation and integration

- [x] 6.1 Update `README.md` (purge command and scheduling, deletion, deploy order) and `plan.md` (phase 3 done); verify the documented commands run as written against a local database.
- [x] 6.2 Run `npm run lint`, `npm test`, `npm run build` and `npm run smoke`, then delete data in a two-browser-profile run against a local database; verify the other profile is cleared at its next sync and the database holds only markers for that reader.
