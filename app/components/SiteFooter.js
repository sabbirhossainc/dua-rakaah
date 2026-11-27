"use client";
// The footer of every page (design D6): the app's name, one short Arabic line with its meaning, and the links to the
// support page and the reader's data.
import { usePathname } from "next/navigation";
import Button from "@/app/components/ui/Button";
import Ornament from "@/app/components/ui/Ornament";
import Section from "@/app/components/ui/Section";
import Wordmark, { Mark } from "@/app/components/ui/Wordmark";
import { langFromPathname, langPrefix } from "@/lib/content";
import { t } from "@/lib/i18n";

// Ta-Ha 20:114. Part of the content the Hafez reviews.
const ARABIC_LINE = "رَبِّ زِدْنِي عِلْمًا";

export default function SiteFooter() {
  const lang = langFromPathname(usePathname());
  return (
    // Below 1024px the band reaches under the bottom bar, and its content ends above it.
    <footer lang={lang} className="on-emerald pb-(--bottom-bar)">
      <Section as="div" band="emerald" containerClassName="flex flex-col items-center gap-4 text-center">
        <span className="flex items-center gap-2">
          <Mark size={36} />
          <Wordmark />
        </span>
        {/* A span, not a paragraph: paragraphs in Arabic are the dua texts. */}
        <span lang="ar" dir="rtl" className="block text-[28px] leading-[2] text-gold">
          {ARABIC_LINE}
        </span>
        <p className="max-w-reading text-ui">{t(lang, "footerArabicMeaning")}</p>
        <Ornament kind="rule" />
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="ghost" href="/support">
            {t(lang, "supportUs")}
          </Button>
          <Button variant="ghost" href={`${langPrefix(lang)}/account`}>
            {t(lang, "accountLink")}
          </Button>
        </div>
      </Section>
    </footer>
  );
}
