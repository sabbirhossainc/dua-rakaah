// UI labels for the content area. Content itself comes from the database's _en/_bn columns.
// Bangla labels are drafts for a Bangla speaker to review (see design D6).
export const LABELS = {
  en: {
    categories: "Categories",
    searchCategories: "Search Categories",
    subcategory: "Subcategory",
    duas: "Duas",
    reference: "Reference",
    transliteration: "Transliteration",
    translation: "Translation",
    updateAvailable: "New content is available.",
    reload: "Reload",
    dismiss: "Dismiss",
    offlineTitle: "You're offline",
    offlineBody: "This page isn't saved for offline use.",
    offlineLink: "Go to all duas",
    bookmark: "Bookmark this dua",
    unbookmark: "Remove bookmark",
    bookmarksTitle: "Bookmarks",
    bookmarksEmpty: "You haven't bookmarked any duas yet.",
    bookmarksEmptyLink: "Browse all duas",
    duaFallback: "Dua {n}",
    signIn: "Sign in",
    signOut: "Sign out",
    unsyncedOne: "1 change hasn't synced. It will be kept on this device for 30 days and uploaded the next time you sign in.",
    unsyncedMany: "{count} changes haven't synced. They will be kept on this device for 30 days and uploaded the next time you sign in.",
    signOutConfirm: "Sign out anyway",
    cancel: "Cancel",
  },
  bn: {
    categories: "ক্যাটাগরি",
    searchCategories: "ক্যাটাগরি খুঁজুন",
    subcategory: "সাবক্যাটাগরি",
    duas: "দোয়া",
    reference: "রেফারেন্স",
    transliteration: "উচ্চারণ",
    translation: "অনুবাদ",
    updateAvailable: "নতুন কনটেন্ট পাওয়া যাচ্ছে।",
    reload: "রিলোড করুন",
    dismiss: "বন্ধ করুন",
    offlineTitle: "আপনি অফলাইনে আছেন",
    offlineBody: "এই পৃষ্ঠাটি অফলাইনে ব্যবহারের জন্য সংরক্ষিত নেই।",
    offlineLink: "সব দোয়া দেখুন",
    bookmark: "এই দোয়া বুকমার্ক করুন",
    unbookmark: "বুকমার্ক সরান",
    bookmarksTitle: "বুকমার্ক",
    bookmarksEmpty: "আপনি এখনও কোনো দোয়া বুকমার্ক করেননি।",
    bookmarksEmptyLink: "সব দোয়া ব্রাউজ করুন",
    duaFallback: "দোয়া {n}",
    signIn: "সাইন ইন",
    signOut: "সাইন আউট",
    unsyncedOne: "১টি পরিবর্তন এখনও সিঙ্ক হয়নি। এটি ৩০ দিন এই ডিভাইসে রাখা হবে এবং পরেরবার সাইন ইন করলে আপলোড হবে।",
    unsyncedMany: "{count}টি পরিবর্তন এখনও সিঙ্ক হয়নি। এগুলো ৩০ দিন এই ডিভাইসে রাখা হবে এবং পরেরবার সাইন ইন করলে আপলোড হবে।",
    signOutConfirm: "তবুও সাইন আউট করুন",
    cancel: "বাতিল",
  },
};

export function t(lang, key) {
  const value = LABELS[lang]?.[key];
  if (value === undefined) throw new Error(`Missing label "${key}" for language "${lang}"`);
  return value;
}

/** Like `t`, with `{name}` placeholders replaced from `vars`. */
export function fmt(lang, key, vars = {}) {
  return t(lang, key).replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}
