"use client";
// The weekday, the Hijri date and the Gregorian date, with the one-day Hijri adjustment (design D7).
import HomeCard from "@/app/components/home/HomeCard";
import { t } from "@/lib/i18n";
import { formatGregorian, formatHijri, formatNumber, formatWeekday } from "@/lib/prayer/dates";
import { HIJRI_OFFSETS } from "@/lib/prayer/place";

const OFFSET_LABELS = { "-1": "hijriBack", 0: "hijriNone", 1: "hijriForward" };
const offsetText = (n, lang) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${formatNumber(Math.abs(n), lang)}`;

export default function TodayCard({ lang, date, offset, onOffset }) {
  return (
    <HomeCard title={t(lang, "homeTodayTitle")} data-home-card="today">
      {date === null ? (
        <p className="home-subtle">{t(lang, "homeLoading")}</p>
      ) : (
        <>
          <p className="text-lg">{formatWeekday(date, lang)}</p>
          <p className="mt-1 text-2xl font-semibold" data-hijri>
            {formatHijri(date, offset, lang)}
          </p>
          <p className="home-subtle mt-1">{formatGregorian(date, lang)}</p>
        </>
      )}
      <fieldset className="mt-4" disabled={date === null}>
        <legend className="home-subtle mb-2 text-sm">{t(lang, "hijriAdjust")}</legend>
        <div className="flex gap-4">
          {HIJRI_OFFSETS.map((n) => (
            <label key={n} className="flex cursor-pointer items-center gap-x-2">
              <input
                type="radio"
                name="hijri-offset"
                value={n}
                checked={offset === n}
                onChange={() => onOffset(n)}
                className="accent-primary"
              />
              <span aria-hidden="true">{offsetText(n, lang)}</span>
              <span className="sr-only">{t(lang, OFFSET_LABELS[n])}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </HomeCard>
  );
}
