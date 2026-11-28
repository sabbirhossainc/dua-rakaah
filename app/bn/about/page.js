import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("bn", "aboutTitle"),
  description: t("bn", "aboutDescription"),
};

export default function AboutBn() {
  return <InfoPage page="about" lang="bn" />;
}
