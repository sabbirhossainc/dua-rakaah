"use client";
// What the home page knows only in the browser: the time, the saved choices and the device's zone. On the server and
// while hydrating, each is "not known yet", so the served page is the same for everyone.
import { useMemo, useSyncExternalStore } from "react";
import { duaList, hadithSlot } from "@/lib/home/picks";
import { dateInZone } from "@/lib/prayer/dates";
import { parseHome, readHomeText, resolvePlace, subscribeHome } from "@/lib/prayer/place";
import { timesAround } from "@/lib/prayer/times";
import { waqtAt } from "@/lib/prayer/waqt";

export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Calls `notify` every second, and at once when a hidden tab is shown again. */
function subscribeClock(notify) {
  const timer = setInterval(notify, 1000);
  const onVisible = () => {
    if (document.visibilityState === "visible") notify();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

const wholeSecond = () => Math.floor(Date.now() / 1000) * 1000;
const unknown = () => null;

/** The current time to the second, as milliseconds; null before the page's scripts run. */
export function useNow() {
  return useSyncExternalStore(subscribeClock, wholeSecond, unknown);
}

/** The saved place (the default until read). */
export function useSavedHome() {
  const text = useSyncExternalStore(subscribeHome, readHomeText, unknown);
  return useMemo(() => parseHome(text), [text]);
}

function subscribeDate(notify) {
  const stopClock = subscribeClock(notify);
  const stopHome = subscribeHome(notify);
  return () => {
    stopClock();
    stopHome();
  };
}

function today() {
  const place = resolvePlace(parseHome(readHomeText()).place, deviceZone());
  return { place, date: dateInZone(Date.now(), place.timeZone) };
}

const keyOf = ({ year, month, day }) => `${year}-${month}-${day}`;
const dateOf = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
};

const dateKey = () => keyOf(today().date);

/** Today's calendar date in the reader's place, or null before the scripts run. Renders again only when it changes. */
export function useTodayInPlace() {
  const key = useSyncExternalStore(subscribeDate, dateKey, unknown);
  return useMemo(() => (key ? dateOf(key) : null), [key]);
}

// The day's times, kept until the place or its date changes, so that nothing is recalculated every second.
let computed = { key: null, times: null };

function periodKey() {
  const { place, date } = today();
  const key = `${place.lat},${place.lng},${keyOf(date)}`;
  if (computed.key !== key) computed = { key, times: timesAround(place, date) };
  const waqt = computed.times && waqtAt(computed.times, Date.now());
  return `${keyOf(date)}|${duaList(waqt)}`;
}

function hadithKey() {
  const { place, date } = today();
  const key = `${place.lat},${place.lng},${keyOf(date)}`;
  if (computed.key !== key) computed = { key, times: timesAround(place, date) };
  const now = Date.now();
  const waqt = computed.times && waqtAt(computed.times, now);
  const slot = hadithSlot(date, waqt, now, computed.times?.today.fajr);
  return `${keyOf(slot.date)}|${slot.period}`;
}

/**
 * The date and period whose hadith is shown (design D5), or null before the scripts run. Renders again only when
 * either changes.
 */
export function useHadithSlot() {
  const key = useSyncExternalStore(subscribeDate, hadithKey, unknown);
  return useMemo(() => {
    if (!key) return null;
    const [date, period] = key.split("|");
    return { date: dateOf(date), period };
  }, [key]);
}

/**
 * Today's date in the reader's place and the list of duas for this time of day. Before the scripts run the date is null
 * and the list is the daytime one. Renders again only when either changes.
 */
export function useDayPeriod() {
  const key = useSyncExternalStore(subscribeDate, periodKey, unknown);
  return useMemo(() => {
    if (!key) return { date: null, list: duaList(null) };
    const [date, list] = key.split("|");
    return { date: dateOf(date), list };
  }, [key]);
}
