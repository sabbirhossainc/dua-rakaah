import MemorizeList from "@/app/components/MemorizeList";
import PageIntro from "@/app/components/ui/PageIntro";
import Section from "@/app/components/ui/Section";
import { buildContentIndex } from "@/lib/content-index";
import { getAllDuas, getCategories } from "@/lib/db";
import { t } from "@/lib/i18n";

// The memorize page for one language. It is built once, when the app is built, and carries a small index of every
// dua's title and category (design D7). The reader's records are read in the browser from the local store.
export default function MemorizePage({ lang }) {
  const index = buildContentIndex({ categories: getCategories(), duaRows: getAllDuas() }, lang);
  return (
    <div lang={lang}>
      <PageIntro title={t(lang, "memorizeTitle")} lead={t(lang, "memorizeLead")} />
      <Section>
        <div className="max-w-[760px]">
          <MemorizeList lang={lang} index={index} />
        </div>
      </Section>
    </div>
  );
}
