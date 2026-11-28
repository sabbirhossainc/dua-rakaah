// The long-form text of the About and Privacy Policy pages, in English and Bangla (design D9 of
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
        "Every dua and hadith carries its reference, such as Bukhari or Muslim with the hadith number, and grading where one is given. The content is reviewed by a Hafez before it is published.",
        "If you find a mistake, please tell us through the General Feedback page.",
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
        "প্রতিটি দোয়া ও হাদিসের সাথে এর সূত্র থাকে, যেমন বুখারি বা মুসলিম ও হাদিস নম্বর, আর যেখানে দেওয়া আছে সেখানে মান। প্রকাশের আগে একজন হাফেজ বিষয়বস্তু পর্যালোচনা করেন।",
        "কোনো ভুল পেলে সাধারণ মতামত পেজের মাধ্যমে আমাদের জানান।",
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
