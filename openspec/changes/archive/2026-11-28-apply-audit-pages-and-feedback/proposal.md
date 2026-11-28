## Why

The UX audit (`audit.md`, 2026-11-28) found the home page's top row crowded by the Hijri adjustment control, buttons
heavier than the rest of the interface, low-contrast dua badges and borders, and a hadith that only changes once a
day. The app also asks for support it is not ready to take, and it has no About, Privacy or feedback pages, so readers
cannot learn how it works or report a wrong dua.

## What Changes

- Add a compact `sm` button size (36px drawn, 44px tap area) and use it for action and utility buttons across the app.
- Give every prayer time entry a uniform border, and pin the "Now" badge to the top-right corner of the current one.
- **BREAKING** Remove the Hijri −1 / 0 / +1 adjustment. The Hijri date is always Umm al-Qura with no offset, and a
  stored `hijriOffset` is ignored. Location and time, today, and countdown line up in one row from 1024px and stack
  below it, with the countdown digits never clipped.
- Dua card badges reach at least 4.5:1 contrast, and card borders at least 3:1.
- Category cards and the category list stop showing subcategory counts.
- The hadith card changes five times a day, once per prayer period, with a new set of five each day. The hand-picked
  list grows from 8 to at least 30 quotes taken from the content database.
- **BREAKING** Support is paused: the home donation card and the footer and Settings links to `/support` are removed.
  `/support` stays at its address and shows a notice that support is not being taken right now.
- A new four-part footer: brand and mission, Explore links, Information links, and a bottom bar.
- New pages in English and Bangla: `/about`, `/privacy-policy`, `/general-feedbacks` (and `/bn/...`).
- A feedback form posting to `POST /api/general-feedbacks`, which validates input, rejects spam and over-limit senders,
  and emails the submission to the team through Resend.

## Capabilities

### New Capabilities
- `info-pages`: the About and Privacy Policy pages and what they must say.
- `general-feedback`: the feedback form, its API route, spam protection, and delivery by Resend.

### Modified Capabilities
- `home-page`: Hijri adjustment removed, top row aligned, bordered prayer entries with a corner "Now" badge, hadith
  rotating by period, donation card removed.
- `site-shell`: the new footer, and the support-paused `/support` page.
- `app-navigation`: support no longer linked from Settings or the footer.
- `visual-theme`: the compact button size, with the touch-target rule kept.
- `dua-categories`: subcategory counts no longer shown.
- `dua-display`: contrast for dua card badges and borders.
- `offline-content`: the information pages load offline; the form says it needs a connection.

## Impact

- Components: `ui/Button.js`, `ui/Tag.js`, `home/TodayCard.js`, `home/TimesCard.js`, `home/CountdownCard.js`,
  `home/HomeLive.js`, `home/HomePage.js`, `home/DailyHadith.js`, `content/CategoryGrid.js`, `content/CategoryList.js`,
  `content/DuaCard.js`, `SiteFooter.js`, `SettingsPanel.js`, `app/support/page.js`, `app/globals.css`.
- Library: `lib/home/picks.js`, `lib/prayer/place.js`, `lib/prayer/dates.js`, `lib/i18n.js`, `lib/precache.js`.
- Data: `data/home-picks.json` grows its `hadith` list (the new quotes need the same content review as the current ones).
- New routes: `app/about`, `app/privacy-policy`, `app/general-feedbacks`, their `app/bn/...` twins, and
  `app/api/general-feedbacks/route.js`.
- New dependency `resend`. New server-only environment variables `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL`,
  `FEEDBACK_FROM_EMAIL`.
