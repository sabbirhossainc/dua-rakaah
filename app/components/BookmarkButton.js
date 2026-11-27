"use client";

import Button from "@/app/components/ui/Button";
import { useBookmarks } from "@/lib/local/bookmark-store";
import { toggle } from "@/lib/local/client";
import { t } from "@/lib/i18n";

// The bookmark control on a dua card. It reads and writes only the local store, so it never waits for the network.
export default function BookmarkButton({ duaId, lang }) {
  const { ids } = useBookmarks();
  const saved = ids.has(duaId);
  const label = t(lang, saved ? "unbookmark" : "bookmark");
  return (
    <Button
      variant="ghost"
      icon="bookmark"
      iconFilled={saved}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      onClick={() => toggle(duaId).catch((error) => console.error("Could not save the bookmark:", error))}
      className={saved ? "bg-tint" : ""}
    />
  );
}
