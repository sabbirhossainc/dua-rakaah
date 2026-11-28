import FeedbackPage from "@/app/components/content/FeedbackPage";
import { t } from "@/lib/i18n";

export const metadata = {
  title: t("en", "feedbackTitle"),
  description: t("en", "feedbackDescription"),
};

export default function Feedback() {
  return <FeedbackPage lang="en" />;
}
