import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("en", "termsTitle"),
  description: t("en", "termsDescription"),
};

export default function Terms() {
  return <InfoPage page="terms" lang="en" />;
}
