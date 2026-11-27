// The page for an address with no page, in one language.
import Button from "@/app/components/ui/Button";
import EmptyState from "@/app/components/ui/EmptyState";
import Section from "@/app/components/ui/Section";
import { langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

export default function NotFoundPage({ lang }) {
  return (
    <Section containerClassName="max-w-[760px]!">
      <EmptyState
        lang={lang}
        level={1}
        icon="warning"
        title={t(lang, "notFoundTitle")}
        text={t(lang, "notFoundText")}
        actions={
          <>
            <Button href={langPrefix(lang) || "/"}>{t(lang, "goHome")}</Button>
            <Button variant="outline" href={`${langPrefix(lang)}/duas`}>
              {t(lang, "browseDuas")}
            </Button>
          </>
        }
      />
    </Section>
  );
}
