# Design

## Context

See proposal.md for motivation, sections 5.3 to 5.5 of `plan.md` for the Quran Foundation rules and setup, and
`openspec/changes/archive/2026-11-26-add-dua-audio/design.md` (D1 to D6, called 4a below) for what exists. Relevant
current behavior:

- `data/audio-sources.json` (version 1) holds `{ dua_id, part, text_sha, candidates[] }`, each candidate one URL.
  `lib/audio/lookup.js` turns it into `{ key, urls }` per part on the server; the player takes that list and tries one
  URL at a time with a single audio element.
- Category pages render per request and are saved by the service worker, whose revision comes from
  `computeBuildRevision` over the files in `DEFAULT_INPUTS`.
- `reciter_id` is a stored, synced setting with the pattern `^[1-9][0-9]{0,5}$`. Nothing reads it. The Settings panel
  shows only at 1536px and wider.

Checked on 2026-11-26:

- Tanzil "simple-clean" text, version 1.1, CC BY 3.0, from
  `https://tanzil.net/pub/download/index.php?quranType=simple-clean&outType=txt-2&agree=true`: 6236 lines
  `sura|aya|text`, then a copyright block. Verse 1 of every surah but 1 and 9 starts with the basmala (95 and 97 spell
  it the same after normalization). Verbatim copies only; the source must be credited and linked.
- `@quranjs/api` 3.18.2 (Node 18 or later, one dependency): `createServerClient`, then
  `content.v4.audio.verseRecitation.byKey(verseKey, recitationId)`, which calls
  `/content/api/v4/recitations/{id}/by_ayah/{key}` and gives `audioFiles[]` with `verseKey`, a relative `url` and a
  filled `audioUrl`; `content.v4.resources.recitations.list()` gives `{ id, reciterName, style, translatedName }`.
- Probe of the 153 Arabic parts: 16 equal a run of whole verses; 1 more (dua 201) is 97% alike; 15 occur inside
  verses, of which most are short phrases such as glorifications that occur in up to 23 places and are not quotations.
  Of the 16, 3 already have a Hisn al-Muslim recording. Expect about 13 to 17 more parts with audio (50 now).
- The Developer Terms list the audio hosts `quranicaudio.com`, `download.quranicaudio.com`, `verses.quran.com`,
  `verses.quran.foundation` and `audio.qurancdn.com`, require crediting Quran Foundation and the reciter, forbid
  rehosting, and limit stored content to one week.

Checked on pre-live with real credentials on 2026-11-26 (task 6.1), where it differs from or adds to the above:

- The reciter list holds two entries, 6 (Mahmoud Khalil Al-Husary) and 7 (Mishari Rashid al-`Afasy), both with no
  style. **Without a `language` parameter `translatedName` is Arabic**; the service now asks for `language: "en"`.
  `bn` also answers in English, so one list serves both page languages.
- Recitation 7's `url` is relative (`Alafasy/mp3/002255.mp3`, served by `verses.quran.com`). Recitation 6's is
  protocol-relative (`//mirrors.quranicaudio.com/everyayah/...`), and the SDK's `audioUrl` for it is wrong, as D5
  guards against.
- A reciter that does not exist answers 404 "Recitation not found".
- `audio:check`: the 4 listed verses of surahs 1 and 2 passed; the other 49 had no recording, as expected on pre-live.
- Duas 4, 125 and 202 played in Chrome, with both reciters between them. The client secret was in none of 29
  responses, 19 scripts, the build output, `public/`, `data/` or the server log.

## Goals / Non-Goals

**Goals:** only a matched or approved verse can be heard for a part; no Quran Foundation content leaves the server's
short-lived memory except to a reader who pressed play or opened the picker; the app keeps working without credentials.

**Non-Goals:** Content Sync, more than one server instance sharing a cache, gapless playback, word highlighting,
proxying audio, rate limiting the app's own routes.

## Decisions

### D1: The list gains a `quran` field, version 2
`{ dua_id, part, text_sha, quran: { from: "2:285", to: "2:286", coverage: "full" | "partial", approved } | null,
candidates: [...] }`. `candidates` keeps its meaning and may be empty. `from` and `to` are in one surah.

A `quran.com` item inside `candidates` was rejected: it has no URL, so every reader of `candidates` (the check, the
smoke test, the lookup) would need a special case, and the provider order is fixed anyway. A separate file would split
one part's recordings and its text hash in two.

### D2: Verse location on top of the existing normalization
`lib/audio/quran.js` (pure) parses the text and refuses it unless it has 6236 verses, 114 surahs in order and the
`Tanzil Project` notice. It normalizes each verse with `normalizeArabic`, removes the basmala prefix from verse 1
(except surah 1), and removes the same prefix from a part that has it and more. It then looks for the part:

1. exact, starting and ending on verse boundaries: `full`; accepted only if there is exactly one such place;
2. exact inside a run of verses: `partial`; review;
3. otherwise the best runs with likeness at least 0.85 (so within about 15% of the part's length): review. Runs that
   share too few three-letter groups with the part to reach that likeness are skipped without being compared, which
   loses none (a test compares against the exhaustive answer) and makes the whole command take seconds.

A near run is `partial` when it is longer than the part, so a spelling difference can label it "Full verse
recitation".

A run never crosses surahs. Review lists at most 3 places and the total. Exact equality is stricter than 4a's 0.95,
because a different letter in Quran text means different words or a bad text, and a person should see either.

The download goes to `.audio-cache/quran-simple-clean.txt` through the existing caching fetcher, never committed. Not
committing keeps the repository free of a license obligation beyond the README credit. The alternative, a committed
verbatim copy, can be adopted later without changing the list.

### D3: Decisions
A verse decision is `{ dua_id, part, verses: "2:285-2:286", decision, text_sha, verses_sha, note? }`, with
`verses_sha` the SHA-256 of the stored verse lines joined by `\n`. An entry has either `item` or `verses`, never both,
so today's entries stay valid. At most one run per part may be approved; an approval replaces an automatic one. The
report gains a section per part with the verses' Tanzil text. Playing audio in the report needs addresses from the
API, so the report links to nothing and listening is done in the running app (task list).

### D4: Pages carry no source content
`lookup.js` returns per part `{ key, duaId, part, urls, quran: { coverage } | null }`, with `quran` set only when
credentials are configured. Verse keys stay on the server. `quranConfigured()` (all four variables non-empty) is the
single test, used by pages, routes and the build revision, which adds that one boolean as an input so saved pages
update when the source is switched on or off. Credentials must therefore be present at build and at run time; the
README says so. Changing them only at run time leaves saved devices stale until the next build.

### D5: Two routes, an in-memory cache
- `GET /api/audio/[duaId]/[part]?reciter=<n>` returns `200 { urls, coverage, reciter: { id, name } }`, or `400`,
  `404` (not listed, text changed, or not configured) or `503` (unavailable). A path with the part replaces plan 5.4's
  `/api/audio/<dua_id>`, because recordings are per part.
- `GET /api/reciters` returns `200 { reciters: [{ id, name, style }], default: 7 }`, `404` or `503`.
- Both send `Cache-Control: no-store`.

`lib/quran/` holds the client factory, the service (`createRecitations({ client, now })`, so tests inject a fake) and
the response checks. It keeps successful answers for 24 hours in `Map`s, keyed by verse and reciter and for the list;
concurrent requests for a key share one promise; failures are not kept. Keys are bounded because reciters are checked
against the list and verses come from the shipped file. Next's data cache and `fetch` caching were rejected: they can
persist to disk and outlive a restart, which makes the one-week rule harder to show.

Addresses must parse as `https` with a host on the allow-list above or a subdomain of `quranicaudio.com`. The SDK's
`audioUrl` is used, except for a protocol-relative `url`, to which the SDK would wrongly prefix its own host; that one
and plain `http` are upgraded before the check. Each source call has a 10 s timeout. Verses are requested with a
concurrency of 4 (the longest listed run is 11 verses). If the requested reciter lacks any verse (no file, or 404), the
whole run is repeated with recitation 7, so voices are never mixed. Any other failure (refusal, rate limit, timeout, an
address on another host) answers "unavailable" at once, without a second round of calls.

Errors are logged with the status only, never headers, tokens or the SDK error object.

### D6: SDK, server only
`@quranjs/api/server` with `contentScopeMode: "granular"`, scope `content.audio.read`, and both base URLs from the
environment (no production default: a missing URL means "not configured"). The app reaches the client only through
`lib/quran/server.js`, which imports `server-only`; the factory itself does not, so the check command can use it. Plain
`fetch` with our own token handling was considered; the SDK is what the plan and the vendor recommend, and it renews
tokens.

### D7: The player takes sources, not URLs
A part's input becomes an ordered list of sources: `{ provider: "quran", resolve }` or
`{ provider: "hisnmuslim", urls: [url] }`. `resolve()` returns the verse URLs, the reciter name and coverage. A source
is a playlist; `ended` moves to its next URL on the same element and the state stays active, and only the last `ended`
returns to "idle". Any failure (the resolve call, or any verse) fails the whole source and starts the next, using 4a's
failure rules. The 15 s start timer restarts for each verse, and covers the resolve call for the first.

A failed Quran source is remembered by part and reciter, so another reciter can be tried. The player publishes
`{ state, source, reciterName }` per part for the credit. Resolved answers are kept in memory for the visit for at
most one hour, so a second press needs no request and starts inside the reader's action.

"Unavailable" is not stored: it means every source on offer has failed, so choosing another reciter gives the part
something to try again.

The name of the reciter is not known before the first play. The credit then reads "Recitation: Quran Foundation" and
gains the name once resolved, which is before any sound. Fetching the list on every page just to name the reciter early
was rejected: it calls the source for readers who never play.

### D8: Picker
A `ReciterSetting` component in a new "Audio / Reciter" block of `RightBar`, a native `<select>` (the list is longer
than the radio groups elsewhere). The server renders nothing for it; the browser fetches `/api/reciters` when online,
and a `404` hides the block. `DEFAULT_RECITER = 7` lives in `lib/preferences.js`; the setting keeps `default: null`, so
no record is written until the reader chooses.

### D9: Check command
`audio:check` keeps the URL checks. When configured it also resolves every listed verse with recitation 7 through the
same service and range-requests each address.

## Risks / Trade-offs

- [The terms may not allow a website to stream without Content Sync] → launch condition: ask developers@quran.com.
  If refused, unset the credentials and rebuild; Hisn al-Muslim audio is unaffected.
- [Production approval may take long or be refused] → build and test with a fake client; the app behaves as today
  until credentials exist. Live checks stay open tasks.
- [Pre-live has only surahs 1 and 2] → duas 4, 125 and 202 are the live test; the rest need production.
- [A verse-1 file may or may not include the basmala that the card shows] → listen on production (task list). If it is
  missing and wanted, prefixing verse 1:1 is a change to the service only.
- [Safari may refuse `play()` after waiting for the server] → the control returns to the play state without counting a
  failure, and the second press uses the kept answer. Test on iOS before launch.
- [Short pauses between verses, longer on slow networks] → accepted; the control shows loading.
- [Public routes can be called by anyone, spending the app's quota] → only listed parts and listed reciters, cached a
  day, so the source sees a bounded number of distinct calls. A source `429` falls back to Hisn al-Muslim.
- [The cache is per process] → one Node server today; more instances only mean more calls.
- [A recitation by a chosen reciter may differ in reading from the card's text] → the reciter list is the vendor's
  verse-by-verse list as is; the listening review covers the default reciter only.

## Migration Plan

1. Register the app (pre-live), add the four variables to `.env.local`.
2. Run `audio:match`, review verse candidates, commit `data/audio-sources.json` (version 2) and the review file.
3. Build and run with credentials; run `audio:check` and `smoke`.
4. For production, switch both credentials and both URLs together, then rebuild.

No database change. Rolling back is unsetting the variables and rebuilding, or reverting the build.

## Open Questions

- Whether verse-1 files need the basmala added (needs production audio).
- Whether recitation 7 is the wanted default (plan question 5); it is one constant.
- Whether a Hafez should approve partial matches (the review file records whoever decides).
