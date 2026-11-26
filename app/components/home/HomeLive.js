"use client";
// The four cards that depend on the reader's time and place (design D2). One clock drives them all, and everything is
// computed here: nothing about the place leaves the browser.
import { useMemo, useState } from "react";
import CountdownCard from "@/app/components/home/CountdownCard";
import LocationCard from "@/app/components/home/LocationCard";
import TimesCard from "@/app/components/home/TimesCard";
import TodayCard from "@/app/components/home/TodayCard";
import { deviceZone, useNow, useSavedHome } from "@/app/components/home/hooks";
import { dateInZone } from "@/lib/prayer/dates";
import { readHome, resolvePlace, writeHome } from "@/lib/prayer/place";
import { timesAround } from "@/lib/prayer/times";
import { waqtAt } from "@/lib/prayer/waqt";

export default function HomeLive({ lang }) {
  const now = useNow();
  const saved = useSavedHome();
  // Used only when the browser refuses to save: the choice then lasts as long as the page.
  const [unsaved, setUnsaved] = useState(null);
  const home = unsaved ?? saved;

  function change(patch) {
    const next = { ...(unsaved ?? readHome()), ...patch };
    const ok = writeHome(next);
    setUnsaved(ok ? null : next);
    return ok;
  }

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
    <>
      <LocationCard lang={lang} now={now} place={place} onPlace={(value) => change({ place: value })} />
      <TodayCard lang={lang} date={date} offset={home.hijriOffset} onOffset={(hijriOffset) => change({ hijriOffset })} />
      <TimesCard lang={lang} times={times && times.today} waqt={waqt} timeZone={place.timeZone} />
      <CountdownCard lang={lang} times={times} waqt={waqt} />
    </>
  );
}
