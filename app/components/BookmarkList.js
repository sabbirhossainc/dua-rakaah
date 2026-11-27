"use client";

import { useMemo } from "react";
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import ListCard from "@/app/components/ui/ListCard";
import Tag from "@/app/components/ui/Tag";
import { Icon } from "@/app/components/ui/icons";
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
      <EmptyState
        icon="saved"
        title={t(lang, "bookmarksEmpty")}
        actions={<Button href={`${langPrefix(lang)}/duas`}>{t(lang, "browseDuas")}</Button>}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-cards">
      {items.map((item) => (
        <li key={item.id}>
          <ListCard
            href={item.href}
            icon={<Icon name="duas" />}
            title={item.title}
            meta={item.category}
            trailing={
              <Tag variant="text" icon="bookmark">
                <span className="sr-only sm:not-sr-only">{t(lang, "navSaved")}</span>
              </Tag>
            }
          />
        </li>
      ))}
    </ul>
  );
}
