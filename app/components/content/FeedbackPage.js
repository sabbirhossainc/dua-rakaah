// The General Feedback page in one language (design D11 of apply-audit-pages-and-feedback).
import FeedbackForm from "@/app/components/FeedbackForm";
import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { t } from "@/lib/i18n";

export default function FeedbackPage({ lang }) {
  return (
    <div lang={lang} data-feedback-page>
      <PageIntro title={t(lang, "feedbackTitle")} lead={t(lang, "feedbackLead")} centered />
      <Section>
        <Card className="mx-auto max-w-[640px]">
          <FeedbackForm lang={lang} />
        </Card>
      </Section>
    </div>
  );
}
