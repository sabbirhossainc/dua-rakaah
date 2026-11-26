# Design

## Context

See proposal.md for motivation, and sections 5.1 to 5.5 of `plan.md` for the facts about the audio sources. Relevant
current behavior:

- A dua is one or more rows that share `dua.id`, and `rowid` order is the only record of part order. 153 rows have
  Arabic text; they belong to 140 duas. 7 duas have several Arabic parts, each a separate recitation (duas 126 and 205
  hold three surahs each). All rows of a dua share `cat_id`, `subcat_id` and `dua_id`.
- Category pages render per request and are also saved by the service worker. A saved page's revision comes from
  `computeBuildRevision`, which hashes only the content database among the files in `data/`.
- The worker already leaves audio and other origins alone (`lib/sw-rules.js`), so playback needs no change there.
- Hisn al-Muslim: an index at `/api/en/husn_en.json` lists chapters; `/api/ar/<chapter>.json` is
  `{ "<title>": [{ ID, ARABIC_TEXT, REPEAT, AUDIO, ... }] }`. Files start with a byte order mark, their URLs are
  `http://`, a chapter may be unreadable (126 was on 2026-11-25), and audio is served over HTTPS as `audio/mpeg`
  (checked 2026-11-26). No usage terms were found.

## Goals / Non-Goals

**Goals:** a wrong recitation cannot reach a reader without passing a strict match or a person; a replaced content
database cannot silently move a recording to another text; a second source (Quran.com) can be added without changing
the data keys or the player's states.

**Non-Goals:** seeking, speed control, continuous play, saving audio, measuring playback, resolving URLs on the server.

## Decisions

### D1: Two committed JSON files, keyed by dua, part and text hash
`data/audio-sources.json` is generated:
`{ "version": 1, "recordings": [{ dua_id, part, text_sha, candidates: [{ provider, item, url, score, approved }] }] }`.
`data/audio-review.json` is written by the person:
`[{ dua_id, part, item, decision: "approve" | "reject", text_sha, item_sha, note? }]`; it starts as `[]`.

`part` is the 1-based position among the dua's rows in `rowid` order. `text_sha` is SHA-256 of the stored
`dua_arabic`, unnormalized; `item_sha` is the same of the item's `ARABIC_TEXT`. Entries are sorted by dua, part and
play order, so diffs are readable.

Alternatives: an `audio_sources` table in the content database (plan 5.3) was rejected because the diff cannot be
reviewed and replacing the database would drop it. Keying by `dua_id` alone cannot tell parts apart. Keying by
`rowid` breaks when the file is replaced. Compared with plan 5.3, `verse_keys` and `coverage` come with Quran.com,
`checked_at` is dropped (the check writes nothing), and no `ihadis` candidate is listed: every such URL is dead, and
the `audio` column stays in the database if they return.

### D2: Own normalization and edit distance
`lib/audio/arabic.js` normalizes: NFKC; drop combining marks and tatweel; unify the alef forms, alef maqsura and
Persian yeh, ta marbuta and ha, keheh and kaf, and hamza carriers (ؤ to و, ئ to ي); keep Arabic letters only, so
spacing and punctuation vanish.

`lib/audio/match.js` computes `likeness = 1 - distance / longer` (Levenshtein) and
`contained = 1 - semiGlobalDistance / shorter`. Thresholds apply before rounding; the files store three decimals.
About 41,000 pairs of short strings need no library.

Only `likeness` can accept automatically (0.95). This is stricter than plan 5.2, which also accepted contained
matches: a contained match means the recording says more, or less, than the card. 0.85 on either figure marks a pair
for review and 0.60 is the floor for the report. Expect fewer automatic matches than the plan's 56.

### D3: Fetching the source
`scripts/match-audio.mjs` (`npm run audio:match`) fetches the index and then each Arabic chapter, one at a time, into
`.audio-cache/` (ignored by git). `--cached` reuses the cache. Any network or HTTP failure aborts before writing; a
body that cannot be parsed skips that chapter with a warning. Items are de-duplicated by `ID`.

The data is untrusted: chapter and item IDs must be positive integers before they are used in a path or URL; `AUDIO`
is rewritten to `https` and must match `^https://www\.hisnmuslim\.com/audio/ar/[0-9]+\.mp3$`; every value is escaped
in the report. Their text is never committed, and test fixtures use text from our own database or invented data.

The report is one static file, `.audio-cache/report.html`, with `<audio controls preload="none">` per pair and the
decision entry (hashes filled in, `decision` to choose) ready to copy. Pairs needing review come first.

### D4: Attaching recordings to pages
`lib/audio/lookup.js` takes the list and `(dua_id, part, arabic)` and returns URLs only when `text_sha` matches.
`CategoryPage` (server) imports the JSON and adds `recordings` to each grouped part; `DuaCard` renders
`<DuaAudio>` below the Arabic text when it is not empty. Only URLs reach the browser. The matching script and the
page share one helper that numbers parts, so they cannot disagree.

`data/audio-sources.json` is added to `DEFAULT_INPUTS` in `lib/build-revision.js`; without that, saved pages would
keep the old list.

### D5: One player store, one audio element
`lib/audio/player.js` holds the state, with the audio element, timers and online status passed in, so `node --test`
covers it without a browser. State per part: `idle`, `loading`, `playing`, `paused`, `unavailable`. Components
subscribe with `useSyncExternalStore`.

- One element is reused, which gives "one at a time". Each attempt has a token; late events of an earlier attempt are
  ignored. A component that unmounts while active stops playback.
- Failure is an `error` event (also during playback), a `play()` rejection with `NotSupportedError`, or 15 s without
  `playing`. `AbortError` and `NotAllowedError` are not failures. If the device is offline at that moment, nothing is
  marked.
- Failed URLs are kept in memory and cleared on the `online` event, since a poor connection may have caused them.
- The server snapshot is "offline", so server HTML (and therefore saved pages) has no control, and the browser adds it
  only when `navigator.onLine`. The player creates the element in code, so pages still contain no `<audio>`.

A native `<audio controls>` per part was rejected: it cannot express the fallback chain or the two required states,
and puts many media elements on a page.

### D6: Check command
`scripts/check-audio.mjs` (`npm run audio:check`) requests each distinct URL with `Range: bytes=0-0`, one at a time
with one retry, and accepts status 200 or 206 with an `audio/*` type. Nothing schedules it, as with the purge: the
README shows how the operator can.

## Risks / Trade-offs

- [Usage terms unknown] → do not launch before they are confirmed; to withdraw, empty the list and rebuild.
- [5% of a long text can be a whole phrase] → the report shows every automatic match, and a person checks each one
  below 100% before the first release.
- [A recording may differ from the item's own text, for example in repeats or added words] → only listening finds it;
  the review task includes listening, and a rejection removes it.
- [The source changes a file behind the same URL] → the hashes cover text only; accepted, a rerun and the check
  command limit it.
- [The source is slow, blocks requests from other sites or disappears] → "Audio unavailable" per part; the check
  command shows it.
- [The source sees the reader's address on play] → nothing is requested before play; the Privacy Policy page must
  name it.
- [`navigator.onLine` is true without a working connection] → the press ends in "Audio unavailable", cleared at the
  next reconnect.
- [A control appearing after load shifts the card slightly] → accepted; reserving space would leave a gap offline.

## Migration Plan

No database or server change. Run the matching command, review, commit both data files, then build, run
`audio:check` and deploy. Saved devices get the controls with the normal update prompt. Rolling back is reverting the
build.

## Open Questions

- Whether the matches also need sign-off from someone with religious knowledge (plan question 6). It would add
  decisions to the review file and changes nothing else.
- Whether the resulting coverage is enough for launch (plan question 7). Known after the first run.
- Hisn al-Muslim's terms: a launch condition, not a build condition.
