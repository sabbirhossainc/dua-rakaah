"use client";
// The six times of the day, each in a border of the same width (design D4). The current waqt has a fill, a stronger
// border, bold text and a "Now" badge on its top-right corner, and a time that has passed a check mark and a word, so
// that neither rests on color alone.
import BandSection from "@/app/components/home/BandSection";
import { prayerName } from "@/app/components/home/prayer-names";
import Tag from "@/app/components/ui/Tag";
import { Icon } from "@/app/components/ui/icons";
import { t } from "@/lib/i18n";
import { formatTime } from "@/lib/prayer/dates";
import { PRAYER_KEYS, timeState } from "@/lib/prayer/waqt";

const STATES = {
  current: "border-primary bg-tint font-bold text-ink",
  passed: "border-current/50 text-muted",
  upcoming: "border-current/50",
};

/** `times` is undefined before the scripts run, and null when they cannot be computed. */
export default function TimesCard({ lang, times, waqt, now, timeZone }) {
  return (
    <BandSection title={t(lang, "homeTimesTitle")} data-home-card="times" className="lg:order-4 lg:col-span-3">
      {times === null ? (
        <p className="text-reading">{t(lang, "prayerUnavailable")}</p>
      ) : (
        // Two columns on phones, a list from 640px, and one row of six from 1024px.
        <ul className="band-panel grid w-full max-w-sm grid-cols-2 gap-x-1 gap-y-4 pt-3 min-[640px]:grid-cols-1 lg:max-w-none lg:grid-cols-6 lg:gap-tiles">
          {PRAYER_KEYS.map((key) => {
            const state = times && waqt ? timeState(key, times[key], now, waqt.current) : "upcoming";
            return (
              <li
                key={key}
                data-prayer={key}
                data-state={state}
                aria-current={state === "current" ? "true" : undefined}
                className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-tile border-2 px-1 pt-4 pb-2 text-ui min-[640px]:flex-row min-[640px]:justify-between min-[640px]:gap-3 min-[640px]:px-3 min-[640px]:py-2 lg:flex-col lg:justify-start lg:gap-1 lg:pt-5 lg:pb-3 ${STATES[state]}`}
              >
                <span
                  className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 lg:flex-col ${key === "sunrise" ? "italic" : ""}`}
                >
                  <span className="flex items-center gap-1">
                    {state === "passed" && <Icon name="check" size={16} />}
                    {prayerName(key, lang)}
                  </span>
                  {state === "passed" && <span className="sr-only">{t(lang, "prayerPassed")}</span>}
                </span>
                {/* On the border, so it takes no room from the name or the time. */}
                {state === "current" && (
                  <Tag variant="gold" className="absolute -top-3 end-2 px-2! py-0! shadow-sm" data-now>
                    {t(lang, "prayerNow")}
                  </Tag>
                )}
                <span className="numeric">
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
