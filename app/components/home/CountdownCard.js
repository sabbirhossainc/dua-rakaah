"use client";
// The time left until the current period ends, over a ring that empties as it passes (design D9).
import BandSection from "@/app/components/home/BandSection";
import { prayerName } from "@/app/components/home/prayer-names";
import { fmt, t } from "@/lib/i18n";
import { durationParts, formatDuration, formatNumber } from "@/lib/prayer/dates";

const RADIUS = 52;
const LENGTH = 2 * Math.PI * RADIUS;

const counted = (lang, n, one, many) => fmt(lang, n === 1 ? one : many, { n: formatNumber(n, lang) });

/** What a screen reader hears, for example "Asr, 1 hour 12 minutes left". It changes once a minute. */
function sentence(waqt, lang) {
  const { hours, minutes } = durationParts(waqt.remainingMs);
  const time = [
    hours > 0 && counted(lang, hours, "hourOne", "hourMany"),
    (minutes > 0 || hours === 0) && counted(lang, minutes, "minuteOne", "minuteMany"),
  ]
    .filter(Boolean)
    .join(" ");
  return waqt.current
    ? fmt(lang, "countdownSentence", { name: prayerName(waqt.current, lang), time })
    : fmt(lang, "countdownSentenceUntil", { name: prayerName(waqt.next, lang), time });
}

/** `times` is undefined before the scripts run, and null when they cannot be computed: then there is no countdown. */
export default function CountdownCard({ lang, times, waqt }) {
  return (
    <BandSection title={t(lang, "homeCountdownTitle")} data-home-card="countdown" className="xl:order-3">
      {times === null ? (
        <p className="text-reading">{t(lang, "prayerUnavailable")}</p>
      ) : (
        <>
          {/* The ring and the track take the band's ink, so they stand out in every period. */}
          <div className="relative size-32">
            <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="8" />
              {waqt && (
                <circle
                  data-ring
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${LENGTH * (1 - waqt.progress)} ${LENGTH}`}
                  className="transition-[stroke-dasharray] duration-1000 ease-linear motion-reduce:transition-none"
                />
              )}
            </svg>
            <p className="absolute inset-0 flex items-center justify-center px-4 font-heading text-card-title">
              {waqt?.current && prayerName(waqt.current, lang)}
            </p>
          </div>
          {waqt ? (
            <>
              <p className="font-heading text-countdown" data-time-left>
                {formatDuration(waqt.remainingMs, lang)}
              </p>
              <p className="text-ui">{fmt(lang, "countdownUntil", { name: prayerName(waqt.next, lang) })}</p>
            </>
          ) : (
            <p className="text-ui">{t(lang, "homeLoading")}</p>
          )}
          <p className="sr-only" aria-live="off" data-countdown-sentence>
            {waqt && sentence(waqt, lang)}
          </p>
        </>
      )}
    </BandSection>
  );
}
