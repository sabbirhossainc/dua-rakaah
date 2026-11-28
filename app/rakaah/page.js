import RakaahPage from "@/app/components/content/RakaahPage";
import { t } from "@/lib/i18n";

export const metadata = { title: t("en", "rakaahTitle") };

export default function Rakaah() {
  return <RakaahPage lang="en" />;
}
