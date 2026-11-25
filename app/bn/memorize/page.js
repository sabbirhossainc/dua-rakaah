import MemorizePage from "@/app/components/content/MemorizePage";
import { t } from "@/lib/i18n";

// Per-reader data: not for search engines.
export const metadata = {
  title: t("bn", "memorizeTitle"),
  robots: { index: false, follow: false },
};

export default function MemorizeBn() {
  return <MemorizePage lang="bn" />;
}
