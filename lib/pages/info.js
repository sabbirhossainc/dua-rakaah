// The long-form text of the About, Privacy Policy and Terms of Use pages, in English and Bangla (design D9 of
// apply-audit-pages-and-feedback). Each page is a list of sections; each section a heading and paragraphs. The Bangla is
// a draft for a Bangla speaker to review, like the labels in i18n.js.
// Privacy facts not known from the repo are left generic until the owner supplies them (launch.md, item 4a): the
// hosting provider's name and its logs, who runs the app, and how often `npm run db:user:purge` is run.

/** The day the privacy policy last changed, as a calendar date. */
export const PRIVACY_UPDATED = { year: 2026, month: 11, day: 28 };

export const ABOUT = {
  en: [
    {
      id: "purpose",
      heading: "What Dua & Raka'ah is for",
      body: [
        "Dua & Raka'ah gathers duas from the Qur'an and Sunnah by the moments of a Muslim's day, with their Arabic text, transliteration, translation and reference, in English and Bangla.",
        "It works offline once installed, and it shows no advertising.",
      ],
    },
    {
      id: "prayer-times",
      heading: "Prayer times",
      body: [
        "Prayer times are computed on your device from your position, or from your country's capital if you do not share a position. Your position never leaves your device.",
        "The times are a guide. Follow your local mosque for the times of congregation.",
        "The Hijri date follows the Umm al-Qura calendar. It can differ by a day from the date announced where you live.",
      ],
    },
    {
      id: "hadith",
      heading: "The daily hadith",
      body: [
        "The hadith on the home page changes five times a day, as each of Fajr, Dhuhr, Asr, Maghrib and Isha begins, and each day brings a new set of five. Everyone sees the same hadith at the same date and prayer time.",
      ],
    },
    {
      id: "sources",
      heading: "Sources and review",
      body: [
        "The duas, with their Arabic text, transliterations and translations, come from the dua collection of IRD Foundation.",
        "Every dua and hadith carries its reference, such as Bukhari or Muslim with the hadith number, and grading where one is given.",
        "The content has not yet been reviewed by a Hafez. Until it has, please check a dua against its reference before relying on it.",
        "If you find a mistake, please tell us through the General Feedback page.",
      ],
    },
    {
      id: "credits",
      heading: "Credits",
      body: [
        "Quran recitations: Quran Foundation (quran.foundation), with the reciter named next to the player. Dua recordings: Hisn al-Muslim (www.hisnmuslim.com).",
        "Prayer times are calculated with adhan-js by Batoul Apps (MIT License), by the University of Islamic Sciences, Karachi method with the Hanafi Asr.",
        "Place names come from GeoNames (www.geonames.org), used under the Creative Commons Attribution 4.0 license, and the capitals by time zone from the IANA time zone database.",
        "To match duas with Quran verses, we use the Quran text of the Tanzil Project (tanzil.net), under the Creative Commons Attribution 3.0 license. The Arabic you read in the app comes from the dua collection above.",
      ],
    },
    {
      id: "support",
      heading: "Support",
      body: ["We are not taking support right now. Thank you for your kindness."],
    },
  ],
  bn: [
    {
      id: "purpose",
      heading: "দোয়া ও রাকাআত কী জন্য",
      body: [
        "দোয়া ও রাকাআত একজন মুসলিমের দিনের বিভিন্ন মুহূর্ত অনুযায়ী কুরআন ও সুন্নাহর দোয়া একত্র করে, আরবি পাঠ, উচ্চারণ, অনুবাদ ও সূত্রসহ, ইংরেজি ও বাংলায়।",
        "একবার ইনস্টল হলে এটি ইন্টারনেট ছাড়াও চলে, আর এতে কোনো বিজ্ঞাপন নেই।",
      ],
    },
    {
      id: "prayer-times",
      heading: "নামাজের সময়",
      body: [
        "নামাজের সময় আপনার ডিভাইসেই হিসাব করা হয়, আপনার অবস্থান থেকে, অথবা অবস্থান না দিলে আপনার দেশের রাজধানী থেকে। আপনার অবস্থান কখনো আপনার ডিভাইসের বাইরে যায় না।",
        "সময়গুলো একটি নির্দেশিকা। জামাতের সময়ের জন্য আপনার স্থানীয় মসজিদ অনুসরণ করুন।",
        "হিজরি তারিখ উম্মুল কুরা পঞ্জিকা অনুযায়ী। আপনার এলাকায় ঘোষিত তারিখ থেকে এক দিন আলাদা হতে পারে।",
      ],
    },
    {
      id: "hadith",
      heading: "দৈনিক হাদিস",
      body: [
        "হোম পেজের হাদিস দিনে পাঁচবার বদলায়, ফজর, যোহর, আসর, মাগরিব ও ইশার প্রতিটি শুরু হলে, আর প্রতিদিন নতুন পাঁচটি আসে। একই তারিখ ও নামাজের সময়ে সবাই একই হাদিস দেখেন।",
      ],
    },
    {
      id: "sources",
      heading: "সূত্র ও পর্যালোচনা",
      body: [
        "দোয়াগুলো, এদের আরবি পাঠ, উচ্চারণ ও অনুবাদসহ, আইআরডি ফাউন্ডেশনের দোয়া সংকলন থেকে নেওয়া।",
        "প্রতিটি দোয়া ও হাদিসের সাথে এর সূত্র থাকে, যেমন বুখারি বা মুসলিম ও হাদিস নম্বর, আর যেখানে দেওয়া আছে সেখানে মান।",
        "বিষয়বস্তু এখনো কোনো হাফেজ পর্যালোচনা করেননি। তা না হওয়া পর্যন্ত কোনো দোয়ার ওপর নির্ভর করার আগে এর সূত্রের সাথে মিলিয়ে নিন।",
        "কোনো ভুল পেলে সাধারণ মতামত পেজের মাধ্যমে আমাদের জানান।",
      ],
    },
    {
      id: "credits",
      heading: "কৃতজ্ঞতা",
      body: [
        "কুরআন তিলাওয়াত: কুরআন ফাউন্ডেশন (quran.foundation), প্লেয়ারের পাশে কারীর নামসহ। দোয়ার রেকর্ডিং: হিসনুল মুসলিম (www.hisnmuslim.com)।",
        "নামাজের সময় হিসাব করা হয় বাতুল অ্যাপসের adhan-js দিয়ে (MIT লাইসেন্স), ইউনিভার্সিটি অব ইসলামিক সায়েন্সেস, করাচি পদ্ধতি ও হানাফি আসর অনুযায়ী।",
        "স্থানের নাম GeoNames (www.geonames.org) থেকে, ক্রিয়েটিভ কমন্স অ্যাট্রিবিউশন ৪.০ লাইসেন্সে ব্যবহৃত, আর সময় অঞ্চল অনুযায়ী রাজধানী IANA সময় অঞ্চল ডেটাবেস থেকে।",
        "দোয়াকে কুরআনের আয়াতের সাথে মেলাতে আমরা তানজিল প্রজেক্টের (tanzil.net) কুরআন পাঠ ব্যবহার করি, ক্রিয়েটিভ কমন্স অ্যাট্রিবিউশন ৩.০ লাইসেন্সে। অ্যাপে আপনি যে আরবি পড়েন তা ওপরের দোয়া সংকলন থেকে।",
      ],
    },
    {
      id: "support",
      heading: "সহায়তা",
      body: ["আমরা এখন কোনো সহায়তা নিচ্ছি না। আপনার আন্তরিকতার জন্য ধন্যবাদ।"],
    },
  ],
};

export const PRIVACY = {
  en: [
    {
      id: "device",
      heading: "What stays on your device",
      body: [
        "Your position or chosen place for prayer times is kept in your browser's local storage. Your position is rounded to about 100 metres and is never sent to our server.",
        "Your settings (appearance, Arabic size, reciter), bookmarks and memorize progress are kept in your browser's IndexedDB. A copy of the appearance and Arabic size is also kept in local storage, so pages show them as soon as they open.",
        "The pages and images you use offline are kept in the browser's offline cache. Recitations are never saved: they play only when you are online.",
      ],
    },
    {
      id: "account",
      heading: "What is copied to our server",
      body: [
        "Your bookmarks, memorize progress and settings are copied to our server, so they are not lost and can sync. This happens even if you do not sign in: they are kept under a random ID that is not linked to you, and a cookie ties this browser to that ID. Your position is not copied.",
        "You can sign in with Google. Google tells us a stable account ID, and that is all we keep: not your name, email address or picture. What was kept under the random ID then moves to your account, so it syncs between your devices.",
        "This data is stored with Turso (turso.tech), a database hosting service.",
        "You can delete all of it at any time from the Your data page.",
      ],
    },
    {
      id: "cookies",
      heading: "Cookies",
      body: [
        "We use two cookies. Both are needed for the app to work, and neither is used for advertising or tracking.",
        "dua_anon ties this browser to its random ID. It is signed, the page's scripts cannot read it, and it lasts a year. It is removed when you delete your data or sign out.",
        "The sign-in cookie keeps you signed in. It holds only your Google account ID and when you signed in, and it is removed when you sign out.",
      ],
    },
    {
      id: "recitations",
      heading: "Recitations",
      body: [
        "Nothing is played or downloaded until you press play. The recording then comes straight to your browser from its source, which sees your network address, as any website you visit does: Hisn al-Muslim (www.hisnmuslim.com) for the Hisn al-Muslim recordings, or Quran Foundation (verses.quran.com, verses.quran.foundation, audio.qurancdn.com and quranicaudio.com) for the Quran recitations.",
        "To find a Quran recitation, our server asks Quran Foundation's service which recording to play. It does not pass on your network address or anything about you, and it keeps the answer in its memory for at most a day, never on disk.",
        "We do not copy or host any recording. Each one is credited next to the player: Hisn al-Muslim, or Quran Foundation and the reciter.",
      ],
    },
    {
      id: "feedback",
      heading: "Feedback you send",
      body: [
        "When you send the General Feedback form, the name, email, feedback type, message and page language you send are delivered to our team by email through Resend (resend.com), an email delivery service. Resend is used only to deliver that email.",
        "We use feedback only to reply to you and to fix or improve the app. We do not store it in a database. Feedback emails are deleted from our inbox within 12 months.",
        "Your network address is used for a few minutes to stop too many messages being sent at once, and is then forgotten.",
      ],
    },
    {
      id: "hosting",
      heading: "Hosting",
      body: [
        "Like any website, the app runs on a hosting service, which may record network addresses and the pages requested in its server logs.",
      ],
    },
    {
      id: "retention",
      heading: "How long we keep your data",
      body: [
        "What is copied to our server is kept until you delete it from the Your data page.",
        "Deleting removes your account, the random IDs of the devices you signed in on, and everything stored under them, in one step. We keep only a marker of the deletion: the time, and either a one-way hash of your account ID or the random ID. It stops another of your devices from uploading the data again.",
        "If you sign out before some changes have reached our server, they stay on this device for up to 30 days, so they can be sent if you sign in again. Then they are deleted.",
        "Bookmarks you removed, and our record of changes already applied, are deleted from the server once they are more than 180 days old, when we clean it up.",
        "Exporting your data is not available yet.",
      ],
    },
    {
      id: "no-tracking",
      heading: "No tracking",
      body: ["The app has no advertising and no analytics, and it does not sell or share your data."],
    },
    {
      id: "contact",
      heading: "Questions and changes",
      body: [
        "To ask about your data or this policy, write to us through the General Feedback page.",
        "When this policy changes, the date at the top of the page changes too.",
      ],
    },
  ],
  bn: [
    {
      id: "device",
      heading: "যা আপনার ডিভাইসে থাকে",
      body: [
        "নামাজের সময়ের জন্য আপনার অবস্থান বা বেছে নেওয়া জায়গা আপনার ব্রাউজারের লোকাল স্টোরেজে রাখা হয়। আপনার অবস্থান প্রায় ১০০ মিটারে গোল করা হয় এবং কখনো আমাদের সার্ভারে পাঠানো হয় না।",
        "আপনার সেটিংস (চেহারা, আরবির আকার, ক্বারী), বুকমার্ক ও মুখস্থের অগ্রগতি ব্রাউজারের IndexedDB-তে রাখা হয়। পেজ খোলার সাথে সাথে দেখাতে চেহারা ও আরবির আকারের একটি কপি লোকাল স্টোরেজেও রাখা হয়।",
        "ইন্টারনেট ছাড়া যে পেজ ও ছবি ব্যবহার করেন তা ব্রাউজারের অফলাইন ক্যাশে রাখা হয়। তিলাওয়াত কখনো সংরক্ষণ করা হয় না: তা কেবল ইন্টারনেট থাকলে চলে।",
      ],
    },
    {
      id: "account",
      heading: "আমাদের সার্ভারে যা কপি হয়",
      body: [
        "আপনার বুকমার্ক, মুখস্থের অগ্রগতি ও সেটিংস আমাদের সার্ভারে কপি হয়, যাতে হারিয়ে না যায় এবং মিলিয়ে রাখা যায়। সাইন ইন না করলেও এটি হয়: সেগুলো এমন একটি এলোমেলো আইডির অধীনে রাখা হয় যা আপনার সাথে যুক্ত নয়, আর একটি কুকি এই ব্রাউজারকে সেই আইডির সাথে যুক্ত রাখে। আপনার অবস্থান কপি হয় না।",
        "আপনি Google দিয়ে সাইন ইন করতে পারেন। Google আমাদের একটি স্থায়ী অ্যাকাউন্ট আইডি জানায়, আর আমরা কেবল সেটিই রাখি: আপনার নাম, ইমেইল ঠিকানা বা ছবি নয়। এরপর এলোমেলো আইডির অধীনে যা রাখা ছিল তা আপনার অ্যাকাউন্টে চলে যায়, যাতে আপনার ডিভাইসগুলোর মধ্যে মিলে যায়।",
        "এই ডেটা Turso (turso.tech) নামের একটি ডেটাবেস হোস্টিং সেবায় রাখা হয়।",
        "যেকোনো সময় \"আপনার ডেটা\" পেজ থেকে সব মুছে ফেলতে পারেন।",
      ],
    },
    {
      id: "cookies",
      heading: "কুকি",
      body: [
        "আমরা দুটি কুকি ব্যবহার করি। দুটিই অ্যাপ চলার জন্য দরকারি, আর কোনোটিই বিজ্ঞাপন বা ট্র্যাকিংয়ের জন্য ব্যবহার হয় না।",
        "dua_anon এই ব্রাউজারকে তার এলোমেলো আইডির সাথে যুক্ত রাখে। এটি স্বাক্ষরিত, পেজের স্ক্রিপ্ট এটি পড়তে পারে না, আর এটি এক বছর থাকে। আপনার ডেটা মুছে ফেললে বা সাইন আউট করলে এটি মুছে যায়।",
        "সাইন-ইন কুকি আপনাকে সাইন ইন রাখে। এতে কেবল আপনার Google অ্যাকাউন্ট আইডি ও কখন সাইন ইন করেছেন তা থাকে, আর সাইন আউট করলে এটি মুছে যায়।",
      ],
    },
    {
      id: "recitations",
      heading: "তিলাওয়াত",
      body: [
        "প্লে চাপার আগে কিছুই চালানো বা নামানো হয় না। এরপর রেকর্ডিং সরাসরি এর উৎস থেকে আপনার ব্রাউজারে আসে, আর যেকোনো ওয়েবসাইটের মতো উৎসটি আপনার নেটওয়ার্ক ঠিকানা দেখতে পায়: হিসনুল মুসলিমের রেকর্ডিংয়ের জন্য হিসনুল মুসলিম (www.hisnmuslim.com), আর কুরআন তিলাওয়াতের জন্য কুরআন ফাউন্ডেশন (verses.quran.com, verses.quran.foundation, audio.qurancdn.com ও quranicaudio.com)।",
        "কুরআন তিলাওয়াত খুঁজতে আমাদের সার্ভার কুরআন ফাউন্ডেশনের সেবাকে জিজ্ঞেস করে কোন রেকর্ডিং চালাতে হবে। এটি আপনার নেটওয়ার্ক ঠিকানা বা আপনার সম্পর্কে কিছুই পাঠায় না, আর উত্তরটি সর্বোচ্চ এক দিন মেমোরিতে রাখে, কখনো ডিস্কে নয়।",
        "আমরা কোনো রেকর্ডিং কপি বা হোস্ট করি না। প্রতিটির কৃতিত্ব প্লেয়ারের পাশে দেখানো হয়: হিসনুল মুসলিম, অথবা কুরআন ফাউন্ডেশন ও ক্বারী।",
      ],
    },
    {
      id: "feedback",
      heading: "আপনার পাঠানো মতামত",
      body: [
        "সাধারণ মতামত ফর্ম পাঠালে আপনার দেওয়া নাম, ইমেইল, মতামতের ধরন, বার্তা ও পেজের ভাষা Resend (resend.com) নামের একটি ইমেইল পাঠানোর সেবার মাধ্যমে ইমেইলে আমাদের দলের কাছে পৌঁছায়। Resend কেবল সেই ইমেইল পৌঁছাতে ব্যবহার হয়।",
        "আমরা মতামত কেবল আপনাকে উত্তর দিতে এবং অ্যাপ ঠিক বা উন্নত করতে ব্যবহার করি। আমরা এটি কোনো ডেটাবেসে রাখি না। মতামতের ইমেইল ১২ মাসের মধ্যে আমাদের ইনবক্স থেকে মুছে ফেলা হয়।",
        "একসাথে অনেক বার্তা পাঠানো ঠেকাতে আপনার নেটওয়ার্ক ঠিকানা কয়েক মিনিট ব্যবহার হয়, তারপর ভুলে যাওয়া হয়।",
      ],
    },
    {
      id: "hosting",
      heading: "হোস্টিং",
      body: [
        "অন্য যেকোনো ওয়েবসাইটের মতো অ্যাপটি একটি হোস্টিং সেবায় চলে, যা তার সার্ভার লগে নেটওয়ার্ক ঠিকানা ও চাওয়া পেজ লিখে রাখতে পারে।",
      ],
    },
    {
      id: "retention",
      heading: "আমরা কতদিন ডেটা রাখি",
      body: [
        "আমাদের সার্ভারে যা কপি হয় তা আপনি \"আপনার ডেটা\" পেজ থেকে মুছে না ফেলা পর্যন্ত রাখা হয়।",
        "মুছে ফেললে আপনার অ্যাকাউন্ট, যেসব ডিভাইসে সাইন ইন করেছেন সেগুলোর এলোমেলো আইডি, আর সেগুলোর অধীনে রাখা সবকিছু একসাথে মুছে যায়। আমরা কেবল মুছে ফেলার একটি চিহ্ন রাখি: সময়, এবং আপনার অ্যাকাউন্ট আইডির একমুখী হ্যাশ অথবা এলোমেলো আইডি। এটি আপনার অন্য কোনো ডিভাইসকে ডেটা আবার আপলোড করতে দেয় না।",
        "কিছু পরিবর্তন আমাদের সার্ভারে পৌঁছানোর আগে সাইন আউট করলে সেগুলো এই ডিভাইসে সর্বোচ্চ ৩০ দিন থাকে, যাতে আবার সাইন ইন করলে পাঠানো যায়। তারপর সেগুলো মুছে যায়।",
        "আপনার সরানো বুকমার্ক, আর আগেই প্রয়োগ হওয়া পরিবর্তনের রেকর্ড, ১৮০ দিনের বেশি পুরোনো হলে আমরা সার্ভার পরিষ্কার করার সময় মুছে ফেলি।",
        "আপনার ডেটা এক্সপোর্ট করার সুবিধা এখনো নেই।",
      ],
    },
    {
      id: "no-tracking",
      heading: "কোনো ট্র্যাকিং নেই",
      body: ["অ্যাপে কোনো বিজ্ঞাপন বা অ্যানালিটিক্স নেই, আর এটি আপনার ডেটা বিক্রি বা শেয়ার করে না।"],
    },
    {
      id: "contact",
      heading: "প্রশ্ন ও পরিবর্তন",
      body: [
        "আপনার ডেটা বা এই নীতি নিয়ে জানতে সাধারণ মতামত পেজের মাধ্যমে আমাদের লিখুন।",
        "এই নীতি বদলালে পেজের উপরের তারিখও বদলায়।",
      ],
    },
  ],
};

/** The day the terms of use last changed, as a calendar date. */
export const TERMS_UPDATED = { year: 2026, month: 11, day: 28 };

// Terms facts not known from the repo (launch.md, item 4a): who runs the app, the governing law and country, and where
// the dua texts, translations and transliterations come from and under what license. Until they are settled the terms
// name no operator or jurisdiction, and the "use" section asks for permission to republish the collection.
export const TERMS = {
  en: [
    {
      id: "agreement",
      heading: "Using Dua & Raka'ah",
      body: [
        "These terms apply when you use Dua & Raka'ah, on the web or installed on your device. By using it, you agree to them.",
        "How we handle your data is explained in the Privacy Policy, which is part of these terms. If you do not agree, please do not use the app.",
      ],
    },
    {
      id: "service",
      heading: "What the app offers",
      body: [
        "Dua & Raka'ah is free to use and shows no advertising. It offers duas from the Qur'an and Sunnah, prayer times, a daily hadith, bookmarks, memorize progress and, where they are available, recitations.",
        "You do not need an account. Signing in with Google is optional and only syncs your data between your devices. Google's own terms apply to your Google account.",
      ],
    },
    {
      id: "content",
      heading: "Duas, translations and references",
      body: [
        "We take care that every dua and hadith is correct, and each carries its reference. Even so, a mistake can remain in the Arabic, the transliteration, the translation or a reference.",
        "The app is an aid for remembrance and learning. It is not a fatwa and does not replace a qualified scholar. For a religious ruling, please ask a scholar you trust.",
        "If you find a mistake, please tell us through the General Feedback page, so we can correct it.",
      ],
    },
    {
      id: "prayer-times",
      heading: "Prayer times and dates",
      body: [
        "Prayer times are computed on your device, and the Hijri date follows the Umm al-Qura calendar. They are a guide, and can differ from your local mosque or from the date announced where you live. Follow your local mosque for the times of congregation and the start of fasting.",
      ],
    },
    {
      id: "recitations",
      heading: "Recitations",
      body: [
        "Recitations play from their sources and belong to their owners: the Hisn al-Muslim recordings to Hisn al-Muslim, and the Quran recitations to Quran Foundation and the reciter. Each is credited next to the player. We do not copy or host any recording.",
        "A recording is matched to a dua by its text and may not follow it exactly, so read along with the text on the page. A recitation can stop being available at any time if its source changes or removes it.",
      ],
    },
    {
      id: "use",
      heading: "How you may use the app",
      body: [
        "You may use the app for your own worship, learning and teaching, and share a dua with others together with its reference.",
        "Please do not copy or republish the collection as a whole, or use it commercially, without our written permission. Do not download recordings in bulk or offer them elsewhere.",
        "Do not try to break, overload or get around the security of the app or its server, or to reach data that is not yours. Do not send spam, abuse or false reports through the feedback form.",
      ],
    },
    {
      id: "ownership",
      heading: "Ownership",
      body: [
        "The Qur'an and the Sunnah belong to no one. The design and code of the app, and the way its content is arranged, are ours. Translations, transliterations and recordings belong to their authors and sources.",
      ],
    },
    {
      id: "data",
      heading: "Your data",
      body: ["You can delete what the app keeps on our server at any time from the Your data page. Deleting cannot be undone."],
    },
    {
      id: "availability",
      heading: "Changes to the app",
      body: [
        "We offer the app as it is, and we may change, pause or stop any part of it, such as a feature or a recitation, at any time.",
        "When you use the app offline, you see the copy saved on your device, which may be older than the website.",
      ],
    },
    {
      id: "liability",
      heading: "Responsibility",
      body: [
        "We work to keep the app correct and available, but we cannot promise that it is free of mistakes or always available. As far as the law allows, we are not responsible for any loss that comes from using the app or from being unable to use it.",
      ],
    },
    {
      id: "contact",
      heading: "Questions and changes to these terms",
      body: [
        "To ask about these terms, write to us through the General Feedback page.",
        "When these terms change, the date at the top of the page changes too. If you keep using the app after a change, the new terms apply.",
      ],
    },
  ],
  bn: [
    {
      id: "agreement",
      heading: "দোয়া ও রাকাআত ব্যবহার",
      body: [
        "ওয়েবে বা আপনার ডিভাইসে ইনস্টল করে দোয়া ও রাকাআত ব্যবহার করলে এই শর্তগুলো প্রযোজ্য। এটি ব্যবহার করে আপনি এগুলোতে সম্মত হন।",
        "আমরা আপনার ডেটা কীভাবে ব্যবহার করি তা গোপনীয়তা নীতিতে বলা আছে, যা এই শর্তাবলির অংশ। সম্মত না হলে অনুগ্রহ করে অ্যাপটি ব্যবহার করবেন না।",
      ],
    },
    {
      id: "service",
      heading: "অ্যাপটি যা দেয়",
      body: [
        "দোয়া ও রাকাআত বিনামূল্যে ব্যবহার করা যায় এবং এতে কোনো বিজ্ঞাপন নেই। এতে আছে কুরআন ও সুন্নাহর দোয়া, নামাজের সময়, দৈনিক হাদিস, বুকমার্ক, মুখস্থের অগ্রগতি, আর যেখানে পাওয়া যায় সেখানে তিলাওয়াত।",
        "অ্যাকাউন্টের দরকার নেই। Google দিয়ে সাইন ইন করা ঐচ্ছিক, আর এটি কেবল আপনার ডিভাইসগুলোর মধ্যে ডেটা মিলিয়ে রাখে। আপনার Google অ্যাকাউন্টে Google-এর নিজস্ব শর্ত প্রযোজ্য।",
      ],
    },
    {
      id: "content",
      heading: "দোয়া, অনুবাদ ও সূত্র",
      body: [
        "প্রতিটি দোয়া ও হাদিস যেন সঠিক হয় সেদিকে আমরা যত্ন নিই, আর প্রতিটির সাথে সূত্র থাকে। তবুও আরবি, উচ্চারণ, অনুবাদ বা সূত্রে কোনো ভুল থেকে যেতে পারে।",
        "অ্যাপটি জিকির ও শেখার একটি সহায়ক। এটি কোনো ফতোয়া নয় এবং একজন যোগ্য আলেমের বিকল্প নয়। শরিয়তের কোনো বিধানের জন্য অনুগ্রহ করে আপনার আস্থাভাজন একজন আলেমকে জিজ্ঞেস করুন।",
        "কোনো ভুল পেলে সাধারণ মতামত পেজের মাধ্যমে আমাদের জানান, যাতে আমরা তা ঠিক করতে পারি।",
      ],
    },
    {
      id: "prayer-times",
      heading: "নামাজের সময় ও তারিখ",
      body: [
        "নামাজের সময় আপনার ডিভাইসেই হিসাব করা হয়, আর হিজরি তারিখ উম্মুল কুরা পঞ্জিকা অনুযায়ী। এগুলো একটি নির্দেশিকা, এবং আপনার স্থানীয় মসজিদ বা আপনার এলাকায় ঘোষিত তারিখ থেকে আলাদা হতে পারে। জামাতের সময় ও রোজা শুরুর জন্য আপনার স্থানীয় মসজিদ অনুসরণ করুন।",
      ],
    },
    {
      id: "recitations",
      heading: "তিলাওয়াত",
      body: [
        "তিলাওয়াত তার উৎস থেকে চলে এবং তার মালিকদের: হিসনুল মুসলিমের রেকর্ডিং হিসনুল মুসলিমের, আর কুরআন তিলাওয়াত কুরআন ফাউন্ডেশন ও ক্বারীর। প্রতিটির কৃতিত্ব প্লেয়ারের পাশে দেখানো হয়। আমরা কোনো রেকর্ডিং কপি বা হোস্ট করি না।",
        "একটি রেকর্ডিং পাঠ মিলিয়ে দোয়ার সাথে যুক্ত করা হয় এবং তা হুবহু না-ও মিলতে পারে, তাই পেজের পাঠ দেখে দেখে শুনুন। উৎস বদলালে বা সরিয়ে নিলে যেকোনো সময় একটি তিলাওয়াত আর না-ও পাওয়া যেতে পারে।",
      ],
    },
    {
      id: "use",
      heading: "অ্যাপটি যেভাবে ব্যবহার করতে পারেন",
      body: [
        "আপনি নিজের ইবাদত, শেখা ও শেখানোর জন্য অ্যাপটি ব্যবহার করতে পারেন, আর সূত্রসহ কোনো দোয়া অন্যদের সাথে শেয়ার করতে পারেন।",
        "আমাদের লিখিত অনুমতি ছাড়া পুরো সংকলন কপি বা পুনঃপ্রকাশ করবেন না, বা বাণিজ্যিকভাবে ব্যবহার করবেন না। একসাথে অনেক রেকর্ডিং নামাবেন না বা অন্য কোথাও দেবেন না।",
        "অ্যাপ বা এর সার্ভার নষ্ট করার, অতিরিক্ত চাপ দেওয়ার বা এর নিরাপত্তা এড়ানোর চেষ্টা করবেন না, বা যে ডেটা আপনার নয় তাতে পৌঁছানোর চেষ্টা করবেন না। মতামত ফর্মে স্প্যাম, গালিগালাজ বা মিথ্যা অভিযোগ পাঠাবেন না।",
      ],
    },
    {
      id: "ownership",
      heading: "মালিকানা",
      body: [
        "কুরআন ও সুন্নাহ কারও মালিকানাধীন নয়। অ্যাপের নকশা ও কোড, আর এর বিষয়বস্তু যেভাবে সাজানো, তা আমাদের। অনুবাদ, উচ্চারণ ও রেকর্ডিং তাদের লেখক ও উৎসের।",
      ],
    },
    {
      id: "data",
      heading: "আপনার ডেটা",
      body: ["অ্যাপটি আমাদের সার্ভারে যা রাখে তা যেকোনো সময় \"আপনার ডেটা\" পেজ থেকে মুছে ফেলতে পারেন। মুছে ফেলা আর ফেরানো যায় না।"],
    },
    {
      id: "availability",
      heading: "অ্যাপের পরিবর্তন",
      body: [
        "আমরা অ্যাপটি যেমন আছে তেমনভাবে দিই, আর যেকোনো সময় এর কোনো অংশ, যেমন কোনো সুবিধা বা তিলাওয়াত, বদলাতে, থামাতে বা বন্ধ করতে পারি।",
        "ইন্টারনেট ছাড়া অ্যাপ ব্যবহার করলে আপনি আপনার ডিভাইসে রাখা কপিটি দেখেন, যা ওয়েবসাইটের চেয়ে পুরোনো হতে পারে।",
      ],
    },
    {
      id: "liability",
      heading: "দায়",
      body: [
        "অ্যাপটি সঠিক ও চালু রাখতে আমরা চেষ্টা করি, কিন্তু এটি ভুলমুক্ত বা সবসময় চালু থাকবে এমন প্রতিশ্রুতি দিতে পারি না। আইন যতটা অনুমতি দেয়, অ্যাপ ব্যবহার করে বা ব্যবহার করতে না পেরে কোনো ক্ষতি হলে তার দায় আমাদের নয়।",
      ],
    },
    {
      id: "contact",
      heading: "প্রশ্ন ও এই শর্তাবলির পরিবর্তন",
      body: [
        "এই শর্তাবলি নিয়ে জানতে সাধারণ মতামত পেজের মাধ্যমে আমাদের লিখুন।",
        "এই শর্তাবলি বদলালে পেজের উপরের তারিখও বদলায়। পরিবর্তনের পরও অ্যাপ ব্যবহার করলে নতুন শর্তাবলি প্রযোজ্য হয়।",
      ],
    },
  ],
};
