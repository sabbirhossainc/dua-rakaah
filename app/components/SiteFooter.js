"use client";
// The footer of every page (design D8 of apply-audit-pages-and-feedback): the app and its mission with one Arabic line,
// the Explore and Information links in the page's language, and a bottom bar. Support is paused: no link to it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import Ornament from "@/app/components/ui/Ornament";
import Section from "@/app/components/ui/Section";
import Wordmark, { Mark } from "@/app/components/ui/Wordmark";
import { langFromPathname, langPrefix } from "@/lib/content";
import { fmt, t } from "@/lib/i18n";
import { formatNumber } from "@/lib/prayer/dates";

// Ta-Ha 20:114. Part of the content the Hafez reviews.
const ARABIC_LINE = "رَبِّ زِدْنِي عِلْمًا";

/** The year the page was built: the served pages are the same for everyone. */
const YEAR = new Date().getFullYear();

function FooterLinks({ title, links }) {
  return (
    <nav aria-label={title} className="flex flex-col items-center gap-1 lg:items-start">
      <h2 className="font-heading text-card-title text-gold">{title}</h2>
      <ul className="flex flex-col items-center lg:items-start">
        {links.map(({ href, label }) => (
          <li key={href}>
            {/* 44px high, so each link is a whole touch target. */}
            <Link href={href} className="inline-flex min-h-11 items-center text-ui underline-offset-4 hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function SiteFooter() {
  const lang = langFromPathname(usePathname());
  const prefix = langPrefix(lang);
  const explore = [
    { href: prefix || "/", label: t(lang, "navHome") },
    { href: `${prefix}/duas`, label: t(lang, "footerAllDuas") },
    { href: `${prefix || "/"}#categories`, label: t(lang, "categories") },
    { href: `${prefix || "/"}#prayer-times`, label: t(lang, "footerPrayerTimes") },
    { href: `${prefix}/bookmark`, label: t(lang, "navSaved") },
  ];
  const info = [
    { href: `${prefix}/about`, label: t(lang, "aboutTitle") },
    { href: `${prefix}/privacy-policy`, label: t(lang, "privacyTitle") },
    { href: `${prefix}/general-feedbacks`, label: t(lang, "feedbackTitle") },
    { href: `${prefix}/account`, label: t(lang, "accountLink") },
  ];
  return (
    // Below 1024px the band reaches under the bottom bar, and its content ends above it.
    <footer lang={lang} className="on-emerald pb-(--bottom-bar)">
      <Section as="div" band="emerald" containerClassName="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-start lg:justify-between lg:text-start">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <span className="flex items-center gap-2">
              <Mark size={36} />
              <Wordmark />
            </span>
            <p className="max-w-reading text-ui">{t(lang, "footerMission")}</p>
            {/* A span, not a paragraph: paragraphs in Arabic are the dua texts. */}
            <span lang="ar" dir="rtl" className="block text-[28px] leading-loose text-gold">
              {ARABIC_LINE}
            </span>
            <p className="max-w-reading text-label">{t(lang, "footerArabicMeaning")}</p>
            <p className="max-w-reading text-label" data-support-paused>
              {t(lang, "supportPaused")}
            </p>
          </div>
          <FooterLinks title={t(lang, "footerExplore")} links={explore} />
          <FooterLinks title={t(lang, "footerInfo")} links={info} />
        </div>
        <Ornament kind="rule" />
        <div className="flex flex-col items-center gap-2 text-center text-label lg:flex-row lg:justify-between lg:text-start">
          <p>{fmt(lang, "footerCopyright", { year: formatNumber(YEAR, lang).replace(/[,،]/g, "") })}</p>
          <p>{t(lang, "supportPaused")}</p>
        </div>
      </Section>
    </footer>
  );
}
