"use client";

import { useBookmarks } from "@/lib/local/bookmark-store";
import { toggle } from "@/lib/local/client";
import { t } from "@/lib/i18n";

// The bookmark control on a dua card. It reads and writes only the local store, so it never waits for the network.
export default function BookmarkButton({ duaId, lang }) {
  const { ids } = useBookmarks();
  const saved = ids.has(duaId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={t(lang, saved ? "unbookmark" : "bookmark")}
      title={t(lang, saved ? "unbookmark" : "bookmark")}
      onClick={() => toggle(duaId).catch((error) => console.error("Could not save the bookmark:", error))}
      className={`relative w-6 cursor-pointer rounded ${saved ? "text-primary" : "text-[#868686]"} focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary`}
    >
      <svg width="24" height="24" viewBox="0 0 28 28" fill={saved ? "currentColor" : "none"} aria-hidden="true">
        <path
          d="M5.83301 5.83333C5.83301 5.21449 6.07884 4.621 6.51643 4.18342C6.95401 3.74583 7.5475 3.5 8.16634 3.5H19.833C20.4518 3.5 21.0453 3.74583 21.4829 4.18342C21.9205 4.621 22.1663 5.21449 22.1663 5.83333V24.5L13.9997 20.4167L5.83301 24.5V5.83333Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
