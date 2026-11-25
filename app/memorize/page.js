import MemorizePage from "@/app/components/content/MemorizePage";
import { t } from "@/lib/i18n";

// Per-reader data: not for search engines.
export const metadata = {
  title: t("en", "memorizeTitle"),
  robots: { index: false, follow: false },
};

export default function Memorize() {
  return <MemorizePage lang="en" />;
}
