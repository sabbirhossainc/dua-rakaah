// The duas landing page for one language: its intro and the category grid.
import { CategoriesButton } from "@/app/components/content/CategoryDrawer";
import CategoryGrid from "@/app/components/content/CategoryGrid";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { getCategories } from "@/lib/db";
import { fmt, t } from "@/lib/i18n";

export default function DuasPage({ lang }) {
  return (
    <>
      <PageIntro
        title={t(lang, "duas")}
        lead={fmt(lang, "duasLead", { count: getCategories().length })}
        action={<CategoriesButton lang={lang} />}
      />
      <Section>
        <CategoryGrid lang={lang} />
      </Section>
    </>
  );
}
