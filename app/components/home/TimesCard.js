"use client";
// The six times of the day, with the current waqt marked by a panel, bold text and a word, not by color alone.
import BandSection from "@/app/components/home/BandSection";
import { prayerName } from "@/app/components/home/prayer-names";
import Tag from "@/app/components/ui/Tag";
import { t } from "@/lib/i18n";
import { formatTime } from "@/lib/prayer/dates";
import { PRAYER_KEYS } from "@/lib/prayer/waqt";

/** `times` is undefined before the scripts run, and null when they cannot be computed. */
export default function TimesCard({ lang, times, waqt, timeZone }) {
  return (
    <BandSection title={t(lang, "homeTimesTitle")} data-home-card="times" className="xl:order-4 xl:col-span-3">
      {times === null ? (
        <p className="text-reading">{t(lang, "prayerUnavailable")}</p>
      ) : (
        // A list down the page, and one row of six from 1280px.
        <ul className="flex w-full max-w-sm flex-col xl:grid xl:max-w-none xl:grid-cols-6 xl:gap-tiles">
          {PRAYER_KEYS.map((key) => {
            const current = waqt?.current === key;
            return (
              <li
                key={key}
                data-prayer={key}
                aria-current={current ? "true" : undefined}
                className={`flex min-h-11 min-w-0 items-center justify-between gap-3 px-3 py-1 text-ui xl:flex-col xl:justify-start xl:gap-1 xl:py-3 ${
                  current ? "band-panel font-bold" : ""
                }`}
              >
                <span className={`flex items-center gap-2 xl:flex-col xl:gap-1 ${key === "sunrise" ? "italic" : ""}`}>
                  {prayerName(key, lang)}
                  {current && <Tag variant="gold">{t(lang, "prayerNow")}</Tag>}
                </span>
                <span className="tabular-nums">
                  {times ? (
                    <time dateTime={times[key].toISOString()}>{formatTime(times[key], timeZone, lang)}</time>
                  ) : (
                    <span aria-label={t(lang, "homeLoading")} role="img">
                      --:--
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {waqt && waqt.current === null && <p className="text-ui font-semibold">{t(lang, "prayerNone")}</p>}
      <p className="max-w-reading text-label">{t(lang, "prayerGuide")}</p>
    </BandSection>
  );
}
