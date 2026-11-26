# Proposal

## Why

Many duas are Quran verses, and Hisn al-Muslim has no recording for most of them: of the 16 dua parts whose whole text
is a run of whole verses, 13 have no audio today (probed on 2026-11-26 against the Tanzil text). Quran.com (Quran
Foundation) offers verse-by-verse recitations by many reciters. This is phase 4b in `plan.md`.

## What Changes

- `npm run audio:match` also finds each dua part in an open Quran text (Tanzil) and records its verse keys. A part
  that is exactly one run of whole verses is accepted automatically. A part that is only some of those verses, or
  almost matches, needs a person's approval.
- New server routes return the recitation addresses for a part and the list of reciters. Only the server holds the
  Quran Foundation credentials, and it keeps answers for one day at most.
- A part with accepted verses plays the Quran.com recitation first and falls back to its Hisn al-Muslim recording.
  Several verses play one after another as one recording.
- The credit names the reciter and Quran Foundation. A part that is only some of the verses is labeled "Full verse
  recitation".
- A reciter picker is added to the Settings panel. It uses the stored `reciter_id` setting, with recitation 7 as the
  default.
- Without Quran Foundation credentials the app behaves as it does today: no Quran.com audio and no picker.

Out of scope: playing or saving audio offline, a seek bar, continuous play from one dua to the next, showing Quran text
from an outside source, a settings page for screens under 1536px, and the Privacy Policy and Terms of Use pages.

Not to be launched until all of these are done: production access is approved, the Privacy Policy and Terms of Use are
published, the verse matches are checked by listening, and Quran Foundation confirms that this use is allowed. Their
terms (2026-11-20) say a website built from their content must refresh it through their Content Sync APIs, and do not
say whether a website that only streams their recitations counts. Hisn al-Muslim's terms are also still unconfirmed.

## Capabilities

### New Capabilities

- `quran-recitation`: how the server supplies Quran.com recitations and the reciter list, including credentials,
  validation, caching limits, fallback to the default reciter and behavior when the source is not set up.

### Modified Capabilities

- `dua-audio`: provider order, multi-verse playback, the credit per source, the "Full verse recitation" label, and what
  is requested before and after play.
- `audio-matching`: matching parts to Quran verses, accepting and reviewing them, and listing verse keys.
- `preferences`: the reciter setting is now chosen in the Settings panel and used for playback.

## Impact

- New dependency: `@quranjs/api` (3.17.0 or later; 3.18.2 on 2026-11-26), used only on the server.
- New server routes under `/api/audio/` and `/api/reciters`. No database change on either database.
- New environment variables: `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, `QF_OAUTH2_BASE_URL`, `QF_API_BASE_URL`. A developer
  must register the app with Quran Foundation. Pre-live access covers only surahs 1 and 2.
- `data/audio-sources.json` changes format (verse keys beside the Hisn al-Muslim entries). `data/audio-review.json`
  gains decisions about verses; existing decisions stay valid.
- Changed code: `lib/audio/`, `scripts/match-audio.mjs`, `scripts/check-audio.mjs`, `scripts/smoke.mjs`, `DuaAudio`,
  `RightBar`, `CategoryPage`, `lib/preferences.js` (default reciter), `lib/i18n.js`, `lib/build-revision.js`,
  `.env.example`, `README.md`, `plan.md`.
- The browser streams audio from Quran Foundation's audio hosts, so they see the reader's address when they press play.
- The service worker needs no change: it already leaves `/api/`, audio and other sites alone.
