import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("bn", "termsTitle"),
  description: t("bn", "termsDescription"),
};

export default function TermsBn() {
  return <InfoPage page="terms" lang="bn" />;
}
