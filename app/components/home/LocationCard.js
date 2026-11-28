"use client";
// The place the times are for, the clock, and what there is to report about the position (design 1, 2).
import BandSection from "@/app/components/home/BandSection";
import { fmt, t } from "@/lib/i18n";
import { formatClock } from "@/lib/prayer/dates";
import { nameIn } from "@/lib/prayer/places";

const cityName = (city, lang) => (lang === "bn" ? city.name_bn : city.name_en);

const placeholder = (lang, text) => (
  <>
    <span aria-hidden="true">{text}</span>
    <span className="sr-only">{t(lang, "homeLoading")}</span>
  </>
);

/** Before the scripts run `now` is null, and neither the place nor the time is known. */
export default function LocationCard({ lang, now, place, status }) {
  const name = place.city
    ? cityName(place.city, lang)
    : place.name
      ? nameIn(place.name, lang)
      : t(lang, "locationMine");
  // "Finding" is said only while there is no position to show; the other labels name the capital that is shown.
  const report = status === "locationFinding" && place.kind === "device" ? null : status;
  return (
    <BandSection title={t(lang, "homePlaceTitle")} data-home-card="place" className="lg:order-1">
      <p className="font-heading text-section" data-place-name>
        {now === null ? placeholder(lang, "…") : name}
      </p>
      <p className="text-title numeric">
        {now === null ? (
          placeholder(lang, "--:--:--")
        ) : (
          <time dateTime={new Date(now).toISOString()}>{formatClock(now, place.timeZone, lang)}</time>
        )}
      </p>
      {/* Always there, so that a screen reader announces what appears in it. */}
      <p role="status" className="max-w-reading text-label">
        {now !== null && report && fmt(lang, report, { name })}
      </p>
    </BandSection>
  );
}
