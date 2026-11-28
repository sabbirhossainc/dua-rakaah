"use client";
// The weekday, the Hijri date by Umm al-Qura and the Gregorian date (design D2: no adjustment).
import BandSection from "@/app/components/home/BandSection";
import { t } from "@/lib/i18n";
import { formatGregorian, formatHijri, formatWeekday } from "@/lib/prayer/dates";

export default function TodayCard({ lang, date }) {
  return (
    <BandSection title={t(lang, "homeTodayTitle")} data-home-card="today" className="lg:order-2">
      {date === null ? (
        <p className="text-reading">{t(lang, "homeLoading")}</p>
      ) : (
        <>
          <p className="text-reading">{formatWeekday(date, lang)}</p>
          <p className="font-heading text-section" data-hijri>
            {formatHijri(date, lang)}
          </p>
          <p className="text-ui">{formatGregorian(date, lang)}</p>
        </>
      )}
    </BandSection>
  );
}
