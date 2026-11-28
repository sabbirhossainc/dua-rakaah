import FeedbackPage from "@/app/components/content/FeedbackPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("bn", "feedbackTitle"),
  description: t("bn", "feedbackDescription"),
};

export default function FeedbackBn() {
  return <FeedbackPage lang="bn" />;
}
