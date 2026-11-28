import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("en", "privacyTitle"),
  description: t("en", "privacyDescription"),
};

export default function Privacy() {
  return <InfoPage page="privacy" lang="en" />;
}
