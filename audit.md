# UX, UI & Accessibility Audit — Dua & Raka'ah

**Target Application:** `Dua & Raka'ah | All Duas Collection` (`http://localhost:3000/`)  
**Reference Benchmarks:** `https://quran.org/`, `https://duaruqyah.com/`, `https://duaruqyah.com/general-feedbacks`, `https://resend.com/`

---

## Executive Summary

This audit combines visual and functional fixes for **Dua & Raka'ah** with your custom UI/UX direction: compact `sm` buttons, bordered prayer time cards with a top-right `Now` badge on the active prayer, removing the Hijri `-1 / 0 / +1` toggle so **Location & Time**, **Calendar**, and **Countdown** align cleanly, balanced contrast on Dua card badges and borders, hiding subcategory labels on Category cards, rotating Hadith **5 times daily** with a new set every day, disabling support links/pages with a clear notice that support isn't currently accepted, and adding **About Us**, **Privacy Policy**, and **General Feedback** backed by **Resend**.

---

## 1. Hero Section, Prayer Times & Alignment

* **Compact `sm` Buttons:** Standardize all action and utility buttons across the app to compact `sm` height while keeping comfortable horizontal padding, clear labels/icons, and accessible spacing between adjacent controls.
* **Prayer Cards & Active `Now` Badge:** Give non-active prayer cards a clean, uniform border. For the active/current prayer card, place a distinct `Now` badge pinned to the **top-right** corner of that card so the current prayer stands out immediately.
* **Remove Hijri Adjustment Toggle & Align Top Row:** Remove the `-1 / 0 / +1` Hijri date adjustment control. Align **Location & Time**, **Calendar (Gregorian & Hijri date)**, and **Next Prayer Countdown** cleanly in a single horizontal row on desktop (and stacked cleanly on narrow mobile screens) with zero timer clipping (`line-height` and container height verified).

---

## 2. Duas, Categories, Hadith & Support Rules

* **Dua Cards — Badge & Border Contrast:** Tune Dua category/tag badges and card borders so both have strong, accessible contrast against the card background surface (`>= 4.5:1` for text/badges, `>= 3:1` for borders/UI indicators) while matching the card's visual palette.
* **Categories — Hide Subcategory Text:** Do not render subcategory counts or subcategory labels on Category cards; keep the card focused on the category title and icon/dua count if needed.
* **Hadith — 5 Times Daily & New Every Day:** Do not keep Hadith static. Rotate the displayed Hadith **5 times a day** across the five prayer windows (**Fajr**, **Dhuhr**, **Asr**, **Maghrib**, **Isha**) and serve a **new Hadith set every day** based on the date and active prayer period.
* **Support — Pause & Hide:** Do not accept support right now. Inform users clearly that support is not currently being taken, and hide the Support page, navigation links, and support buttons from the UI.

---

## 3. Footer Benchmark (`quran.org` & `duaruqyah.com`) & Recommended Footer

### Benchmark Analysis
* **`https://quran.org/`:** Focuses on clear mission framing, clean multi-column navigation grouped by reader needs, and accessible legal/ informational links (`About`, `Privacy`, `Terms`, etc.) without visual clutter.
* **`https://duaruqyah.com/`:** Focuses on practical daily Islamic utility links (duas, ruqyah, dhikr/prayer tools, saved/bookmark access, and community/feedback channels such as `https://duaruqyah.com/general-feedbacks`).

### Recommended Footer Structure for Dua & Raka'ah
Combine **Quran.org**'s clean column grouping and mission clarity with **Dua & Raka'ah / Dua & Ruqyah**'s practical navigation:
1. **Brand & Mission Column:** Brief description of **Dua & Raka'ah**, a note that support is not currently being accepted, and RTL-isolated Arabic calligraphy (`dir="rtl" lang="ar"`).
2. **Explore / Duas & Prayers Column:** Direct links to **Home**, **All Duas**, **Categories**, **Prayer Times**, and **Saved** (`/bookmark`).
3. **Information & Feedback Column:** Static pages for **About Us** (`/about`), **Privacy Policy** (`/privacy-policy`), and **General Feedback** (`/general-feedbacks`, modeled after `https://duaruqyah.com/general-feedbacks`).
4. **Bottom Legal & Status Bar:** Copyright notice, language/direction note, and a subtle status note confirming support is currently paused.

---

## 4. Static Pages & Backend Feedback via Resend (`https://resend.com/`)

### Static Pages to Add
* **About Us (`/about`):** Explain the purpose of **Dua & Raka'ah**, how prayer times and daily rotating Hadith work, source/authenticity notes, and a clear notice that support is not currently being taken.
* **Privacy Policy (`/privacy-policy`):** Document what data is stored or processed (such as selected city/location for prayer times, saved bookmarks, and voluntarily submitted feedback), cookie/local-storage usage, and how **Resend** (`https://resend.com/`) is used strictly to deliver submitted feedback emails.
* **General Feedback (`/general-feedbacks`):** Patterned after `https://duaruqyah.com/general-feedbacks`, include fields for **Name** (optional), **Email** (optional or required for reply), **Feedback Type** (Bug / Dua or Hadith Correction / UI or Feature Suggestion), and **Message**, with clear validation and confirmation states.

### Backend Integration with Resend (`https://resend.com/`)
1. **Sign Up & API Key:** Create an account at `https://resend.com/`, verify your sending domain (or use Resend's testing sender during local development), and store `RESEND_API_KEY` and `FEEDBACK_TO_EMAIL` in server environment variables (never expose `RESEND_API_KEY` to client code).
2. **Server Route / API Endpoint:** Create a backend route (e.g., `POST /api/general-feedbacks`) that validates the request payload, applies basic rate limiting / honeypot spam protection, and calls the Resend SDK (`resend.emails.send(...)`) to forward submissions to your team inbox.
3. **User Feedback & Error Handling:** Return a clean success response so the `/general-feedbacks` page shows a confirmation message and resets the form, or displays a clear error message if delivery fails.

---

## 5. Relevant Links & Implementation Checklist

* **Reference & Tool Links:**
  * Quran.org: `https://quran.org/`
  * Dua & Ruqyah: `https://duaruqyah.com/`
  * Dua & Ruqyah General Feedbacks: `https://duaruqyah.com/general-feedbacks`
  * Resend Email API: `https://resend.com/`
* **Checklist:**
  * [ ] All buttons styled to `sm` height with accessible spacing.
  * [ ] Prayer cards bordered; active prayer card displays `Now` badge at top-right.
  * [ ] Hijri `-1 / 0 / +1` toggle removed; Location & Time, Calendar, and Countdown aligned.
  * [ ] Dua badges and borders meet contrast standards with card background.
  * [ ] Subcategory text removed from Categories section.
  * [ ] Hadith rotates 5 times daily across prayer times with a new set each day.
  * [ ] Support page, links, and buttons hidden; notice shown that support isn't currently accepted.
  * [ ] Footer structured after `quran.org` and `duaruqyah.com` with links to `/about`, `/privacy-policy`, and `/general-feedbacks`.
  * [ ] `/about`, `/privacy-policy`, and `/general-feedbacks` pages built and connected to Resend (`https://resend.com/`) on the backend.