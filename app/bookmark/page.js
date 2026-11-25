import BookmarkPage from "@/app/components/content/BookmarkPage";
import { t } from "@/lib/i18n";

// Per-reader data: not for search engines.
export const metadata = {
  title: t("en", "bookmarksTitle"),
  robots: { index: false, follow: false },
};

export default function Bookmark() {
  return <BookmarkPage lang="en" />;
}
