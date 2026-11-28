## 1. Buttons and theme

- [x] 1.1 Add size `sm` to `app/components/ui/Button.js` (36px drawn, 44px hit area via pseudo-element) and make it the default (D1)
- [x] 1.2 Switch existing `Button` callers to `sm`, keeping `md`/`lg` only for one main call to action per page; check gaps of at least 8px
- [x] 1.3 Tune `Tag` variants and the card border token in `app/globals.css` for both themes; add the pairs to `lib/theme.test.js` (D12)

## 2. Home page

- [x] 2.1 Remove the Hijri adjustment from `TodayCard.js`, `HomeLive.js`, `lib/prayer/place.js`, `lib/prayer/dates.js` and its strings in `lib/i18n.js`; update their tests (D2)
- [x] 2.2 Lay out location, today and countdown in one aligned row from 1024px; fix countdown digit clipping (D3)
- [x] 2.3 Border every entry in `TimesCard.js` and pin the "Now" `Tag` to the top-right of the current entry (D4)
- [x] 2.4 Add `hadithFor(date, period, n)` with the Bangla fallback to `lib/home/picks.js`, with tests for five distinct per day, no overlap on consecutive days, before-Fajr and unknown period (D5)
- [x] 2.5 Extend `data/home-picks.json` to at least 30 hadith picks from the content database and flag them for content review (D6)
- [x] 2.6 Update `DailyHadith.js` to choose by date and current period, rendering the Dhuhr quote visible on the server
- [x] 2.7 Remove the donation section from `HomePage.js` and give the prayer band the `prayer-times` id

## 3. Categories

- [x] 3.1 Remove subcategory counts from `CategoryGrid.js`, `CategoryList.js` and the home categories card; drop the unused `subcategoryCount` helper and its tests

## 4. Support paused and footer

- [x] 4.1 Remove the support link from `SettingsPanel.js`; rewrite `app/support/page.js` as the paused notice with a link to `/` (D7)
- [x] 4.2 Rebuild `SiteFooter.js` in four parts with language-aware links and the support-paused note; add the strings in both languages (D8)

## 5. Information pages

- [x] 5.1 Write the About content in English and Bangla (`lib/pages/about.js`) and add `/about`, `/bn/about` with metadata (D9)
- [x] 5.2 Write the Privacy Policy content in English and Bangla (`lib/pages/privacy.js`) and add `/privacy-policy`, `/bn/privacy-policy` with metadata and last-updated date
- [x] 5.3 Add the six new URLs to `FIXED_PAGE_URLS` in `lib/precache.js` and update `lib/precache.test.js`

## 6. Feedback

- [x] 6.1 Add `lib/feedback.js` with `validateFeedback` and HTML escaping, plus tests for every field rule
- [x] 6.2 Install `resend`; add `.env.example` entries and README notes for `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL`, `FEEDBACK_FROM_EMAIL`
- [x] 6.3 Add `app/api/general-feedbacks/route.js` with validation, honeypot, rate limit, 503 when unconfigured, Resend send and 502 on failure (D10); test with a mocked Resend client
- [x] 6.4 Add `FeedbackForm.js` with labels, inline errors, focus on first error, honeypot, sending state, success and error announcements, and the offline message (D11)
- [x] 6.5 Add `/general-feedbacks` and `/bn/general-feedbacks` pages with metadata

## 7. Verify

- [x] 7.1 Extend `scripts/smoke.mjs`: no `/support` links outside `/support`, footer links resolve, new pages return 200 in both languages, no subcategory text on `/duas`
- [ ] 7.2 Check the home page at 360, 390, 1024 and 1440px in both themes and at the largest text size: aligned row, badge position, no clipping
- [ ] 7.3 Send a real test feedback through the Resend test sender and confirm the reply-to address
- [x] 7.4 Run `npm test`, `npm run lint` and `openspec validate apply-audit-pages-and-feedback`
