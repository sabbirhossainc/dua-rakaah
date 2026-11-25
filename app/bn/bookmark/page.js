import BookmarkPage from "@/app/components/content/BookmarkPage";
import { t } from "@/lib/i18n";

// Per-reader data: not for search engines.
export const metadata = {
  title: t("bn", "bookmarksTitle"),
  robots: { index: false, follow: false },
};

export default function BookmarkBn() {
  return <BookmarkPage lang="bn" />;
}
