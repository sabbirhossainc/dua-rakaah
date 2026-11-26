import AccountPage from "@/app/components/content/AccountPage";
import { t } from "@/lib/i18n";

// About the reader's own data: not for search engines.
export const metadata = {
  title: t("bn", "accountTitle"),
  robots: { index: false, follow: false },
};

export default function AccountBn() {
  return <AccountPage lang="bn" />;
}
