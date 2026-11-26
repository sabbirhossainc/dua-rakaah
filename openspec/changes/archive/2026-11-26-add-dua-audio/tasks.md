# Tasks

## 1. Matching library

- [x] 1.1 Add `lib/audio/arabic.js` and `lib/audio/match.js` (D2); verify unit tests for marks, punctuation, spacing and letter variants, the likeness and contained figures (including the "item holds more" scenario), and the 0.95, 0.85 and 0.60 boundaries.
- [x] 1.2 Add the part numbering helper, text hashes and the list builder with decisions (D1, D4); verify tests for each scenario of "A person's decision wins", "Decisions are tied to the texts reviewed" and "Shipped list of recordings", including byte-identical output on a repeat run.

## 2. Matching command

- [x] 2.1 Add source reading and URL validation (D3); verify tests with invented fixtures for the byte order mark, an unreadable chapter, a failed download, duplicate items, non-integer IDs and an unexpected audio address.
- [x] 2.2 Add `scripts/match-audio.mjs`, `npm run audio:match`, the report, an empty `data/audio-review.json` and `.audio-cache/` in `.gitignore`; verify a test on fixtures that the report escapes markup, a failure leaves the list unchanged and lost recordings are named, then run the command against the real source and check that `git status` shows no downloaded text.
- [x] 2.3 Add `scripts/check-audio.mjs` and `npm run audio:check` (D6); verify tests against a local test server for success, 404, a wrong content type, one retry and the exit code.
- [x] 2.4 Document both commands, the review steps, the two data files and how to schedule the check in `README.md`; verify the documented commands run as written.

## 4. Player and cards

- [x] 4.1 Add `lib/audio/player.js` (D5); verify unit tests with a fake element, clock and connection for every scenario of "Play and pause", "One recording at a time", "Next recording on failure" and "Unavailable audio", plus late events from an earlier attempt.
- [x] 4.2 Add `lib/audio/lookup.js`, attach recordings in `CategoryPage`, and add the list to `DEFAULT_INPUTS` (D4); verify tests for a matching hash, changed text, a missing part, and a revision that changes when the list changes.
- [x] 4.3 Add the `DuaAudio` component with its credit to `DuaCard`, and the English and Bangla labels; verify `i18n.test.js`, lint, and in the browser: keyboard use, dark theme, phone and wide widths, two parts of one dua, no audio request before play, offline hiding and return, and "Audio unavailable" with the audio address blocked.
- [x] 4.4 Extend `scripts/smoke.mjs` to check that saved and server-rendered pages still have no `<audio>` and no `ihadis.com`, and that only listed recording URLs appear; verify `npm run build`, `npm run check:precache` and `npm run smoke`.
- [x] 4.5 Update `README.md` (what readers see, offline, the source and the launch condition) and `plan.md` (phase 4a done, the split into 4a and 4b, the deviations in D1 and D2, and the audio source in "Before launch"); verify the text matches the built behavior.

## Workflow follow-up

The change was archived on 2026-11-26 at the owner's request with the first three items below **not done** (they were
tasks 3.1, 3.2 and 5.1).

- Not done (was 3.1): a Hafez listens to every automatic match below 100% and a sample of the rest, decides the pairs
  marked for review, and the decisions go in `data/audio-review.json`. Then `npm run audio:match` succeeds with no
  out-of-date decision and `npm run audio:check` passes. Until then duas 2, 75, 124, 232 and 239 are held back.
- Not done (was 3.2): after that review, record the numbers of parts and duas with a recording, per category, in
  `plan.md` section 5.2, equal to the command's summary.
- Partly done (was 5.1): lint, tests, build, precache check, smoke and the recording check passed, recordings played on
  a production server, and an update that removed a recording was accepted. Offline hiding was only simulated. Still to
  do: with the network off, open a saved category page and confirm it shows no audio control.
- Not verified by 4.3: the app's existing layout crushes the cards at phone widths, so the control was checked there by
  setting a card's width by hand.
- Do not launch audio until Hisn al-Muslim's usage terms are confirmed.
- Register the Quran Foundation app now, for the follow-up Quran.com change.
