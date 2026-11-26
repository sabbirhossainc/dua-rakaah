# Proposal

## Why

Readers cannot hear any dua: every audio URL in the content database is dead, so the cards have no audio at all. The
Hisn al-Muslim recordings cover many of the same texts and need no credentials, so audio can start with them while
Quran Foundation access is still being arranged. This is the first half of phase 4 in `plan.md`.

## What Changes

- A command, `npm run audio:match`, compares the Arabic of every dua part with the Hisn al-Muslim items and writes a
  side-by-side report, with the recordings, for a person to check.
- A shipped file lists the accepted recordings for each dua part. A match is accepted only when the two whole texts are
  at least 95% alike, or when a person approved it. A person can also reject an automatic one.
- A dua part with an accepted recording gets a play and pause button and the credit "Recitation: Hisn al-Muslim".
  Only one recording plays at a time, and nothing is requested before the reader presses play.
- The button is hidden when the device is offline. When no recording works while online, it is disabled and labeled
  "Audio unavailable".
- A command, `npm run audio:check`, checks that every listed recording still answers with audio.
- The rule that dua cards have no audio is removed.

Out of scope (the follow-up change for Quran.com): `/api/audio` and `/api/reciters`, the reciter picker, reading the
`reciter_id` setting, and the "Full verse recitation" label. Also out of scope: hosting or saving audio, a seek bar,
a scheduler for the health check, the dead `ihadis.com` URLs, and the Privacy Policy page.

Not to be launched until Hisn al-Muslim's usage terms are confirmed. They were not found when checked on 2026-11-26.

## Capabilities

### New Capabilities

- `dua-audio`: playing a dua's recitation on its card, including the offline, unavailable and credit behavior.
- `audio-matching`: which recordings belong to which dua part, how a person approves them, and how their URLs are
  checked.

### Modified Capabilities

- `dua-display`: removes the requirement that cards have no audio.

## Impact

- New data files: `data/audio-sources.json` (shipped) and `data/audio-review.json` (the person's decisions). The
  content database is not changed. Downloaded Hisn al-Muslim text and the report are not committed.
- New code: `lib/audio/`, `scripts/match-audio.mjs`, `scripts/check-audio.mjs`, a card button component.
- Changed code: `DuaCard`, `lib/content.js` or `CategoryPage` (to attach recordings to parts), `lib/i18n.js`,
  `lib/build-revision.js` (so saved pages update when the list changes), `scripts/smoke.mjs`, `.gitignore`,
  `package.json` (two scripts), `README.md`, `plan.md`.
- The browser streams audio from `www.hisnmuslim.com`, so that site sees the reader's address when they press play.
- The service worker needs no change: it already leaves audio and other sites alone.
- No new dependencies, no database change, no new server routes.
