"use client";
// The six times of the day, with the current waqt marked by a bar, bold text and a word, not by color alone.
import HomeCard from "@/app/components/home/HomeCard";
import { prayerName } from "@/app/components/home/prayer-names";
import { t } from "@/lib/i18n";
import { formatTime } from "@/lib/prayer/dates";
import { PRAYER_KEYS } from "@/lib/prayer/waqt";

/** `times` is undefined before the scripts run, and null when they cannot be computed. */
export default function TimesCard({ lang, times, waqt, timeZone }) {
  return (
    <HomeCard title={t(lang, "homeTimesTitle")} data-home-card="times">
      {times === null ? (
        <p>{t(lang, "prayerUnavailable")}</p>
      ) : (
        <ul>
          {PRAYER_KEYS.map((key) => {
            const current = waqt?.current === key;
            return (
              <li
                key={key}
                data-prayer={key}
                aria-current={current ? "true" : undefined}
                className={`flex items-center justify-between gap-3 border-l-4 border-solid px-3 py-2 ${
                  current ? "border-primary rounded-r-md bg-dua-bg font-bold" : "border-transparent"
                }`}
              >
                <span className={key === "sunrise" ? "home-subtle italic" : ""}>
                  {prayerName(key, lang)}
                  {current && (
                    <span className="home-button ml-2 rounded px-2 py-0.5 text-xs font-medium">{t(lang, "prayerNow")}</span>
                  )}
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
      {waqt && waqt.current === null && <p className="mt-3 text-sm font-medium">{t(lang, "prayerNone")}</p>}
      <p className="home-subtle mt-3 text-sm">{t(lang, "prayerGuide")}</p>
    </HomeCard>
  );
}
