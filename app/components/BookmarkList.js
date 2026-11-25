"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useBookmarks } from "@/lib/local/bookmark-store";
import { resolveBookmarks } from "@/lib/content-index";
import { langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

// The reader's bookmarks, from the local store, joined with the title index the page carries (design D7).
// Nothing here needs the network, so it works offline.
export default function BookmarkList({ lang, index }) {
  const { ready, list } = useBookmarks();
  const items = useMemo(() => resolveBookmarks(list, index), [list, index]);

  // Until the local store has been read, show nothing rather than a wrong "no bookmarks" message.
  if (!ready) return <div className="min-h-40" aria-busy="true" />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6">
        <p>{t(lang, "bookmarksEmpty")}</p>
        <Link href={`${langPrefix(lang)}/duas`} className="text-primary underline">
          {t(lang, "bookmarksEmptyLink")}
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 pb-8">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="block rounded-lg bg-white p-5 hover:bg-icon-bg"
          >
            <span className="block font-medium text-primary">{item.title}</span>
            <span className="mt-1 block text-sm text-gray-400">{item.category}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
