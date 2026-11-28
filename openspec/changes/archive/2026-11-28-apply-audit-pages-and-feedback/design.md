## Context

The home page (`app/components/home/*`) computes prayer times on the device and already has a period model in
`lib/prayer/waqt.js` (`waqtAt` returns `current`, null between sunrise and Dhuhr). The duas card already switches by
period; the hadith card (`DailyHadith.js`) picks one of 8 quotes by `dayIndex(date, n)`. All quotes are rendered into
the HTML and hidden but one, so the page works before scripts run. Buttons come from `ui/Button.js` with sizes `md`
(44px) and `lg` (52px). The footer is `SiteFooter.js`. There is no email sending in the app today, and this Next.js
version differs from older ones: read `node_modules/next/dist/docs/` for route handlers and env handling before coding.

## Goals / Non-Goals

**Goals:** carry out the audit's checklist; keep every page useful before scripts run and offline; keep the 44px touch
target; keep secrets on the server.

**Non-Goals:** a donation flow; storing feedback in a database; an admin view of feedback; a CAPTCHA; a Terms page.

## Decisions

### D1. Compact size `sm` with an extended hit area
Add `sm: { text: "min-h-9 px-4", icon: "size-9" }` to `Button`, and give `sm` a `relative` class with an
`after:absolute after:-inset-1` pseudo-element (4px on each side, 44px total). Make `sm` the default; keep `md`/`lg`
for one main call to action per page. Groups of `sm` buttons use `gap-2` or more so extended areas never overlap.
*Alternative:* lowering the touch-target rule to 36px; rejected by the user to keep the existing accessibility bar.

### D2. Hijri offset removed, not hidden
Delete the segmented control from `TodayCard`, drop `HIJRI_OFFSETS` and the `hijriOffset` field from
`lib/prayer/place.js` (a stored value is read and discarded), and call `formatHijri(date, lang)` without an offset.
Strings `hijriAdjust`, `hijriBack`, `hijriNone`, `hijriForward` are removed from `lib/i18n.js`.

### D3. Top row grid
The prayer band becomes `grid lg:grid-cols-3 lg:items-stretch` for location, today and countdown, with prayer times in a
full-width row below. The countdown digits use `leading-none` plus vertical padding and `tabular-nums`, and the circle's
inner box is sized from the text, not a fixed height, so nothing clips at the largest Arabic/text size setting.

### D4. "Now" badge position
Each time entry gets `relative border border-line` (a theme token meeting 3:1). The current entry keeps its fill and
bold text, and its `Tag` moves to `absolute -top-2.5 end-2`, so it sits on the top-right (`end` flips on RTL, though
these pages are LTR). The entry reserves no extra height, so all six stay the same size.

### D5. Hadith by date and period
New pure function in `lib/home/picks.js`:
`hadithFor(date, period, n)` where `period ∈ {fajr, dhuhr, asr, maghrib, isha}`. Index =
`(dayNumber(date) * 5 + PERIOD_INDEX[period]) mod n`. Two consecutive days use ten consecutive indices, so they are
all distinct whenever `n ≥ 10`; with `n ≥ 30` a quote comes back at most once every six days. Sunrise-to-Dhuhr counts as `fajr`; after midnight before Fajr uses the previous date's `isha`, matching how
`waqtAt` reports Isha. Unknown period → `dhuhr`. The Bangla fallback walks forward from the index, skipping quotes
without Bangla text and quotes already used for the day. The server renders all quotes hidden and the date's Dhuhr
quote visible; the client swaps by `useTodayInPlace` and the current waqt, as the duas card already does.
*Alternative:* a seeded shuffle per day; rejected because it cannot promise no overlap between consecutive days.

### D6. More hadith picks
Extend `data/home-picks.json` `hadith` to at least 30 `{dua_id, part, field}` entries drawn from top/bottom texts in
`dua_main.sqlite` that carry a hadith reference. The list is reviewed like the existing picks before release.

### D7. Support paused
Remove the donation section from `HomePage.js`, the support links from `SiteFooter.js` and `SettingsPanel.js`, and
rewrite `app/support/page.js` as a short notice with a link to `/`. Strings `supportUs` are replaced by `supportPaused`.
`/support` stays in the precache list.

### D8. Footer
`SiteFooter` becomes a 3-column grid from `lg`, plus a bottom bar. Links use `langPrefix(lang)`. "Prayer Times" links to
`${prefix}/#prayer-times` (the band's section gets that id). "Categories" links to `${prefix}/duas`. "Saved" →
`${prefix}/bookmark`. Links are text links (not buttons), each with a 44px-high hit row.

### D9. Static pages
`app/about/page.js`, `app/privacy-policy/page.js`, and `app/bn/...` twins render one shared component per page with a
`lang` prop, using `PageIntro`, `Section` and `Card`. Text lives in a content module per page (`lib/pages/about.js`,
`lib/pages/privacy.js`) with `en` and `bn` blocks, not in `i18n.js`, because it is long-form. Each has
`generateMetadata` with its own title and description. Add all six URLs to `FIXED_PAGE_URLS`.

### D10. Feedback route and Resend
`app/api/general-feedbacks/route.js` exports `POST`, imports `server-only`, and:
1. parses JSON (limit 16 KB) and validates with a shared pure `validateFeedback` in `lib/feedback.js`, also used by the
   form;
2. if `website` is non-empty, returns `200 {ok:true}` without sending;
3. rate-limits by `x-forwarded-for` first address with an in-memory sliding window (5 per 10 min). This is per server
   instance; acceptable for current traffic, noted as a risk;
4. returns `503` if `RESEND_API_KEY` or `FEEDBACK_TO_EMAIL` is missing;
5. calls `new Resend(key).emails.send({ from: FEEDBACK_FROM_EMAIL ?? "onboarding@resend.dev", to, replyTo: email,
   subject: "[Feedback] <type>", text, html })` with all values HTML-escaped; returns `502` on `error`.
Env vars go in `.env.local` (git-ignored) and are documented in `README.md` and `.env.example`.

### D11. Feedback form
`app/components/FeedbackForm.js` (client): native inputs with labels, `aria-invalid` and `aria-describedby` errors,
focus on first error, a visually hidden honeypot (`tabIndex={-1}`, `aria-hidden`, `autocomplete="off"`), a status
region `role="status"` for success and `role="alert"` for errors. When `navigator.onLine` is false it shows the
needs-a-connection message and keeps values.

### D12. Badge and border contrast
Adjust `Tag` variants used on `DuaCard` and the card border token in `app/globals.css` for both themes, and add the
pairs to the existing contrast test in `lib/theme.test.js`.

## Risks / Trade-offs

- In-memory rate limit resets on deploy and is per instance → acceptable now; move to a shared store if abuse appears.
- Removing the Hijri adjustment may show a date one day off in some countries → the About page says dates follow Umm
  al-Qura.
- The new hadith picks need content review before release → tasks keep that review as an explicit step.
- Resend's test sender only delivers to the account owner's address → production needs a verified domain.

## Migration Plan

Ship in one release. Stored `hijriOffset` values are ignored, no data migration. Rollback is a redeploy; the feedback
route is inert without env vars (`503`).

## Open Questions

- Which domain will send feedback email (`FEEDBACK_FROM_EMAIL`)? Until decided, the Resend test sender is used locally.
