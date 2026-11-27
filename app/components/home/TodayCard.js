"use client";
// The weekday, the Hijri date and the Gregorian date, with the one-day Hijri adjustment (design D7).
import BandSection from "@/app/components/home/BandSection";
import SegmentedControl from "@/app/components/ui/SegmentedControl";
import { t } from "@/lib/i18n";
import { formatGregorian, formatHijri, formatNumber, formatWeekday } from "@/lib/prayer/dates";
import { HIJRI_OFFSETS } from "@/lib/prayer/place";

const OFFSET_LABELS = { "-1": "hijriBack", 0: "hijriNone", 1: "hijriForward" };
const offsetText = (n, lang) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${formatNumber(Math.abs(n), lang)}`;

export default function TodayCard({ lang, date, offset, onOffset }) {
  return (
    <BandSection title={t(lang, "homeTodayTitle")} data-home-card="today" className="xl:order-2">
      {date === null ? (
        <p className="text-reading">{t(lang, "homeLoading")}</p>
      ) : (
        <>
          <p className="text-reading">{formatWeekday(date, lang)}</p>
          <p className="font-heading text-section" data-hijri>
            {formatHijri(date, offset, lang)}
          </p>
          <p className="text-ui">{formatGregorian(date, lang)}</p>
        </>
      )}
      <div className="band-panel mt-2">
        <SegmentedControl
          legend={t(lang, "hijriAdjust")}
          name="hijri-offset"
          disabled={date === null}
          value={offset}
          onChange={onOffset}
          options={HIJRI_OFFSETS.map((n) => ({ value: n, label: offsetText(n, lang), name: t(lang, OFFSET_LABELS[n]) }))}
        />
      </div>
    </BandSection>
  );
}
