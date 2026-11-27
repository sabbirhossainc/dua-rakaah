import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { t } from "@/lib/i18n";

// A placeholder until the page's content is decided (plan question 13). It has no button: there is nowhere for one to
// go yet.
export default function Support() {
  return (
    <>
      <PageIntro title={t("en", "supportUs")} />
      <Section>
        <Card variant="emerald" className="max-w-[760px]">
          <p className="text-reading">Support Page</p>
        </Card>
      </Section>
    </>
  );
}
