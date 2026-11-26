"use client";
// What the home page knows only in the browser: the time, the saved choices and the device's zone. On the server and
// while hydrating, each is "not known yet", so the served page is the same for everyone.
import { useMemo, useSyncExternalStore } from "react";
import { dateInZone } from "@/lib/prayer/dates";
import { parseHome, readHomeText, resolvePlace, subscribeHome } from "@/lib/prayer/place";

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

/** The saved place and Hijri adjustment (the defaults until read). */
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

function dateKey() {
  const { timeZone } = resolvePlace(parseHome(readHomeText()).place, deviceZone());
  const { year, month, day } = dateInZone(Date.now(), timeZone);
  return `${year}-${month}-${day}`;
}

/** Today's calendar date in the reader's place, or null before the scripts run. Renders again only when it changes. */
export function useTodayInPlace() {
  const key = useSyncExternalStore(subscribeDate, dateKey, unknown);
  return useMemo(() => {
    if (!key) return null;
    const [year, month, day] = key.split("-").map(Number);
    return { year, month, day };
  }, [key]);
}
