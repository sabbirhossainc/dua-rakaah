"use client";
// The prayer band: the four sections that depend on the reader's time and place (design D2, D9). One clock drives them
// all, and everything is computed here: nothing about the place leaves the browser.
import { useMemo, useRef, useState } from "react";
import CountdownCard from "@/app/components/home/CountdownCard";
import LocationCard from "@/app/components/home/LocationCard";
import TimesCard from "@/app/components/home/TimesCard";
import TodayCard from "@/app/components/home/TodayCard";
import { deviceZone, useNow, useSavedHome } from "@/app/components/home/hooks";
import { usePosition } from "@/app/components/home/usePosition";
import Ornament from "@/app/components/ui/Ornament";
import { bandPeriod } from "@/lib/prayer/band";
import { dateInZone } from "@/lib/prayer/dates";
import { readHome, resolvePlace, writeHome } from "@/lib/prayer/place";
import { nearestName, needsName } from "@/lib/prayer/places";
import { positionResult } from "@/lib/prayer/position";
import { timesAround } from "@/lib/prayer/times";
import { waqtAt } from "@/lib/prayer/waqt";

export default function HomeLive({ lang }) {
  const now = useNow();
  const saved = useSavedHome();
  // Used only when the browser refuses to save: the choice then lasts as long as the page.
  const [unsaved, setUnsaved] = useState(null);
  const unsavedRef = useRef(null);
  const home = unsaved ?? saved;

  // The latest choices, also for an answer that arrives long after the render that asked.
  const latest = () => unsavedRef.current ?? readHome();

  function change(patch) {
    const next = { ...latest(), ...patch };
    unsavedRef.current = writeHome(next) ? null : next;
    setUnsaved(unsavedRef.current);
  }

  // Names a new or unnamed position from the places table. The table is not saved for offline use: offline, or when
  // the fetch fails, the last name found stays (design 9).
  function nameIfNeeded(place) {
    if (!needsName(place)) return;
    fetch("/places.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
      .then((table) => {
        const found = nearestName(table, place.lat, place.lng);
        const now = latest().place;
        // Only if the position has not changed meanwhile.
        if (found && now?.lat === place.lat && now?.lng === place.lng) {
          change({ place: { ...now, name: { ...found, lat: place.lat, lng: place.lng } } });
        }
      })
      .catch(() => {});
  }

  const status = usePosition((outcome) => {
    const before = latest().place;
    const result = positionResult(outcome, before);
    if (result.place !== before) change({ place: result.place });
    if (outcome.type === "given") nameIfNeeded(latest().place);
    return result.status;
  });

  const place = resolvePlace(home.place, now === null ? undefined : deviceZone());
  const date = now === null ? null : dateInZone(now, place.timeZone);
  const { lat, lng } = place;
  const { year, month, day } = date ?? {};
  // The day's times: computed again when the place or its date changes, not every second.
  const times = useMemo(
    () => (year ? timesAround({ lat, lng }, { year, month, day }) : undefined),
    [lat, lng, year, month, day],
  );
  const waqt = times && now !== null ? waqtAt(times, now) : null;

  return (
    // The colors follow `data-waqt` (globals.css). "neutral" until the time and place are known.
    <div id="prayer-times" data-home-band data-waqt={bandPeriod(waqt)} className="relative px-side py-heading md:rounded-band md:p-card">
      <Ornament kind="lattice" />
      {/* The order on screen is the order in the document below 1024px. From there place, today and countdown share a
          row of equal height, and the times take a row of their own below (design D3). */}
      <div className="relative grid grid-cols-1 items-start gap-x-cards gap-y-8 lg:grid-cols-3 lg:items-stretch">
        <LocationCard lang={lang} now={now} place={place} status={status} />
        <TodayCard lang={lang} date={date} />
        <TimesCard lang={lang} times={times && times.today} waqt={waqt} now={now} timeZone={place.timeZone} />
        <CountdownCard lang={lang} times={times} waqt={waqt} placeKey={`${lat},${lng},${place.timeZone}`} />
      </div>
    </div>
  );
}
