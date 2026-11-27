// The home page for one language: eight sections in a fixed order (design D9). It is built once, when the app is
// built; everything about the reader's time and place is filled in by the browser.
import CategoryGrid from "@/app/components/content/CategoryGrid";
import DailyDuas from "@/app/components/home/DailyDuas";
import DailyHadith from "@/app/components/home/DailyHadith";
import HomeLive from "@/app/components/home/HomeLive";
import Button from "@/app/components/ui/Button";
import Card from "@/app/components/ui/Card";
import Section from "@/app/components/ui/Section";
import SectionHeading from "@/app/components/ui/SectionHeading";
import homePicks from "@/data/home-picks.json";
import { langPrefix } from "@/lib/content";
import { getCategories, getDua } from "@/lib/db";
import { buildHomePicks } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

export default function HomePage({ lang }) {
  const { duas, quotes } = buildHomePicks({ picks: homePicks, getDua, categories: getCategories() }, lang);
  const allDuas = (className) => (
    <Button variant="outline" href={`${langPrefix(lang)}/duas`} className={className}>
      {t(lang, "homeAllDuas")}
    </Button>
  );
  return (
    // The order in the document is the order on screen.
    <div lang={lang} data-home>
      {/* The faint lattice behind the page. */}
      <span aria-hidden="true" className="page-pattern" />
      <h1 className="sr-only">{t(lang, "homeTitle")}</h1>
      {/* The band reaches the screen's edges on phones. */}
      <div className="md:container-page md:pt-heading">
        <HomeLive lang={lang} />
      </div>
      <Section data-home-card="duas">
        {/* Beside the heading from 768px, and after the cards below that: one of the two is shown. */}
        <SectionHeading title={t(lang, "homeDuasTitle")} action={allDuas("hidden! md:inline-flex!")} />
        <DailyDuas lang={lang} duas={duas} />
        <div className="mt-cards flex justify-center md:hidden">{allDuas("")}</div>
      </Section>
      <Section band="sand" data-home-card="categories">
        <SectionHeading title={t(lang, "categories")} />
        <CategoryGrid lang={lang} />
      </Section>
      {/* Side by side from 1024px, the hadith taking two thirds. */}
      <Section as="div" containerClassName="grid gap-cards lg:grid-cols-3">
        <Card as="section" variant="sand" data-home-card="hadith" className="lg:col-span-2">
          <SectionHeading title={t(lang, "homeHadithTitle")} />
          <DailyHadith lang={lang} quotes={quotes} />
        </Card>
        <Card
          as="section"
          variant="emerald"
          data-home-card="donation"
          // No payment is taken here: the button only leads to the support page.
          action={
            <Button variant="gold" href="/support">
              {t(lang, "supportUs")}
            </Button>
          }
        >
          <SectionHeading title={t(lang, "homeDonationTitle")} />
          <p className="text-reading">{t(lang, "homeDonationBody")}</p>
        </Card>
      </Section>
    </div>
  );
}
