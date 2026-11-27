"use client";
// The place the times are for, the clock, and the two ways to change the place (design D5, D6).
import { useRef, useState } from "react";
import BandSection from "@/app/components/home/BandSection";
import Button from "@/app/components/ui/Button";
import Select from "@/app/components/ui/Select";
import { t } from "@/lib/i18n";
import { formatClock } from "@/lib/prayer/dates";
import { TOWNS } from "@/lib/prayer/place";

const townName = (town, lang) => (lang === "bn" ? town.name_bn : town.name_en);

// The list is in English order. In Bangla it is sorted by code point, which every browser and the server agree on.
const OPTIONS = {
  en: TOWNS,
  bn: [...TOWNS].sort((a, b) => (a.name_bn < b.name_bn ? -1 : 1)),
};

// Prayer times need no precision, so the quickest and least precise position will do.
const POSITION = { enableHighAccuracy: false, maximumAge: 24 * 60 * 60 * 1000, timeout: 10_000 };

export default function LocationCard({ lang, now, place, onPlace }) {
  const [status, setStatus] = useState(null); // a label key
  // Only the latest choice counts: a position that arrives after the reader chose a town is dropped.
  const choice = useRef(0);

  function pickTown(id) {
    choice.current++;
    setStatus(onPlace({ kind: "town", id }) ? null : "locationNotSaved");
  }

  function useMyLocation() {
    if (!window.isSecureContext || !navigator.geolocation) {
      setStatus("locationUnavailable");
      return;
    }
    const mine = ++choice.current;
    setStatus("locationFinding");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (mine !== choice.current) return;
        setStatus(onPlace({ kind: "device", lat: coords.latitude, lng: coords.longitude }) ? null : "locationNotSaved");
      },
      (error) => {
        if (mine !== choice.current) return;
        setStatus(error.code === error.PERMISSION_DENIED ? "locationDenied" : "locationFailed");
      },
      POSITION,
    );
  }

  const name = place.town ? townName(place.town, lang) : null;
  return (
    <BandSection title={t(lang, "homePlaceTitle")} data-home-card="place" className="xl:order-1">
      <p className="font-heading text-section" data-place-name>
        {place.kind === "device" ? t(lang, "locationMine") : name}
      </p>
      <p className="text-title tabular-nums">
        {now === null ? (
          <>
            <span aria-hidden="true">--:--:--</span>
            <span className="sr-only">{t(lang, "homeLoading")}</span>
          </>
        ) : (
          <time dateTime={new Date(now).toISOString()}>{formatClock(now, place.timeZone, lang)}</time>
        )}
      </p>
      <div className="band-panel mt-2 flex w-full max-w-sm flex-col items-center gap-3">
        <Button icon="location" onClick={useMyLocation}>
          {t(lang, "locationUse")}
        </Button>
        {/* No town is selected until one is picked, so picking Dhaka itself is a change too. */}
        <Select
          label={t(lang, "townLabel")}
          value={place.kind === "town" ? place.town.id : ""}
          onChange={(e) => pickTown(e.target.value)}
          className="w-full text-left"
        >
          <option value="" disabled>
            {t(lang, "townChoose")}
          </option>
          {OPTIONS[lang].map((town) => (
            <option key={town.id} value={town.id}>
              {townName(town, lang)}
            </option>
          ))}
        </Select>
      </div>
      {/* Always there, so that a screen reader announces what appears in it. */}
      <p role="status" className="text-label">
        {status && t(lang, status)}
      </p>
    </BandSection>
  );
}
