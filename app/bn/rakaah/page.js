import RakaahPage from "@/app/components/content/RakaahPage";
import { t } from "@/lib/i18n";

export const metadata = { title: t("bn", "rakaahTitle") };

export default function RakaahBn() {
  return <RakaahPage lang="bn" />;
}
