import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { t } from "@/lib/i18n";

export const metadata = { title: t("en", "supportPausedTitle") };

// Support is paused (design D7 of apply-audit-pages-and-feedback). The address stays for old links; nothing links here.
export default function Support() {
  return (
    <>
      <PageIntro title={t("en", "supportPausedTitle")} />
      <Section>
        <Card variant="emerald" className="max-w-[760px]" action={<Button variant="gold" href="/">{t("en", "backHome")}</Button>}>
          <p className="text-reading" data-support-paused>
            {t("en", "supportPaused")}
          </p>
        </Card>
      </Section>
    </>
  );
}
