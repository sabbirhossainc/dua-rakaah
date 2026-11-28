"use client";
// The time left until the current period ends, over a ring that empties as it passes (design D9).
import { useState } from "react";
import BandSection from "@/app/components/home/BandSection";
import { prayerName } from "@/app/components/home/prayer-names";
import { fmt, t } from "@/lib/i18n";
import { durationParts, formatDuration, formatNumber } from "@/lib/prayer/dates";
import { periodStarted } from "@/lib/prayer/waqt";

const RADIUS = 52;
const LENGTH = 2 * Math.PI * RADIUS;

const counted = (lang, n, one, many) => fmt(lang, n === 1 ? one : many, { n: formatNumber(n, lang) });

/** What a screen reader hears, for example "1 hour 12 minutes left until Asr". It changes once a minute. */
function sentence(waqt, lang) {
  const { hours, minutes } = durationParts(waqt.remainingMs);
  const time = [
    hours > 0 && counted(lang, hours, "hourOne", "hourMany"),
    (minutes > 0 || hours === 0) && counted(lang, minutes, "minuteOne", "minuteMany"),
  ]
    .filter(Boolean)
    .join(" ");
  return fmt(lang, "countdownSentenceUntil", { name: prayerName(waqt.next, lang), time });
}

/** The words for a period that has just begun, or "". They stay until the next one, or until the place changes. */
function useAnnouncement(lang, waqt, placeKey) {
  const moment = waqt ? { place: placeKey, current: waqt.current } : null;
  const [seen, setSeen] = useState({ moment: null, message: "" });
  if (moment?.place === seen.moment?.place && moment?.current === seen.moment?.current) return seen.message;
  const started = periodStarted(seen.moment, moment);
  let message = "";
  if (started === null) message = t(lang, "prayerNone");
  else if (started) message = fmt(lang, "prayerStarted", { name: prayerName(started, lang) });
  setSeen({ moment, message });
  return message;
}

/** `times` is undefined before the scripts run, and null when they cannot be computed: then there is no countdown. */
export default function CountdownCard({ lang, times, waqt, placeKey }) {
  const announcement = useAnnouncement(lang, waqt, placeKey);
  return (
    <BandSection title={t(lang, "homeCountdownTitle")} data-home-card="countdown" className="lg:order-3">
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
              <p aria-hidden="true" className="text-countdown numeric whitespace-nowrap py-1 [&:lang(bn)]:font-semibold" data-time-left>
                {formatDuration(waqt.remainingMs, lang)}
              </p>
              <p aria-hidden="true" className="text-ui">
                {fmt(lang, "countdownUntil", { name: prayerName(waqt.next, lang) })}
              </p>
            </>
          ) : (
            <p className="text-ui">{t(lang, "homeLoading")}</p>
          )}
          <p className="sr-only" aria-live="off" data-countdown-sentence>
            {waqt && sentence(waqt, lang)}
          </p>
        </>
      )}
      <p className="sr-only" aria-live="polite" data-period-announcement>
        {announcement}
      </p>
    </BandSection>
  );
}
