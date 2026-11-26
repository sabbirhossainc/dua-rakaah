import AccountPage from "@/app/components/content/AccountPage";
import { t } from "@/lib/i18n";

// About the reader's own data: not for search engines.
export const metadata = {
  title: t("en", "accountTitle"),
  robots: { index: false, follow: false },
};

export default function Account() {
  return <AccountPage lang="en" />;
}
