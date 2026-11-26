import HomePage from "@/app/components/home/HomePage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("bn", "homeTitle"),
};

export default function HomeBn() {
  return <HomePage lang="bn" />;
}
