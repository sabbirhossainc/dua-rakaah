"use client";
// A ring that empties as the current period passes, with the time left until it ends (design D9).
import HomeCard from "@/app/components/home/HomeCard";
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
    <HomeCard title={t(lang, "homeCountdownTitle")} data-home-card="countdown" className="flex flex-col">
      {times === null ? (
        <p>{t(lang, "prayerUnavailable")}</p>
      ) : (
        <div className="flex grow flex-col items-center justify-center">
          <div className="relative aspect-square w-full max-w-64">
            <svg viewBox="0 0 120 120" aria-hidden="true" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="8" className="stroke-line" />
              {waqt && (
                <circle
                  data-ring
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  strokeWidth="8"
                  strokeDasharray={`${LENGTH * (1 - waqt.progress)} ${LENGTH}`}
                  className="stroke-primary transition-[stroke-dasharray] duration-1000 ease-linear motion-reduce:transition-none"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              {waqt ? (
                <>
                  {waqt.current && <p className="text-xl font-semibold">{prayerName(waqt.current, lang)}</p>}
                  <p className="text-3xl tabular-nums" data-time-left>
                    {formatDuration(waqt.remainingMs, lang)}
                  </p>
                  <p className="home-subtle text-sm">
                    {fmt(lang, "countdownUntil", { name: prayerName(waqt.next, lang) })}
                  </p>
                </>
              ) : (
                <p className="home-subtle">{t(lang, "homeLoading")}</p>
              )}
            </div>
          </div>
          <p className="sr-only" aria-live="off" data-countdown-sentence>
            {waqt && sentence(waqt, lang)}
          </p>
        </div>
      )}
    </HomeCard>
  );
}
