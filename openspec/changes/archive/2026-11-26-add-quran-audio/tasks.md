# Tasks

Tasks 1 to 5 need no credentials. Group 6 needs a Quran Foundation pre-live registration.

## 1. Verse matching

- [x] 1.1 Add `lib/audio/quran.js`: parse and verify the Quran text, and locate parts (D2); verify unit tests with a small fixture for each scenario of "Parts are located in a Quran text", "Only whole verses are accepted automatically" and "Verified Quran text", including no run across surahs.
- [x] 1.2 Extend the list builder for verse decisions and the version 2 list (D1, D3); verify tests for each scenario of "Verse decisions" and "Shipped list of recordings", that today's `audio-review.json` entries are still accepted, and byte-identical output on a repeat run.
- [x] 1.3 Add the verse section to the report; verify a test that it escapes markup, shows both texts and the entry to copy, and limits many places.
- [x] 1.4 Extend `scripts/match-audio.mjs` to download and use the Quran text; verify fixture tests that a failed or truncated download leaves the list unchanged and a lost verse match is named, then run it against the real sources and confirm no downloaded text appears in `git status` and the Hisn al-Muslim entries are unchanged.
- [x] 1.5 Update the matching steps, the list format, the verse decisions and the Tanzil credit and link in `README.md`; verify the documented commands run as written.

## 2. Server recitations

- [x] 2.1 Read the route handler and environment variable guides in `node_modules/next/dist/docs/`, add `@quranjs/api` (3.17.0 or later) and `lib/quran/` with the configured test and client factory (D4, D6); verify the package imports on Node 24, a test that any missing variable means not configured, and add the four variables to `.env.example`.
- [x] 2.2 Add the recitation service (D5); verify tests with a fake client and clock for every scenario of "Recitation of a part", "Default reciter fallback", "Audio addresses are checked", "Short-lived server copies", "Source failures" and "Reciter list", that voices are never mixed, and that no log line holds a token or secret.
- [x] 2.3 Add `/api/audio/[duaId]/[part]` and `/api/reciters`; verify tests for the 200, 400, 404 and 503 answers, `Cache-Control: no-store`, "Only listed parts are served" and "Optional source".
- [x] 2.4 Extend `scripts/check-audio.mjs` for verses (D9); verify tests with a fake service and local server for the three "Recording check" scenarios and a failing verse.
- [x] 2.5 Document the variables (needed at build and run time), pre-live and production, and the extended check in `README.md`; verify the text against the code.

## 3. Player and cards

- [x] 3.1 Change `lib/audio/player.js` to ordered sources and playlists (D7); verify the existing player tests still pass in their new form, plus tests for each scenario of "Quran recitation comes first", "Verses play as one recording", "Reciter choice applies to playback", per-verse timeouts, late resolve answers and the browser refusing playback after a resolve.
- [x] 3.2 Update `lookup.js` and `CategoryPage`, and add the configured boolean to the build revision (D4); verify tests for configured and unconfigured parts, a verses-only part, changed text, no verse key or Quran address in the result, and a revision that differs with the source on and off.
- [x] 3.3 Update `DuaAudio` with the per-source credit and the "Full verse recitation" label, with English and Bangla text; verify `i18n.test.js`, lint, tests for each "Recording credit" and "Full verse label" scenario's state, and in the browser against a fake source: verse sequence, pause, fallback, keyboard, dark theme and no request before play.

## 4. Reciter picker

- [x] 4.1 Add `DEFAULT_RECITER` and the `ReciterSetting` block to `RightBar` (D8), with English and Bangla text; verify tests for the choice of selected value (none saved, listed, unlisted) and that nothing is written on open, and in the browser: keyboard, sync of a choice, offline, no source, and a failing list.
- [x] 4.2 Describe the picker and what readers see in `README.md`; verify against the browser behavior.

## 5. Integration without credentials

- [x] 5.1 Extend `scripts/smoke.mjs`: pages hold no Quran Foundation address or reciter name, and the routes answer 404 when unconfigured and refuse bad input when configured; verify `npm run lint`, `npm test`, `npm run build`, `npm run check:precache` and `npm run smoke` pass with no credentials, and that Hisn al-Muslim playback works as before.
- [x] 5.2 Update `plan.md`: what 4b built, the deviations in D1, D2 and D5, the coverage from the command, and the launch conditions including the Content Sync question; verify it matches the code.

## 6. Live checks (pre-live credentials)

- [x] 6.1 With pre-live credentials, build and run, play duas 4, 125 and 202, change the reciter, and run `npm run audio:check`; verify the real responses pass the address checks, the secret appears in no page, script or response, and record in the design any difference from the checked facts.

## Workflow follow-up

These need people outside this change, and none blocks the tasks above.

- Register the app with Quran Foundation (pre-live) and request production access.
- Ask developers@quran.com whether a website that streams recitations without Content Sync is allowed.
- On production, listen to every listed verse run with the default reciter, check whether verse-1 files carry the
  basmala, and test playback on iOS Safari.
- Have the partial and near matches decided and recorded in `data/audio-review.json`.
- Publish the Privacy Policy and Terms of Use, naming the audio hosts. Do not launch before this and the points above.
