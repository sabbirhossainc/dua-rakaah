import InfoPage from "@/app/components/content/InfoPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("en", "aboutTitle"),
  description: t("en", "aboutDescription"),
};

export default function About() {
  return <InfoPage page="about" lang="en" />;
}
