// The long-form text of the About and Privacy Policy pages, in English and Bangla (design D9 of
// apply-audit-pages-and-feedback). Each page is a list of sections; each section a heading and paragraphs. The Bangla is
// a draft for a Bangla speaker to review, like the labels in i18n.js.

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
        "Your position or chosen place for prayer times, and your settings (language, appearance, Arabic size, reciter), are kept in your browser's local storage. Your position is rounded to about 100 metres and is never sent to our server.",
        "Your bookmarks and memorize progress are kept in your browser's IndexedDB. The pages, images and audio you use offline are kept in the browser's offline cache.",
      ],
    },
    {
      id: "account",
      heading: "If you sign in",
      body: [
        "When you sign in, a cookie keeps you signed in, and your bookmarks, memorize progress and settings are copied to our server so they can sync between your devices. Your position is not copied.",
        "You can delete all of it at any time from the Your data page.",
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
      id: "no-tracking",
      heading: "No tracking",
      body: ["The app has no advertising and no analytics, and it does not sell or share your data."],
    },
  ],
  bn: [
    {
      id: "device",
      heading: "যা আপনার ডিভাইসে থাকে",
      body: [
        "নামাজের সময়ের জন্য আপনার অবস্থান বা বেছে নেওয়া জায়গা, আর আপনার সেটিংস (ভাষা, চেহারা, আরবির আকার, ক্বারী) আপনার ব্রাউজারের লোকাল স্টোরেজে রাখা হয়। আপনার অবস্থান প্রায় ১০০ মিটারে গোল করা হয় এবং কখনো আমাদের সার্ভারে পাঠানো হয় না।",
        "আপনার বুকমার্ক ও মুখস্থের অগ্রগতি ব্রাউজারের IndexedDB-তে রাখা হয়। ইন্টারনেট ছাড়া যে পেজ, ছবি ও অডিও ব্যবহার করেন তা ব্রাউজারের অফলাইন ক্যাশে রাখা হয়।",
      ],
    },
    {
      id: "account",
      heading: "সাইন ইন করলে",
      body: [
        "সাইন ইন করলে একটি কুকি আপনাকে সাইন ইন রাখে, আর আপনার বুকমার্ক, মুখস্থের অগ্রগতি ও সেটিংস আমাদের সার্ভারে কপি হয় যাতে আপনার ডিভাইসগুলোর মধ্যে মিলে যায়। আপনার অবস্থান কপি হয় না।",
        "যেকোনো সময় \"আপনার ডেটা\" পেজ থেকে সব মুছে ফেলতে পারেন।",
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
      id: "no-tracking",
      heading: "কোনো ট্র্যাকিং নেই",
      body: ["অ্যাপে কোনো বিজ্ঞাপন বা অ্যানালিটিক্স নেই, আর এটি আপনার ডেটা বিক্রি বা শেয়ার করে না।"],
    },
  ],
};
