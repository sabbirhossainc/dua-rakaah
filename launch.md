# Pre-launch checklist: audio and legal

Four things must be settled before audio (phases 4a and 4b) goes live. They come from `plan.md` ("Before launch" and phase 4), `README.md` ("Audio", "Quran.com credentials") and `openspec/changes/archive/2026-11-26-add-quran-audio/tasks.md` ("Workflow follow-up"). Work top to bottom: item 2 cannot start until item 1's answer and Quran Foundation's production approval are in, and item 3's iOS test needs production credentials.

Facts in this file come from the repo unless marked "not found". Where the repo is silent, a note says what to fill in.

## Status on 2026-11-28

Checked against the repo at commit `3f43e8b`. Steps done outside the repo (emails, the Developer Console, listening, iOS) leave no trace there, so they count as not done until the results log at the end says otherwise. The log is still empty.

| Item | State | What is left |
|---|---|---|
| 1. Content Sync question to Quran Foundation | Not started | Send the email and wait for the answer. Blocks item 2. |
| 2. Production access, listening, basmala | Not started (blocked by item 1, and by 4a for the request) | All of it |
| 3a. Partial and near matches | Not started. `data/audio-review.json` holds only the 5 holds from 4b. | All 7 rows |
| 3b. iOS Safari | Not started (needs production credentials and an HTTPS host) | All of it. Two notes were out of date after the redesign and are corrected below. |
| 4a. Privacy Policy | **Partly done.** `/privacy-policy` and `/bn/privacy-policy` exist, are linked from the footer, saved for offline use and smoke-tested. The three wrong statements were fixed and the missing sections added on 2026-11-28. | The facts the repo doesn't have: hosting provider, operator, purge schedule. Then a check against "Developer obligations", and the legal and Bangla reviews (see 4a). |
| 4a. Terms of Use | **Partly done.** `/terms-of-use` and `/bn/terms-of-use` exist (text `TERMS` in `lib/pages/info.js`, dated `TERMS_UPDATED` 2026-11-28, Bangla a draft), are linked from the footer and from the Privacy Policy, saved for offline use and smoke-tested. | The facts the repo doesn't have: operator, governing law, and the source and license of the dua texts and translations. Then the legal and Bangla reviews (see 4a). |
| 4b. Hisn al-Muslim terms, Hafez review, holds, coverage, schedules, offline check | Not started. Nothing schedules `audio:check` or `db:user:purge` (no cron, scheduled task or CI workflow). | All of it |
| 4b. README housekeeping | **Done.** The merge-conflict markers are gone, and the settings design path points at the archive. | Nothing |
| New: `npm run smoke` is out of date | Open | Since `7afe818` (Raka'ah navigation), 39 checks still call `/rakaah` a dead link (`scripts/smoke.mjs`, about line 420), and 4 still expect the old five-entry navigation. Update the script. Also, the script runs against port 3000 unless `BASE_URL` is set, so run it as `BASE_URL=http://localhost:3100 npm run smoke` after `npm start -- -p 3100`. |
| New: About page claim | Open | The About page says the content "is reviewed by a Hafez before it is published", which is not true yet (see 4b). |

Quick reference

| What | Value |
|---|---|
| Quran Foundation API docs | https://api-docs.quran.foundation |
| Developer Terms (last updated 2026-11-20) | https://api-docs.quran.foundation/legal/developer-terms/ |
| Developer Console (app creation link in their docs) | https://dev-console.quran.foundation/projects/new |
| Quran Foundation contact | developers@quran.com (the Terms give it for questions and for written notices) |
| Pre-live hosts (what `.env.local` uses now) | `https://prelive-oauth2.quran.foundation`, `https://apis-prelive.quran.foundation` (surahs 1 and 2 only) |
| Production hosts | `https://oauth2.quran.foundation`, `https://apis.quran.foundation` |
| Env vars (server only, never `NEXT_PUBLIC_`) | `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, `QF_OAUTH2_BASE_URL`, `QF_API_BASE_URL` (see `.env.example`) |
| App type / scope registered | Backend/server, scope `content.audio.read` |
| Default reciter | Recitation 7, Mishari Rashid al-`Afasy (`lib/preferences.js`, confirmed on pre-live 2026-11-26) |
| Withdraw Quran.com audio | Empty the four `QF_*` variables, rebuild |
| Withdraw all audio | Set `recordings` to `[]` in `data/audio-sources.json`, rebuild (do not run `audio:match`, it refills it) |

---

## 1. Ask developers@quran.com about the Content Sync rule

**Why.** The Developer Terms say a website built from Quran Foundation content is permitted only if the content it serves is obtained and refreshed through the Content Sync APIs, and that Content Sync is the only permitted way to get and keep an offline copy (with a next sync at least every 7 days). The Terms do not say whether a website that only streams recitations, resolving addresses per request and keeping nothing, counts. The app does not use Content Sync (it is a stated non-goal in `openspec/changes/archive/2026-11-26-add-quran-audio/design.md`). Launching Quran.com audio without their answer risks revoked credentials (the Terms allow immediate revocation; see `plan.md` section 5.4).

### Steps

- [ ] Re-read the current wording on https://api-docs.quran.foundation/legal/developer-terms/ , sections "Websites, documents, and repositories", "Offline copies", "Direct audio URLs", "Recording files on servers", "Private backend versus redistribution" and "Developer obligations". The quotes in the email below were checked against the live page on 2026-11-26 through a web fetch summary: confirm them word for word, and update the "last updated" date if it has changed.
- [ ] Fill in the placeholders in the email below: your name, the app's public URL, the Client ID of the app registered in the Developer Console (never send the client secret), and any contact detail you want them to use. Do not paste anything from `.env.local`.
- [ ] Send it from an address you will keep checking. Save a copy of the sent message.
- [ ] Note the date sent in "Where to record results" below. If there is no reply in about 10 working days, send one polite follow-up.
- [ ] When they reply, save the full reply text (or a link to it) in your records, and answer the three decisions below.

### Email

**To:** developers@quran.com
**Subject:** Question: does a website that only streams Quran.com recitations need Content Sync? (Client ID [Client ID])

> Assalamu alaikum,
>
> I am writing about an app registered in the Developer Console (Client ID: [Client ID]; app name: [App name], at [App URL]). I would like to confirm that our use of the Content API complies with the Developer Terms (last updated 2026-11-20), and ask about the Content Sync rule before we launch.
>
> **The app.** "[App name]" is an Islamic dua (supplication) website, built with Next.js, that shows duas by category in English and Bangla, with the Arabic text taken from our own database. For the duas that are Quran verses, it plays the Quran.com recitation, and the reader can choose a reciter. We have registered a Backend/server app with the scope `content.audio.read`. We do not use the Quran text from your API.
>
> **Exactly what we use.** Only our server calls your API (through the `@quranjs/api` server client, client credentials). The browser never receives credentials or tokens. Two calls:
> 1. The list of verse-by-verse recitations (used for the reciter picker).
> 2. The audio file address of one verse for one reciter (by verse key), for the verses of 16 dua parts: 53 distinct verses in total, from surahs 1, 2, 3, 18, 51, 97, 109, 112, 113 and 114. The default reciter is recitation 7.
>
> **Storage.** Nothing is requested until a reader presses play (the reciter list is requested when the settings panel loads). Answers are kept only in the memory of the server process, for at most 24 hours, and are never written to disk, a database, a build file or the repository. Our responses to the browser say not to store them, and our offline service worker never saves audio or anything under `/api/`. The only thing we store is our own list of which verse keys (such as "2:285") belong to which dua. We do not store audio files, addresses, reciter names or any other API response, and we do not host or copy any recording: the reader's browser streams each file directly from your audio hosts (only `https` addresses on `verses.quran.com`, `verses.quran.foundation`, `audio.qurancdn.com` and `quranicaudio.com`), and the app shows a credit to Quran Foundation and the reciter next to the player. We do not build an offline copy of any of your content.
>
> **The rule in question.** As we read your Terms, a website built from Quran Foundation Content "is permitted only if the content it serves is obtained and refreshed through the Content Sync APIs", and Content Sync is "the only permitted path for obtaining and maintaining an offline copy", with a next sync "at least every 7 days". We do not hold an offline copy, but we also do not use Content Sync, and the Terms do not say whether live, per-request use like ours is covered.
>
> **Our questions** (a yes or no, with a line of explanation if you can):
> 1. Does a website that only resolves recitation addresses at request time through a backend, and streams the audio from your hosts, fall under the Content Sync requirement for websites? If yes, what exactly must we sync (reciter list, audio addresses, anything else), and is `content.audio.read` the right scope?
> 2. Is keeping API answers (audio addresses and the reciter list) in server memory for up to 24 hours, never on disk, within the 1 week limit and not an "offline copy"?
> 3. Is our verse-key list (for example "2:285" for a dua) in a public or private source repository acceptable, given that it contains no API response, address or audio?
> 4. Is the credit we show ("Recitation: Quran Foundation", plus the reciter's name once the audio address is resolved) sufficient, or is another form of credit required?
> 5. Does the audio file for the first verse of a surah (for example 112:1, recitation 7) include the basmala? We want to describe the audio to readers correctly.
> 6. What do we need to do to get production access for this app, and how long does it usually take? [Delete this question if you request production access separately, see item 2.]
>
> We have not launched. We will wait for your answer before enabling Quran.com audio in production, and we will keep this feature off if the answer is that our use is not allowed.
>
> Jazakum Allahu khayran for your time.
>
> [Your name]
> [App name] | [App URL]
> Client ID: [Client ID]

(Facts in the email, for you to double-check: 16 parts and 53 distinct verses come from `data/audio-sources.json`, version 2; 24-hour in-memory keep is `KEEP_MS` in `lib/quran/recitations.js`; the hosts are the allow-list in the same file; the two calls are `recitations.list` and `verseRecitation.byKey`.)

### Decide when the reply arrives

- [ ] **Content Sync not needed for this use:** keep the code as is. Go to item 2.
- [ ] **Content Sync needed:** do not launch Quran.com audio. Either build it (a new OpenSpec change, `design.md` lists it as a non-goal), or keep the four `QF_*` variables empty and launch with Hisn al-Muslim audio only (once item 4 is settled).
- [ ] **Anything about the 24 hour cache, credit text or basmala:** edit `lib/quran/recitations.js` (`KEEP_MS`), `lib/i18n.js` (credit text) or the player, and update `README.md` and the specs in `openspec/specs/quran-recitation/spec.md`.

**Done when:** you have a written answer to questions 1 and 2 from Quran Foundation, saved, and the result is recorded in `plan.md` ("Before launch") and in the results log below.

**Where to record:** the results log at the end of this file; then change the "Quran Foundation's confirmation" bullet in `plan.md` ("Before launch") and the "Do not launch Quran.com audio until..." paragraph in `README.md` ("Quran.com credentials").

---

## 2. Request production access, then listen to every verse there and check the basmala

**Why.** Pre-live has surahs 1 and 2 only, so only the 4 verses of those surahs have been checked (duas 4, 125 and 202 played on 2026-11-26, and `npm run audio:check` passed those 4 and failed the other 49 as expected). The other 49 verses have never been heard.

### 2a. Request production access

The docs pages read on 2026-11-26 do not say how production approval works, whether there is a form, or how long it takes (they only say to "request production permissions when you are ready" in the Developer Console). Not found: a form URL or a review time.

- [ ] Open the Developer Console, find the app, and look for a production access or permissions request. If there is one, use it and keep a screenshot or the reference number.
- [ ] If there is no such button, or in addition to it, send the short email below. It can be merged with the email from item 1 (question 6).
- [ ] Before requesting, check the app is ready for review: Privacy Policy and Terms of Use are publicly reachable (item 4), because the Terms require them for an Application.
- [ ] Record the date requested and any reference.
- [ ] When approved, store the new production Client ID and client secret in your password store (the secret is shown only once). Confirm the scope `content.audio.read` is granted on production.

**To:** developers@quran.com
**Subject:** Production access request for [App name] (Client ID [Client ID])

> Assalamu alaikum,
>
> We would like to request production access for our Backend/server app "[App name]" ([App URL]), Client ID [Client ID], scope `content.audio.read`. It is an Islamic dua website that plays Quran.com verse recitations (server-side calls only; only addresses on your audio hosts are passed on; credit to Quran Foundation and the reciter is shown; nothing is rehosted). Our Privacy Policy is at [Privacy Policy URL] and our Terms of Use at [Terms of Use URL]. We have tested on pre-live (surahs 1 and 2). Please tell us what else you need from us, and how long approval usually takes.
>
> Jazakum Allahu khayran,
> [Your name]

### 2b. Switch to production and run the automatic check

- [ ] In the environment used for the build and the run (locally `.env.local`; on the host, its environment settings) replace **all four** values together: new `QF_CLIENT_ID`, new `QF_CLIENT_SECRET`, `QF_OAUTH2_BASE_URL=https://oauth2.quran.foundation`, `QF_API_BASE_URL=https://apis.quran.foundation`. Never mix pre-live and production. Do not put them in a file that is committed (`.env*.local` is in `.gitignore`).
- [ ] `npm run build`, then `npm start -- -p 3100`.
- [ ] `npm run audio:check` (reads `.env.local`). It resolves recitation 7 for every listed verse and requests the first byte of each address. **Expect all 53 verses to pass.** Any failure: note the verse, and see "If a verse fails" below.
- [ ] `npm run smoke` (with the server running).

### 2c. Listen to every listed verse (recitation 7)

Listen in the running app (the review report cannot play Quran verses). Open each page, press play, and listen to the whole recording. The player plays a part's verses one after another as one recording. The same verse files are shared by several parts, so listen to each distinct run once in full (11 runs) and press play on every part once to confirm it starts (16 parts). Parts come from `data/audio-sources.json`; find a dua's page by its category (`/duas/<slug>?cat=N`; the card's title is in `data/dua_main.sqlite`).

Check for each run: the correct verses in the right order, no verse missing or repeated, no cut-off at the start or end, a clean sound, the reciter named in the credit, and that the recitation says what the card says.

Use this table; the "Basmala on card" column was read from `data/dua_main.sqlite`. Fill in the last three columns.

| Dua / part | Verses | Basmala printed at the start of the card | First verse of a surah | File starts with basmala? | Heard in full, all correct? | Notes |
|---|---|---|---|---|---|---|
| 4 / 1 | 1:5 | no | no (1:1 is not listed) | n/a | | |
| 27 / 1 | 112:1-4 | yes | yes, 112:1 | | | |
| 37 / 1 | 97:1-5 | **no** | yes, 97:1 | | | |
| 40 / 2 | 51:17-18 | no | no | n/a | | |
| 125 / 1 | 2:255 | no | no | n/a | | |
| 126 / 1 | 112:1-4 | yes | yes, 112:1 | | | |
| 126 / 2 | 113:1-5 | yes | yes, 113:1 | | | |
| 126 / 3 | 114:1-6 | yes | yes, 114:1 | | | |
| 143 / 1 | 18:1-10 | yes | yes, 18:1 | | | |
| 202 / 1 | 2:285-286 | no | no | n/a | | |
| 203 / 1 | 109:1-6 | yes | yes, 109:1 | | | |
| 204 / 1 | 112:1-4 | yes | yes, 112:1 | | | |
| 205 / 1 | 112:1-4 | yes | yes, 112:1 | | | |
| 205 / 2 | 113:1-5 | yes | yes, 113:1 | | | |
| 205 / 3 | 114:1-6 | yes | yes, 114:1 | | | |
| 225 / 1 | 3:190-200 | no | no | n/a | | |

### 2d. The basmala check

Matching ignores an opening basmala before a surah's first verse ("An opening basmala before a surah's first verse is optional", `README.md`; `lib/audio/quran.js`), so the card may show it while the recording of verse 1 does not, or the other way round. Whether Quran.com's verse-1 files carry the basmala is not confirmed anywhere in the repo (the design lists it as an open question), so only listening on production answers it.

For each "first verse of a surah" row above, play it and decide:

- [ ] **File includes the basmala and the card shows it** (expected for 27, 126, 143, 203, 204, 205): fine.
- [ ] **File has no basmala but the card shows it:** the recording says less than the card. Options: accept and note it in the credit or a label; or add the basmala from verse 1:1 in the service only (the add-quran-audio `design.md` says prefixing verse 1:1 "is a change to the service only", i.e. `lib/quran/recitations.js`, with a test); or reject the part with a verse decision (below).
- [ ] **File includes the basmala but the card does not** (the case to watch is dua 37, 97:1-5): the recording says more than the card. Options: accept and label it, or reject it.

To reject (or approve) a run, add one line to the JSON list in `data/audio-review.json`. The report (`npm run audio:match -- --cached`, then open `.audio-cache/report.html`) shows the exact line to copy under each verse entry, including both hashes:

```json
{"dua_id":37,"part":1,"verses":"97:1-97:5","decision":"reject","text_sha":"...","verses_sha":"...","note":"recording includes the basmala, the card does not"}
```

Then run `npm run audio:match -- --cached`, `npm run audio:check`, `npm test`, and commit `data/audio-sources.json` and `data/audio-review.json`.

### If a verse fails

- A single verse with no file or a 404: the whole run is unavailable for that reciter and the service falls back to recitation 7, then to the part's Hisn al-Muslim recording, then "Audio unavailable". Reject the run in `data/audio-review.json` if you do not want it offered, or ask Quran Foundation.
- A refused address (`unexpected address` in the server log): the audio host is outside the allow-list in `lib/quran/recitations.js` (`HOSTS`). Check whether Quran Foundation changed hosts and compare with the Developer Terms list before adding one.
- `401`/`403`: wrong credentials or scope, or pre-live and production values mixed.

**Done when:** production access is approved and the four production values are in place; `npm run audio:check` passes for all 53 verses; every row of the table above is filled in; every basmala mismatch has a recorded decision; any rejections are committed in `data/audio-review.json`.

**Where to record:** the table above (keep it in this file or copy it to `plan.md` phase 4b "Open"); the basmala answer in `openspec/changes/archive/2026-11-26-add-quran-audio/design.md` ("Open Questions") and, if you change code, in `openspec/specs/quran-recitation/spec.md`; then update `plan.md` phase 4b "Open" and "Before launch", and the coverage numbers if a part was rejected (the `audio:match` summary prints them: 63 of 153 parts, 56 of 140 duas on 2026-11-26).

---

## 3. Review the partial matches, and test on iOS Safari

### 3a. Partial and near matches

**What these are.** `npm run audio:match` accepts a Quran verse run automatically only when the card is exactly one run of whole verses found in one place. Anything else is a "partial" (the verses hold more than the card, so the player would label it "Full verse recitation") or "near" (not exactly alike) match, shown as "Needs review" in `.audio-cache/report.html`. Nothing like that is accepted until you decide. `plan.md` says dua 201 is a near match of 2:255, and duas 47, 118 and 128 look like real quotations inside a verse.

From the last report (`.audio-cache/report.html`, generated 2026-11-26 20:11; regenerate it first), the verse entries still needing a decision are:

| Dua / part | Verse(s) found | Likeness | Note |
|---|---|---|---|
| 201 / 1 (Ayatul Kursi) | 2:255 | 97.3% | Near match. The card differs slightly from the verse; the verses hold more than the card. Listen and compare closely. |
| 47 / 1 (Dua of Yunus) | 21:87 | 100% | The card is part of the verse. |
| 118 / 1 (morning and evening #4) | 9:129 | 100% | The card is part of the verse. |
| 128 / 1 | 59:10 | 100% | The card is part of the verse. |
| 246 / 1 (after leaving the toilet) | 2:285 | 100% | Part of a verse. |
| 234 / 1 (before undressing) | 1:1, 11:41, 27:30 | 100% | Short phrase found in several places (the basmala): probably not a quotation of one verse. |
| 26, 32, 123, 200 (tasbih and dhikr phrases, several parts) | 12:108, 21:22, 23:91, 1:2, 6:1, 6:45, 9:72, 29:45, 40:10, 37:35, 47:19 and others | 100% | Short phrases that occur in many places. The README says to leave these alone ("Many short phrases are found inside verses without being quotations"). |

Duas 126 and 205 also list parts with verse entries; their verses (112, 113, 114) are already accepted automatically.

- [ ] Run `npm run audio:match -- --cached` and open `.audio-cache/report.html` in a browser. (Run `npm run audio:match` without `--cached` if you want fresh downloads. It fails safely and leaves the list unchanged if a download is incomplete.) This file is local only: never commit `.audio-cache/`.
- [ ] Go to each part in the table. Read the card's Arabic beside the verse text (right to left, both shown). The card must be a real quotation of the verse, and the recording of the whole verse must be acceptable to play under the label "Full verse recitation".
- [ ] **Approve** only if the card's words are the verse's words and the full-verse recording is an acceptable thing to play for that dua. **Reject** if the phrase is just a coincidence. Leave the short phrases (tasbih and similar) undecided: they never become listed.
- [ ] A person with religious knowledge should make these calls (plan question 6 says a Hafez reviews; the review file records whoever decides).
- [ ] For each decision, copy the approve or reject line shown under the entry into `data/audio-review.json` (a JSON list). An entry names either an `item` (Hisn al-Muslim) or `verses`, never both, and only one run of verses can be approved per part. A decision applies only while the card text and the verse text are unchanged.
- [ ] `npm run audio:match -- --cached` (it fails, changing nothing, if a line is malformed or out of date), `npm run audio:check`, `npm test`.
- [ ] Commit `data/audio-sources.json` and `data/audio-review.json`.
- [ ] After approving a run on production, listen to it once in the app (as in item 2c) and add it to that table.

**Done when:** every row in the table above has a recorded decision (or is a deliberate "leave alone"), `audio:match` runs with no out-of-date decision, and the files are committed.

**Where to record:** `data/audio-review.json` (the decisions), `plan.md` phase 4b "Open" (remove the partial-matches bullet; update the coverage numbers from the `audio:match` summary).

### 3b. Test on iOS Safari

Not yet done on any iPhone or iPad. The player (`lib/audio/player.js`, `app/components/DuaAudio.js`) was written with Safari in mind (design risk: "Safari may refuse `play()` after waiting for the server"): on a `NotAllowedError` the button goes back to the play state without counting a failure, and a second press uses the kept answer.

**What you need.** A real iPhone or iPad with Safari, and a site served over HTTPS (the service worker only works on HTTPS; localhost does not help a phone). Use the production-credentialed build on a staging or production URL: pre-live only has surahs 1 and 2. Not found: the staging or production host. Fill in: [test URL].

- [ ] On iOS Safari, online, open the category pages holding duas 202 (2:285-286), 125 (2:255 plus a Hisn al-Muslim recording), 204 (112:1-4) and 143 (18:1-10). Find each card by its dua id in `data/dua_main.sqlite`. A recitation control appears under the Arabic text after the page loads, never before.
- [ ] **First press plays.** Tap play on a Quran part. Note whether the sound starts on the first tap, or whether the button returns to the play state and the second tap works (the documented fallback). Both are acceptable. A button stuck on loading, or "Audio unavailable" on a verse that played on desktop, is a bug.
- [ ] **Verse sequence.** On a multi-verse part (dua 202: 2:285-286; dua 204: 112:1-4; dua 143: 18:1-10) all verses play in order without stopping after the first. Check this with the screen on and, separately, after locking the screen and returning (not covered by the repo: note what happens).
- [ ] **Pause and resume**, and pressing another part's play stops the first (one recording at a time).
- [ ] **Fallback:** the Hisn al-Muslim recording plays on a part that has one (e.g. dua 125), including the credit "Recitation: Hisn al-Muslim".
- [ ] **No audio request before play.** In Safari's Web Inspector on a Mac connected to the device (or just watching data use), confirm no audio request occurs until play is pressed.
- [ ] **Credit and label.** The credit reads "Recitation: Quran Foundation" and gains the reciter's name once the audio address is resolved; "Full verse recitation" appears when a part is only some of its verses.
- [ ] **Offline.** Turn on airplane mode: the controls disappear on saved pages and come back online. (Also still open from 4a: with the network off, open a saved category page and confirm no audio control.)
- [ ] **Layout at phone width.** The 4a task notes said the old layout crushed the cards at phone widths. The redesign (`redesign-app-ui`, 2026-11-27) lays the app out at every width from 320px, but the audio control has not been seen on a real phone since. Look at the cards and the control on the phone and note anything unusable.
- [ ] **Reciter picker.** Since the redesign the Settings panel (with the reciter list, `app/components/ReciterSetting.js`) opens at every width, so choose a non-default reciter on the phone itself and confirm it plays. Also check that the choice syncs (`reciter_id`) to a desktop signed in with the same Google account.
- [ ] Repeat on a second iOS version if you have one (note the versions tested).

**If something fails:** the player and its tests are in `lib/audio/player.js` and `lib/audio/player.test.js`; the component is `app/components/DuaAudio.js`. Add a failing test first where the fake audio element can reproduce it.

**Done when:** the checklist above passes on at least one real iOS Safari, or each failure has a bug fix (or an accepted, written limitation).

**Where to record:** the results log at the end of this file, then remove the "test playback on iOS Safari" bullet from `plan.md` phase 4b "Open" and note the iOS versions tested in `README.md` ("Audio") if you want.

---

## 4. Publish the Privacy Policy and Terms of Use, and settle the open phase 4a items

### 4a. Privacy Policy and Terms of Use

**Why.** The Quran Foundation Developer Terms require "a publicly reachable Privacy Policy and Terms of Use for the Application" (Developer obligations), and the Privacy Policy "must, at a minimum, incorporate all principles and requirements" of whatever that section names (read it on the Terms page: not confirmed here). `plan.md` ("Before launch") also says to name `www.hisnmuslim.com` and Quran Foundation's audio hosts in the Privacy Policy, because they see the reader's address when they press play.

**Current state (checked 2026-11-28).** Commit `a1916dc` added a Privacy Policy, but there is still no Terms of Use.

- **Done:** `/privacy-policy` and `/bn/privacy-policy` (`app/privacy-policy/page.js`, `app/bn/privacy-policy/page.js`, drawn by `app/components/content/InfoPage.js`). The text is `PRIVACY` in `lib/pages/info.js`, the date is `PRIVACY_UPDATED` (2026-11-28), and the Bangla is a draft. It is linked from the footer on every page (`app/components/SiteFooter.js`). `app/components/MenuCom.js` no longer exists, so the "linked from `MenuCom`" in `plan.md` ("Before launch") is out of date. It is listed in `FIXED_PAGE_URLS` (`lib/precache.js`), in `scripts/smoke.mjs` (which also checks that it names Resend and shows its date) and in the `README.md` page table. `/about` and `/general-feedbacks` were added at the same time, and `/support` now says support is paused.
- **What it covers:** what stays on the device, signing in, the feedback form sent through Resend, and no tracking.
- **Wrong, fix before publishing (in both languages):**
  1. "The pages, images and audio you use offline are kept in the browser's offline cache." The service worker never saves audio (`isAudio` in `lib/sw-rules.js`), so remove "audio".
  2. "When you sign in, ... your bookmarks, memorize progress and settings are copied to our server." They are copied to the server **without signing in too**, under a random anonymous ID that a signed `dua_anon` cookie binds to the browser at the first sync (`lib/sync/handler.js`; `plan.md` section 2, "Identity"). Signing in merges them into the account.
  3. "Your ... settings ... are kept in your browser's local storage." Settings are kept in IndexedDB (Dexie) with the outbox, and only a copy of the theme and Arabic size goes in `localStorage["dua-prefs"]`. The saved place for prayer times is in local storage, which is correct.
- **Missing.** The Quran Foundation terms and `plan.md` need these sections, and none of them are on the page yet:
  - `www.hisnmuslim.com` and Quran Foundation's audio hosts, which see the reader's address when they press play.
  - Google, Turso and the hosting provider.
  - Both cookies: the page mentions only "a cookie keeps you signed in".
  - Deletion markers, the 30 days after sign-out, and the purge schedule.
  - The audio credits.
  - Who runs the app and how to contact them outside the feedback form.

  The full list is below. No other outside service was found in `app/` or `lib/`: prayer times are computed on the device and fonts are served by the app.

- [ ] Read the full "Developer obligations" part of the Developer Terms and note what the Privacy Policy and Terms must contain.
- [ ] Decide and write down the facts the repo does not have: operator name and contact email, hosting provider and where the server runs, applicable country or jurisdiction, effective date. Not found in the repo: fill in.
- [x] Fix the three wrong statements above in `PRIVACY` (`lib/pages/info.js`, English and Bangla). Done 2026-11-28: the device section no longer says audio is cached, and now says settings are in IndexedDB with a copy in local storage; "language" was dropped from the settings, because it comes from the URL and is not stored. The account section is now headed "What is copied to our server" and says the copy happens without signing in too, under a random ID tied to the browser by a cookie. The new Bangla text is a draft for the Bangla reviewer.
- [x] Add the missing points to `PRIVACY`. Done 2026-11-28, in English and a Bangla draft, each checked against the code.
  - **New sections:** "Cookies", "Recitations", "Hosting", "How long we keep your data", and "Questions and changes", which links to General Feedback.
  - **Account section:** now covers Google sign-in (only the account ID is kept, checked in `lib/auth-callbacks.js`) and Turso.
  - **Smoke test:** `scripts/smoke.mjs` now checks that the page names the audio hosts, Turso and `dua_anon`. On the two privacy pages, the no-Quran.com-content rule accepts the bare host names but still refuses full addresses and reciter names.
- [ ] **Still to fill in on the Privacy Policy**, because the repo doesn't know these facts. The page stays general about them, and a comment at the top of `lib/pages/info.js` lists them:
  - the hosting provider's name and what its logs keep (the page says only that the host "may record" addresses);
  - who runs the app (operator name), and a contact address if the feedback form is not enough;
  - how often `npm run db:user:purge` is run (the page says removals over 180 days old are deleted "when we clean it up");
  - anything the "Developer obligations" section of the Quran Foundation terms requires that is still missing.

  Change `PRIVACY_UPDATED` whenever the text changes.
- The list below is what the new sections were written from. Keep it to re-check the page:
  - **On the reader's device:** bookmarks, memorize progress, settings (theme, Arabic text size, reciter) and an outbox of unsynced changes in IndexedDB (Dexie); a copy of theme and size in `localStorage["dua-prefs"]`; the saved offline copy of the pages (service worker).
  - **Cookies:** `dua_anon`, a signed, HTTP-only cookie binding the browser to its random anonymous ID; the Auth.js session cookie when signed in.
  - **On the server (Turso, a hosted SQLite):** records tied to an anonymous random ID, or to an account when the reader signs in with Google. The app stores only Google's account ID, no email, name or picture. After sign-out, unsynced changes are kept on the device for 30 days.
  - **Retention and deletion:** readers can delete their data at `/account` (`/bn/account`), which removes the account, merged anonymous devices and records in one transaction; the server keeps only deletion markers (time plus a SHA-256 hash of the account ID or the random ID). Removed bookmarks and applied change IDs older than 180 days are purged only when the operator runs `npm run db:user:purge`, so decide and state the real schedule. Not built: data export and deleting abandoned anonymous owners (`plan.md` phase 3), so do not promise them.
  - **Third parties:** Google (sign-in), Turso (data hosting), your hosting provider, `www.hisnmuslim.com` and Quran Foundation's audio hosts (`verses.quran.com`, `verses.quran.foundation`, `audio.qurancdn.com`, `quranicaudio.com` and `*.quranicaudio.com`), which see the reader's address when they press play. Quran Foundation's API is called from the server only, so confirm whether the reader's address is passed to it (the code does not appear to forward it; verify). No analytics or tracking code was found in `app/`, `lib/` or `package.json`; confirm your host does not add any, and describe any server logs it keeps.
  - **Quran Foundation requirements** from the Terms (credit, no rehosting, 1 week limit), and the credit for the Hisn al-Muslim recordings.
  - A contact route and how to ask a question or request deletion.
- [ ] Draft the Terms of Use. **First draft written 2026-11-28** (English and a Bangla draft), without a governing law, an operator name or a content license, which the repo does not know; a comment above `TERMS` lists them. It makes no claim of Hafez review (see "About page claim"). Still to settle: acceptable use, no warranty on content and on audio accuracy, source credits (Hisn al-Muslim, Quran Foundation and the reciter), copyright of the dua content, link to the Privacy Policy, how changes are announced, and the governing law. Not found in the repo: where the dua texts in `data/dua_main.sqlite` come from and their license, so state the real source and permission. The UI was once "modeled on duaruqyah.com"; `plan.md` now says it no longer is, but the texts' origin is still not recorded. Resolve this before publishing.
- [ ] Have the two drafts read by someone qualified (a lawyer, or at least the app's owner), and by a Bangla speaker for the `/bn` versions. The Bangla UI labels in `lib/i18n.js` and the Bangla page text in `lib/pages/info.js` were written by the assistant and still need a Bangla reviewer.
- [x] Privacy Policy page added in English and Bangla, static, saved for offline use (see "Current state").
- [x] Add the Terms of Use the same way as the Privacy Policy (done 2026-11-28; `InfoPage` now draws any page's date and section links from tables):
  - a `TERMS` entry (with its own updated date) in `lib/pages/info.js`, drawn by `InfoPage`;
  - `app/terms-of-use/page.js` and `app/bn/terms-of-use/page.js`, copied from `app/privacy-policy/page.js`;
  - title and description labels in `lib/i18n.js`.
- [x] Privacy Policy linked from the footer (`app/components/SiteFooter.js`).
- [x] Link the Terms of Use from the footer, next to the Privacy Policy entry in `SiteFooter.js`, and link it from the Privacy Policy text (its "Questions and changes" section).
- [x] Add the Terms of Use URLs in the places that list the privacy page (done 2026-11-28, plus the language switch in `lib/content.js`; smoke also checks the terms show their date and link the Privacy Policy):
  - `FIXED_PAGE_URLS` in `lib/precache.js` (and `lib/precache.test.js` if it lists the pages);
  - the page lists in `scripts/smoke.mjs`: the fixed pages at about line 160, the list at about line 406, the footer links at about line 422, the expected precache pages at about line 475 and the info-page checks at about line 588;
  - the page table in `README.md`.
- [ ] `npm run lint`, `npm test`, `npm run build`, `npm run check:precache`, then `npm start -- -p 3100` and `npm run smoke`.
- [ ] Deploy, open both URLs from a private browser window (publicly reachable, no sign-in), and put the URLs in the production access request email (item 2a).

**Done when:** both pages are live at public URLs, linked from the footer, name the audio hosts and the data the app keeps (with the three wrong statements fixed), and the smoke and precache checks pass.

**Where to record:** `plan.md`: in "Before launch", the first bullet (it still says "linked from `MenuCom`"); in phase 3, "Not built: ... the Privacy Policy page" (now built); in phase 5, the "Open before launch" bullet about the position, which the page now covers. Put the URLs in the results log below.

### 4b. Settle the open phase 4a items (Hisn al-Muslim audio)

These come from `plan.md` (phase 4a "Open", "Before launch", questions 7 and 8) and `openspec/changes/archive/2026-11-26-add-dua-audio/tasks.md` ("Workflow follow-up").

- [ ] **Hisn al-Muslim's usage terms (blocks launch).** `README.md`: "Do not launch audio until Hisn al-Muslim's usage terms are confirmed." None were found on 2026-11-26. Look on https://www.hisnmuslim.com for terms, a license or a contact page, and ask the site owner in writing whether you may stream their recordings from `https://www.hisnmuslim.com/audio/ar/<id>.mp3` with a credit. Contact details: not found in the repo, fill in. If refused, set `recordings` to `[]` for Hisn al-Muslim entries (or remove them) and rebuild. Quran.com audio is not affected.
- [ ] **Hafez review of the Hisn al-Muslim matches (not done).** Nobody has listened to them. Run `npm run audio:match -- --cached` and open `.audio-cache/report.html` (it plays the Hisn al-Muslim recordings; online needed). Per `README.md` ("Review"), listen to every recording accepted automatically below 100% (3 on 2026-11-26) and to a sample of the others (40 in "Accepted: check a sample"), decide the pairs under "Needs review" (84 parts on 2026-11-26, though many are the short phrases and verse entries from item 3), and approve only if the recording says what the card says: nothing missing, nothing extra. The report that went to the Hafez, `.audio-cache/report-for-hafez.html`, is stale (made before the holds; it lists 70 needing review against 84 now). Regenerate and send a fresh one.
- [ ] **The 5 held-back duas: 2, 75, 124, 232 and 239.** Each has a `reject` line in `data/audio-review.json` (written text differs from the recording by a word or letter, not listened to). When the Hafez approves one, change that line's `decision` from `reject` to `approve`, then `npm run audio:match -- --cached`. Duas 125, 201 and 225 are below 100% but differ only in spelling or spacing and stay on.
- [ ] After the review, `npm run audio:match -- --cached`, `npm run audio:check` (all Hisn al-Muslim addresses pass) and `npm test`, and commit `data/audio-sources.json` and `data/audio-review.json`.
- [ ] **Record the coverage per category** in `plan.md` section 5.2 so it equals the command's summary (was task 3.2 of the archived `add-dua-audio`, not done). On 2026-11-26 the summary was 63 of 153 parts (56 of 140 duas) with any recording, and 50 parts with Hisn al-Muslim only; the per-category figures are printed in `.audio-cache/report.html`.
- [ ] **Offline hiding, in a real browser.** With the network off, open a saved category page and confirm it shows no audio control (only simulated so far; part of task 5.1 of `add-dua-audio`). Do it in Chrome (stop the server) and on iOS (item 3b).
- [ ] **Scheduled link check.** `npm run audio:check` is not scheduled by anything. Schedule it weekly with cron or Windows Task Scheduler (examples in `README.md`, "Checking the recordings"), and decide who reads the failure.
- [ ] **Scheduled purge.** Same for `npm run db:user:purge` (monthly is the README's example), and make the Privacy Policy match what you actually do.
- [ ] **Decide the open plan questions:** is about 50% audio coverage enough for launch (question 7), and is recitation 7 (Mishari Rashid al-`Afasy) the wanted default reciter (question 5). Record the answers in `plan.md` section 6.
- [ ] **The About page's review claim.** `/about` and `/bn/about` (`ABOUT`, section `sources`, in `lib/pages/info.js`) say "The content is reviewed by a Hafez before it is published." That is not true yet: the Hafez review of the audio matches, of `data/home-picks.json` and of the 31 hadith quotes is still open (`plan.md`, phase 5 and "Redesign reviews"). Before launch, either finish those reviews or change the sentence to say what has actually been reviewed.
- [x] **Housekeeping (done by 2026-11-28):** the merge-conflict markers are gone from `README.md`, and its settings design link points at `openspec/changes/archive/2026-11-25-add-preferences/design.md`.

**Done when:** Hisn al-Muslim's terms are confirmed (or its audio is withdrawn), the Hafez has reviewed the matches and the held-back duas are decided, the review files are committed, the per-category numbers are in `plan.md`, and offline hiding was confirmed on a real browser.

**Where to record:** `data/audio-review.json`, `plan.md` phase 4a "Open" and section 5.2, and the results log below.

---

## Final go/no-go

Do not launch audio until all of these are ticked (they repeat the README's launch conditions):

- [ ] Quran Foundation confirmed that this use is allowed (item 1)
- [ ] Production access approved, and the production credentials and both URLs switched in together (item 2)
- [ ] Every listed verse heard on production, basmala decisions made (item 2)
- [ ] Partial and near matches decided, iOS Safari tested (item 3)
- [ ] Privacy Policy corrected and completed, Terms of Use written, both published and linked, naming the audio hosts (item 4a; the Privacy Policy page exists but is not ready)
- [ ] Hisn al-Muslim terms confirmed, Hafez review done, About page's review claim true or changed (item 4b)
- [ ] `npm run lint`, `npm test`, `npm run build`, `npm run check:precache` and `npm run smoke` pass on the final build with production credentials
- [ ] A rollback is ready (see the quick reference above)

## Results log

Fill in as you go.

| Item | Date | Result | Evidence (link, email, file) |
|---|---|---|---|
| 1. Email to developers@quran.com sent | | | |
| 1. Reply received | | | |
| 2a. Production access requested | | | |
| 2a. Production access approved | | | |
| 2b. `audio:check` on production | | | |
| 2c. Listening table complete | | | |
| 2d. Basmala decisions | | | |
| 3a. Partial and near matches decided | | | |
| 3b. iOS Safari tested (device, iOS version) | | | |
| 4a. Privacy Policy URL | | | |
| 4a. Terms of Use URL | | | |
| 4b. Hisn al-Muslim terms | | | |
| 4b. Hafez review | | | |
