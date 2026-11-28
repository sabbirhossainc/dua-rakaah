import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("bn", "privacyTitle"),
  description: t("bn", "privacyDescription"),
};

export default function PrivacyBn() {
  return <InfoPage page="privacy" lang="bn" />;
}
