// The home page for one language: eight cards in a fixed order (design D11, D12). It is built once, when the app is
// built; everything about the reader's time and place is filled in by the browser.
import Link from "next/link";
import CategoryGrid from "@/app/components/content/CategoryGrid";
import DailyDuas from "@/app/components/home/DailyDuas";
import DailyHadith from "@/app/components/home/DailyHadith";
import HomeCard from "@/app/components/home/HomeCard";
import HomeLive from "@/app/components/home/HomeLive";
import homePicks from "@/data/home-picks.json";
import { langPrefix } from "@/lib/content";
import { getCategories, getDua } from "@/lib/db";
import { buildHomePicks } from "@/lib/home/picks";
import { t } from "@/lib/i18n";

export default function HomePage({ lang }) {
  const { duas, quotes } = buildHomePicks({ picks: homePicks, getDua, categories: getCategories() }, lang);
  return (
    // One column, and two from 1280px. The order in the document is the order on screen at every width.
    <div lang={lang} data-home className="grid w-full min-w-0 grid-cols-1 content-start gap-5 px-3 pb-8 min-[1280px]:grid-cols-2 xl:px-0">
      <h1 className="sr-only">{t(lang, "homeTitle")}</h1>
      <HomeLive lang={lang} />
      <HomeCard title={t(lang, "homeDuasTitle")} data-home-card="duas" className="min-[1280px]:col-span-2">
        <DailyDuas duas={duas} />
        <p className="mt-3 text-sm">
          <Link href={`${langPrefix(lang)}/duas`} className="home-accent underline">
            {t(lang, "homeAllDuas")}
          </Link>
        </p>
      </HomeCard>
      <HomeCard title={t(lang, "categories")} data-home-card="categories" className="min-[1280px]:col-span-2">
        <CategoryGrid lang={lang} />
      </HomeCard>
      <HomeCard title={t(lang, "homeHadithTitle")} data-home-card="hadith">
        <DailyHadith lang={lang} quotes={quotes} />
      </HomeCard>
      <HomeCard title={t(lang, "homeDonationTitle")} data-home-card="donation" className="flex flex-col items-start">
        <p>{t(lang, "homeDonationBody")}</p>
        {/* No payment is taken here: the button only leads to the support page. */}
        <Link href="/support" className="home-button mt-4 inline-block rounded-md px-5 py-2">
          {t(lang, "homeDonationButton")}
        </Link>
      </HomeCard>
    </div>
  );
}
